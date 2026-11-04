import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSetting, type SettingsKey } from "@/lib/settings";
import { SETTINGS_SCHEMA } from "@/admin/settings-schema";
import { PageHeader, Notice } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { activeGateway } from "@/lib/payments";

export default async function SettingsPage({ params }: { params: Promise<{ group: string }> }) {
  const group = (await params).group as SettingsKey;
  const schema = SETTINGS_SCHEMA[group];
  if (!schema) notFound();
  await requireAdmin(group === "home" ? "content" : "settings");
  const value = await getSetting(group);
  const g = activeGateway();
  return (
    <div className="max-w-4xl">
      <PageHeader title={schema.title} description={schema.description} />
      {group === "payments" && (
        <Notice tone={g ? (g.id === "test" ? "warning" : "success") : "info"}>
          {g ? (g.id === "test" ? "Online payments are in TEST mode — no real money is charged. Never use in production." : `Online gateway connected: ${g.label}.`) : "No online payment gateway is configured on the server, so online payment will not be offered even if ticked."}
        </Notice>
      )}
      <SettingsForm group={group} fields={schema.fields} initial={value as unknown as Record<string, unknown>} />
    </div>
  );
}
