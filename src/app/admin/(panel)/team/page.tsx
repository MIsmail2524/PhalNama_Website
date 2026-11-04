import { prisma } from "@/lib/db";
import { requireAdmin, PERMISSIONS } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { Card, PageHeader } from "@/components/admin/ui";
import { TeamForm } from "@/components/admin/TeamForm";

export default async function Team() {
  const me = await requireAdmin("team");
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-5xl">
      <PageHeader title="Team & roles" description="Give each person only the access they need." />
      <Card title="Roles" className="mb-6">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {(["OWNER", "MANAGER", "FULFILMENT", "EDITOR"] as const).map((r) => (
            <li key={r}><strong>{r.toLowerCase()}</strong>: <span className="text-stone">{Object.entries(PERMISSIONS).filter(([, roles]) => (roles as readonly string[]).includes(r)).map(([p]) => p).join(", ")}</span></li>
          ))}
        </ul>
      </Card>
      <div className="space-y-4">
        {users.map((u) => (
          <Card key={u.id} title={`${u.name}${u.id === me.id ? " (you)" : ""}`} actions={<span className="text-xs text-stone">Last sign-in {formatDateTime(u.lastLoginAt)}</span>}>
            <TeamForm id={u.id} user={{ email: u.email, name: u.name, role: u.role, active: u.active }} />
          </Card>
        ))}
        <Card title="Add team member"><TeamForm id={null} /></Card>
      </div>
    </div>
  );
}
