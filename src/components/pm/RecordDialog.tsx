import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select" | "checkbox" | "file";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  span?: "full" | "half";
};

type RecordValue = unknown;

type Props = {
  title: string;
  description?: string;
  fields: FieldSpec[];
  trigger: ReactNode;
  submitLabel?: string;
  /** When provided, the form opens pre-filled — use for editing an existing record. */
  initialValues?: Record<string, RecordValue>;
  onSubmit: (values: Record<string, string>, files: Record<string, File>) => Promise<void>;
};

function toText(value: RecordValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function RecordDialog({
  title,
  description,
  fields,
  trigger,
  submitLabel = "Save",
  initialValues,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => initial(fields, initialValues));
  const [files, setFiles] = useState<Record<string, File>>({});

  function initial(specs: FieldSpec[], preset?: Record<string, RecordValue>) {
    return Object.fromEntries(
      specs.map((f) => [
        f.name,
        preset && f.name in preset ? toText(preset[f.name]) : (f.defaultValue ?? ""),
      ]),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values, files);
      setValues(initial(fields, initialValues));
      setFiles({});
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setValues(initial(fields, initialValues));
        setFiles({});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <div
              key={field.name}
              className={field.span === "half" ? "col-span-1 space-y-2" : "col-span-2 space-y-2"}
            >
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              ) : field.type === "select" ? (
                <Select
                  value={values[field.name] || undefined}
                  onValueChange={(value) => setValues((v) => ({ ...v, [field.name]: value }))}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "file" ? (
                <Input
                  id={field.name}
                  type="file"
                  required={field.required}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFiles((f) => {
                      const next = { ...f };
                      if (file) next[field.name] = file;
                      else delete next[field.name];
                      return next;
                    });
                  }}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}