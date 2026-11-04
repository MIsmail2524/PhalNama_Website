"use client";
import { useActionState, useState } from "react";
import type { SField } from "@/admin/settings-schema";
import type { SettingsKey } from "@/lib/settings";
import { saveSettingsAction } from "@/app/admin/(panel)/actions";
import { ImageField } from "./ImageField";
import { SubmitButton } from "./SubmitButton";

type Obj = Record<string, unknown>;

export function SettingsForm({ group, fields, initial }: { group: SettingsKey; fields: SField[]; initial: Obj }) {
  const [state, action] = useActionState(saveSettingsAction.bind(null, group), null);
  const [v, setV] = useState<Obj>(initial);
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="json" value={JSON.stringify(v)} />
      <div className="admin-card space-y-5 p-6">
        {fields.map((f) => (
          <div key={f.key}>
            {f.section && <h2 className="mb-4 mt-4 border-t border-sand-300 pt-6 text-xs font-bold uppercase tracking-wider text-stone first:mt-0 first:border-0 first:pt-0">{f.section}</h2>}
            {f.type === "boolean" ? (
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!v[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-forest" /> {f.label}</label>
            ) : (
              <label className="admin-label">{f.label}</label>
            )}
            {f.type === "text" && <input value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className="admin-input" />}
            {f.type === "textarea" && <textarea value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} rows={4} className="admin-input" />}
            {f.type === "number" && <input type="number" value={String(v[f.key] ?? 0)} onChange={(e) => set(f.key, e.target.value === "" ? 0 : Number(e.target.value))} className="admin-input !w-48" />}
            {f.type === "select" && (
              <select value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className="admin-input !w-72">
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {f.type === "tags" && (
              <textarea value={((v[f.key] as string[]) ?? []).join(", ")} onChange={(e) => set(f.key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} rows={2} className="admin-input" />
            )}
            {f.type === "image" && <ControlledImage value={String(v[f.key] ?? "")} onChange={(u) => set(f.key, u)} />}
            {f.type === "list" && <ListEditor items={(v[f.key] as Obj[]) ?? []} item={f.item} onChange={(items) => set(f.key, items)} />}
            {f.help && <p className="mt-1 text-xs text-stone">{f.help}</p>}
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 flex items-center gap-4 border-t border-sand-300 bg-[#f6f4ee]/95 py-4 backdrop-blur">
        <SubmitButton>Save settings</SubmitButton>
        {state?.message && <span className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>}
      </div>
    </form>
  );
}

function ControlledImage({ value, onChange }: { value: string; onChange: (u: string) => void }) {
  return <ImageField name="" defaultValue={value} onChange={onChange} />;
}

function ListEditor({ items, item, onChange }: { items: Obj[]; item: { key: string; label: string; type: "text" | "textarea" | "image" }[]; onChange: (i: Obj[]) => void }) {
  const upd = (i: number, k: string, val: string) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const move = (i: number, d: number) => {
    const n = [...items];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded border border-sand-300 bg-sand/10 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-stone">#{i + 1}</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => move(i, -1)}>↑</button>
              <button type="button" onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="text-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {item.map((sub) => (
              <div key={sub.key} className={sub.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="admin-label">{sub.label}</label>
                {sub.type === "text" && <input value={String(it[sub.key] ?? "")} onChange={(e) => upd(i, sub.key, e.target.value)} className="admin-input" />}
                {sub.type === "textarea" && <textarea value={String(it[sub.key] ?? "")} onChange={(e) => upd(i, sub.key, e.target.value)} rows={2} className="admin-input" />}
                {sub.type === "image" && <ControlledImage value={String(it[sub.key] ?? "")} onChange={(u) => upd(i, sub.key, u)} />}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="admin-btn-secondary" onClick={() => onChange([...items, Object.fromEntries(item.map((s) => [s.key, ""]))])}>+ Add</button>
    </div>
  );
}
