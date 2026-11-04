"use client";
import { useUnsavedGuard } from "./UnsavedGuard";
import { useActionState } from "react";
import { clsx } from "clsx";
import type { Field } from "@/admin/fields";
import { saveResourceAction, type AdminFormState } from "@/admin/actions";
import { ImageField, ImagesField } from "./ImageField";
import { MarkdownField } from "./MarkdownField";
import { SlugField } from "./SlugField";
import { SubmitButton } from "./SubmitButton";

type Row = Record<string, unknown> | null;

function toLocalInput(v: unknown, withTime: boolean) {
  if (!v) return "";
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

export function ResourceForm({ resourceKey, id, fields, row, relationOptions, defaults }: {
  resourceKey: string;
  id: string | null;
  fields: Field[];
  row: Row;
  relationOptions: Record<string, { value: string; label: string }[]>;
  defaults?: Record<string, unknown>;
}) {
  const action = saveResourceAction.bind(null, resourceKey, id);
  const [state, formAction] = useActionState<AdminFormState, FormData>(action, null);
  const guard = useUnsavedGuard();
  const val = (f: Field) => (row ? row[f.name] : defaults?.[f.name]);

  return (
    <form onChange={guard.onChange} onSubmit={guard.onSubmit} action={formAction} className="space-y-6">
      {state && !state.ok && <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((f) => {
          const v = val(f);
          const err = state?.errors?.[f.name];
          const wide = f.wide || ["markdown", "images", "json"].includes(f.type);
          return (
            <div key={f.name} className={clsx(wide && "md:col-span-2", f.type === "boolean" && "self-end")}>
              {f.type !== "boolean" && (
                <label className="admin-label" htmlFor={`f-${f.name}`}>
                  {f.label} {f.required && <span className="text-danger">*</span>}
                </label>
              )}
              <FieldInput f={f} v={v} options={relationOptions[f.name]} />
              {err ? <p className="mt-1 text-xs text-danger">{err}</p> : f.help ? <p className="mt-1 text-xs text-stone">{f.help}</p> : null}
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-6 flex items-center gap-3 border-t border-sand-300 bg-white/95 px-6 py-4 backdrop-blur">
        <SubmitButton>{id ? "Save changes" : "Create"}</SubmitButton>
      </div>
    </form>
  );
}

function FieldInput({ f, v, options }: { f: Field; v: unknown; options?: { value: string; label: string }[] }) {
  const id = `f-${f.name}`;
  if (f.readOnly) {
    if (f.type === "json") return <pre className="overflow-x-auto rounded bg-sand/40 p-3 text-xs">{v ? JSON.stringify(v, null, 2) : "—"}</pre>;
    if (f.type === "boolean") return <p className="text-sm">{f.label}: {v ? "Yes" : "No"}</p>;
    return <p className="whitespace-pre-wrap rounded bg-sand/30 px-3 py-2 text-sm">{v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v)}</p>;
  }
  switch (f.type) {
    case "textarea":
      return <textarea id={id} name={f.name} defaultValue={(v as string) ?? ""} rows={4} required={f.required} placeholder={f.placeholder} className="admin-input" />;
    case "markdown":
      return <MarkdownField name={f.name} defaultValue={v as string} required={f.required} />;
    case "number":
    case "money":
      return <input id={id} name={f.name} type="number" step={f.type === "money" ? 1 : "any"} defaultValue={v === null || v === undefined ? "" : String(v)} required={f.required} className="admin-input" />;
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name={f.name} defaultChecked={v === undefined ? true : !!v} className="h-4 w-4 accent-forest" /> {f.label}
        </label>
      );
    case "select":
      return (
        <select id={id} name={f.name} defaultValue={(v as string) ?? f.options?.[0]?.value} className="admin-input">
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "relation":
      return (
        <select id={id} name={f.name} defaultValue={(v as string) ?? ""} className="admin-input">
          {f.relation?.nullable !== false && <option value="">— None —</option>}
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "date":
      return <input id={id} name={f.name} type="date" defaultValue={toLocalInput(v, false)} className="admin-input" />;
    case "datetime":
      return <input id={id} name={f.name} type="datetime-local" defaultValue={toLocalInput(v, true)} className="admin-input" />;
    case "image":
      return <ImageField name={f.name} defaultValue={v as string} />;
    case "images":
      return <ImagesField name={f.name} defaultValue={(v as string[]) ?? []} />;
    case "tags":
      return <input id={id} name={f.name} defaultValue={Array.isArray(v) ? v.join(", ") : ""} className="admin-input" placeholder={f.placeholder} />;
    case "slug":
      return <SlugField name={f.name} from={f.from} defaultValue={v as string} />;
    default:
      return <input id={id} name={f.name} defaultValue={(v as string) ?? ""} required={f.required} placeholder={f.placeholder} className="admin-input" />;
  }
}
