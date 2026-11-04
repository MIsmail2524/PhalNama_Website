/** Field definitions for the generic admin editor. */
export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "money"
  | "boolean"
  | "select"
  | "relation"
  | "date"
  | "datetime"
  | "image"
  | "images"
  | "tags"
  | "slug"
  | "json";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** relation: prisma model + label field */
  relation?: { model: string; labelField: string; nullable?: boolean };
  /** slug: auto-fill from this field */
  from?: string;
  /** Lower-case tag values (e.g. city names) */
  lowercase?: boolean;
  /** Field width in the form grid */
  wide?: boolean;
  readOnly?: boolean;
};

export type Column = { name: string; label: string; type?: "text" | "money" | "boolean" | "date" | "badge" | "relation" | "image"; path?: string };

export type Resource = {
  key: string;
  model: string;
  label: string;
  singular: string;
  group: "Catalogue" | "Marketing" | "Content" | "Shipping" | "Customers" | "System";
  permission: "catalogue" | "marketing" | "content" | "shipping" | "customers" | "settings";
  fields: Field[];
  columns: Column[];
  orderBy?: Record<string, "asc" | "desc">[];
  searchFields?: string[];
  include?: Record<string, unknown>;
  canCreate?: boolean;
  canDelete?: boolean;
  /** "archive" sets this field/value instead of deleting */
  archive?: { field: string; value: unknown };
  description?: string;
  exportable?: boolean;
  publicPath?: (row: Record<string, unknown>) => string | null;
};
