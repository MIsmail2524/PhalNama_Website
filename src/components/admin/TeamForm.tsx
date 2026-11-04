"use client";
import { useActionForm } from "@/components/ui/useActionForm";
import { saveAdminUserAction } from "@/app/admin/(panel)/actions";
import { SubmitButton } from "./SubmitButton";

export function TeamForm({ id, user }: { id: string | null; user?: { email: string; name: string; role: string; active: boolean } }) {
  const [state, action, pending] = useActionForm(saveAdminUserAction.bind(null, id), null);
  return (
    <form onSubmit={action} className="grid items-end gap-3 md:grid-cols-6">
      <label className="block md:col-span-2"><span className="admin-label">Name</span><input name="name" defaultValue={user?.name} required className="admin-input" /></label>
      <label className="block md:col-span-2"><span className="admin-label">Email</span><input name="email" type="email" defaultValue={user?.email} required className="admin-input" /></label>
      <div><label className="admin-label" htmlFor="f-role">Role</label>
        <select id="f-role" name="role" defaultValue={user?.role ?? "MANAGER"} className="admin-input">{["OWNER", "MANAGER", "FULFILMENT", "EDITOR"].map((r) => <option key={r}>{r}</option>)}</select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={user?.active ?? true} className="accent-forest" /> Active</label>
      <label className="block md:col-span-3"><span className="admin-label">{id ? "New password (leave empty to keep)" : "Password (min 10 characters)"}</span><input name="password" type="password" autoComplete="new-password" className="admin-input" /></label>
      <div className="flex items-center gap-3 md:col-span-3">
        <SubmitButton pending={pending} className="admin-btn-secondary">{id ? "Save" : "Add member"}</SubmitButton>
        {state?.message && <span className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
