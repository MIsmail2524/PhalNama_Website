import "server-only";
import { prisma } from "../db";
import { DEFAULT_TEMPLATES, renderTemplate, type Channel, type NotificationEvent } from "./templates";

/**
 * Notification hub. Each channel is an adapter that is "configured" only when
 * its credentials exist. Unconfigured channels never pretend to send: the
 * message is logged as SKIPPED so the team can follow up manually (the admin
 * order page offers a one-tap WhatsApp link with the same text).
 */

type Adapter = {
  configured: () => boolean;
  send: (to: string, subject: string, body: string) => Promise<void>;
};

const adapters: Record<Channel, Adapter> = {
  email: {
    configured: () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
    async send(to, subject, body) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text: body }),
      });
      if (!res.ok) throw new Error(`Email provider responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  },
  whatsapp: {
    configured: () => !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    async send(to, _subject, body) {
      // Note: outside the 24h customer-service window Meta requires approved
      // template messages. Free-text works for replies within the window.
      const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body } }),
      });
      if (!res.ok) throw new Error(`WhatsApp API responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  },
  sms: {
    configured: () => false, // No SMS provider integrated yet — see docs/INTEGRATIONS.md
    async send() {
      throw new Error("SMS provider not integrated");
    },
  },
};

export function channelStatus() {
  return {
    email: adapters.email.configured(),
    whatsapp: adapters.whatsapp.configured(),
    sms: adapters.sms.configured(),
  };
}

async function template(event: NotificationEvent, channel: Channel) {
  const custom = await prisma.notificationTemplate.findUnique({ where: { event_channel: { event, channel } } });
  if (custom && !custom.enabled) return null;
  return custom ?? DEFAULT_TEMPLATES[event];
}

export async function notify(opts: {
  event: NotificationEvent;
  to: { email?: string | null; phone?: string | null };
  vars: Record<string, string | number | null | undefined>;
  orderId?: string;
  channels?: Channel[];
}) {
  const brand = (opts.vars.brand as string) || "Phalnama";
  const vars = { brand, ...opts.vars };
  const wanted = opts.channels ?? ["email", "whatsapp"];

  for (const channel of wanted) {
    const recipient = channel === "email" ? opts.to.email : opts.to.phone;
    if (!recipient) continue;
    const tpl = await template(opts.event, channel);
    if (!tpl) continue;
    const subject = renderTemplate(tpl.subject ?? "", vars);
    const body = renderTemplate(tpl.body, vars);
    const adapter = adapters[channel];
    let status = "SENT";
    let error: string | undefined;
    if (!adapter.configured()) {
      status = "SKIPPED";
      error = `${channel} not configured`;
    } else {
      try {
        await adapter.send(recipient, subject, body);
      } catch (e) {
        status = "FAILED";
        error = e instanceof Error ? e.message : String(e);
      }
    }
    await prisma.notificationLog
      .create({ data: { event: opts.event, channel, recipient, subject, body, status, error, orderId: opts.orderId } })
      .catch(() => undefined);
  }
}

export async function notifyAdmins(vars: Record<string, string | number | null | undefined>, orderId?: string) {
  await notify({
    event: "admin_new_order",
    to: { email: process.env.ADMIN_NOTIFY_EMAIL, phone: process.env.ADMIN_NOTIFY_WHATSAPP },
    vars,
    orderId,
  });
}
