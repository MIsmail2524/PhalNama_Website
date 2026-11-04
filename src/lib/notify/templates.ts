/**
 * Default message templates. Admins can override any of these from
 * Dashboard → Notifications; overrides are stored in NotificationTemplate.
 * Placeholders: {{name}} {{orderNumber}} {{total}} {{trackUrl}} {{brand}} {{amount}} {{message}} {{link}}
 */
export const NOTIFICATION_EVENTS = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_dispatched: "Order dispatched",
  order_delivered: "Order delivered",
  referral_reward: "Referral reward unlocked",
  loyalty_milestone: "Loyalty milestone achieved",
  harvest_announcement: "New harvest announcement (consent only)",
  support_followup: "Customer support follow-up",
  password_reset: "Password reset",
  admin_new_order: "Admin: new order",
} as const;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;
export type Channel = "email" | "whatsapp" | "sms";

export const DEFAULT_TEMPLATES: Record<NotificationEvent, { subject: string; body: string }> = {
  order_placed: {
    subject: "We have received your order {{orderNumber}}",
    body: "Assalam-o-Alaikum {{name}},\n\nThank you for your order {{orderNumber}} ({{total}}). We will call or message you shortly to confirm it.\n\nTrack your order: {{trackUrl}}\n\n— {{brand}}",
  },
  order_confirmed: {
    subject: "Your order {{orderNumber}} is confirmed",
    body: "Dear {{name}},\n\nYour order {{orderNumber}} is confirmed and will be packed from our orchard shortly.\n\nTrack: {{trackUrl}}\n\n— {{brand}}",
  },
  order_dispatched: {
    subject: "Your fruit is on its way — {{orderNumber}}",
    body: "Dear {{name}},\n\nYour order {{orderNumber}} has left the orchard. {{message}}\n\nTrack: {{trackUrl}}\n\n— {{brand}}",
  },
  order_delivered: {
    subject: "Your order {{orderNumber}} has been delivered",
    body: "Dear {{name}},\n\nYour order {{orderNumber}} has been delivered. We hope it brings a little of the orchard to your home. If anything is not right, simply reply to this message.\n\n— {{brand}}",
  },
  referral_reward: {
    subject: "You have received {{amount}} in Phalnama credit",
    body: "Dear {{name}},\n\nSomeone you invited has enjoyed their first Phalnama harvest. {{amount}} has been added to your account for your next order.\n\n— {{brand}}",
  },
  loyalty_milestone: {
    subject: "A new page in your Harvest Passport",
    body: "Dear {{name}},\n\n{{message}}\n\nView your passport: {{link}}\n\n— {{brand}}",
  },
  harvest_announcement: {
    subject: "{{message}}",
    body: "Dear {{name}},\n\n{{message}}\n\n{{link}}\n\nTo stop these updates: {{unsubscribeUrl}}\n\n— {{brand}}",
  },
  support_followup: {
    subject: "How was your Phalnama order?",
    body: "Dear {{name}},\n\nWe hope your order {{orderNumber}} arrived well. If anything was not right, reply here and we will make it right.\n\n— {{brand}}",
  },
  password_reset: {
    subject: "Reset your Phalnama password",
    body: "Dear {{name}},\n\nUse this link to set a new password. It expires in 1 hour.\n\n{{link}}\n\nIf you did not ask for this, ignore this message.\n\n— {{brand}}",
  },
  admin_new_order: {
    subject: "New order {{orderNumber}} — {{total}}",
    body: "New order {{orderNumber}} from {{name}} for {{total}}.\n\n{{link}}",
  },
};

export function renderTemplate(text: string, vars: Record<string, string | number | undefined | null>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}
