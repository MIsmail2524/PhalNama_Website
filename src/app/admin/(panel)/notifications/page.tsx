import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { channelStatus } from "@/lib/notify";
import { DEFAULT_TEMPLATES, NOTIFICATION_EVENTS, type NotificationEvent } from "@/lib/notify/templates";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { resetTemplateAction, saveTemplateAction } from "../actions";

export default async function Notifications({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  await requireAdmin("settings");
  const channel = (await searchParams).channel === "whatsapp" ? "whatsapp" : "email";
  const [custom, logs] = await Promise.all([prisma.notificationTemplate.findMany({ where: { channel } }), prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 })]);
  const status = channelStatus();
  const rows: [string, boolean, string][] = [
    ["Email (Resend)", status.email, "Set RESEND_API_KEY and EMAIL_FROM"],
    ["WhatsApp Business Cloud API", status.whatsapp, "Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID"],
    ["SMS", status.sms, "Provider not integrated yet — see docs/INTEGRATIONS.md"],
  ];
  return (
    <>
      <PageHeader title="Notifications" description="Automatic messages for order events, rewards and announcements. Placeholders: {{name}} {{orderNumber}} {{total}} {{trackUrl}} {{amount}} {{message}} {{link}} {{brand}}" />
      <Card title="Channels" className="mb-6">
        <ul className="space-y-2 text-sm">
          {rows.map(([l, ok, how]) => (
            <li key={l} className="flex flex-wrap items-center gap-3"><span className={`h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-sand-300"}`} /><span className="font-semibold">{l}</span><span className="text-stone">{ok ? "Connected" : `Not connected — ${how}`}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone">When a channel is not connected, messages are recorded below as SKIPPED. Use the WhatsApp button on each order to send them by hand.</p>
      </Card>

      <div className="mb-4 flex gap-2 text-xs font-semibold">
        {["email", "whatsapp"].map((c) => <a key={c} href={`?channel=${c}`} className={`rounded px-3 py-1.5 ${channel === c ? "bg-forest text-ivory" : "bg-white text-stone"}`}>{c === "email" ? "Email templates" : "WhatsApp templates"}</a>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(Object.keys(NOTIFICATION_EVENTS) as NotificationEvent[]).map((ev) => {
          const t = custom.find((x) => x.event === ev);
          const def = DEFAULT_TEMPLATES[ev];
          return (
            <form key={ev} action={saveTemplateAction} className="admin-card space-y-2 p-5">
              <input type="hidden" name="event" value={ev} />
              <input type="hidden" name="channel" value={channel} />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{NOTIFICATION_EVENTS[ev]}</h3>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="enabled" defaultChecked={t?.enabled ?? true} className="accent-forest" /> Enabled</label>
              </div>
              {channel === "email" && <input name="subject" defaultValue={t?.subject ?? def.subject} className="admin-input text-sm" />}
              <textarea name="body" defaultValue={t?.body ?? def.body} rows={5} className="admin-input font-mono text-xs" />
              <div className="flex items-center gap-3">
                <SubmitButton className="admin-btn-secondary !py-1 text-xs">Save</SubmitButton>
                {t && <button formAction={resetTemplateAction} className="text-xs text-stone hover:text-danger">Reset to default</button>}
                {t && <span className="text-xs text-gold-700">customised</span>}
              </div>
            </form>
          );
        })}
      </div>
      {channel === "whatsapp" && <p className="mt-3 text-xs text-stone">Note: WhatsApp requires pre-approved templates for messages sent outside a 24-hour customer conversation window.</p>}

      <Card title="Recent messages" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-sand-300">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 text-stone">{formatDateTime(l.createdAt)}</td>
                  <td className="py-2 pr-3">{l.event.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-3">{l.channel}</td>
                  <td className="py-2 pr-3">{l.recipient}</td>
                  <td className="py-2 pr-3"><Badge value={l.status} /></td>
                  <td className="py-2 text-stone">{l.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <p className="text-sm text-stone">No messages yet.</p>}
        </div>
      </Card>
    </>
  );
}
