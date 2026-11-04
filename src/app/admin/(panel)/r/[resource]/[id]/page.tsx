import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getResource } from "@/admin/resources";
import { deleteResourceAction } from "@/admin/actions";
import { sendCampaignAction } from "../../../actions";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { ConfirmButton } from "@/components/admin/SubmitButton";
import { Notice, PageHeader } from "@/components/admin/ui";
import { channelStatus } from "@/lib/notify";

export default async function ResourceEdit({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const res = getResource(resource);
  if (!res) notFound();
  await requireAdmin(res.permission);
  const isNew = id === "new";
  if (isNew && res.canCreate === false) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = isNew ? null : await (prisma as any)[res.model].findUnique({ where: { id } });
  if (!isNew && !row) notFound();

  const relationOptions: Record<string, { value: string; label: string }[]> = {};
  for (const f of res.fields.filter((x) => x.type === "relation" && x.relation)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = await (prisma as any)[f.relation!.model].findMany({ select: { id: true, [f.relation!.labelField]: true }, orderBy: { [f.relation!.labelField]: "asc" } });
    relationOptions[f.name] = items.map((i: Record<string, string>) => ({ value: i.id, label: i[f.relation!.labelField] }));
  }
  const publicPath = row && res.publicPath ? res.publicPath(row) : null;
  const del = deleteResourceAction.bind(null, res.key, id);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isNew ? `New ${res.singular.toLowerCase()}` : String(row.name ?? row.title ?? row.code ?? row.question ?? row.message ?? row.email ?? row.phone ?? res.singular)}
        back={{ href: `/admin/r/${res.key}`, label: res.label }}
        actions={publicPath && <Link href={publicPath} target="_blank" className="admin-btn-secondary">View on site ↗</Link>}
      />
      {res.key === "campaigns" && row && (
        <CampaignPanel id={id} status={row.status} channel={row.channel} />
      )}
      <div className="admin-card px-6 pt-6">
        <ResourceForm resourceKey={res.key} id={isNew ? null : id} fields={res.fields} row={row} relationOptions={relationOptions} />
      </div>
      {!isNew && res.canDelete !== false && (
        <form action={del} className="mt-8">
          <ConfirmButton message={`Delete this ${res.singular.toLowerCase()}? This cannot be undone.`}>Delete {res.singular.toLowerCase()}</ConfirmButton>
        </form>
      )}
    </div>
  );
}

function CampaignPanel({ id, status, channel }: { id: string; status: string; channel: string }) {
  const configured = channelStatus()[channel as "email" | "whatsapp"];
  const send = sendCampaignAction.bind(null, id);
  if (status === "SENT") return <Notice tone="success">This campaign has been sent.</Notice>;
  return (
    <Notice tone={configured ? "info" : "warning"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {configured
            ? `Sends only to people who agreed to ${channel} updates. Save your changes first.`
            : `${channel} is not connected yet, so messages will be logged (not delivered). Export subscribers to send manually, or connect the channel in Notifications.`}
        </span>
        <form action={send}><ConfirmButton className="admin-btn" message="Send this campaign now to all consenting recipients?">Send campaign</ConfirmButton></form>
      </div>
    </Notice>
  );
}
