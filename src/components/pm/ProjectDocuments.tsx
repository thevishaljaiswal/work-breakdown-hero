import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, FolderOpen, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { DeleteButton } from "@/components/pm/DeleteButton";
import {
  DOCUMENT_CATEGORIES,
  STATUS_OPTIONS,
  deleteProjectDocument,
  fetchProjectDocuments,
  type ProjectDocument,
} from "@/lib/pm";

const CATEGORY_OPTIONS = DOCUMENT_CATEGORIES.map((c) => ({
  value: c.category,
  label: c.category,
}));

const documentFields: FieldSpec[] = [
  { name: "title", label: "Document name", type: "text", required: true, placeholder: "Project charter" },
  {
    name: "category",
    label: "Category",
    type: "select",
    options: CATEGORY_OPTIONS,
    required: true,
    span: "half",
  },
  {
    name: "sub_category",
    label: "Sub category",
    type: "select",
    options: [], // replaced per form instance below
    required: true,
    span: "half",
  },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "version", label: "Version", type: "text", defaultValue: "1.0", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "doc_url", label: "Link / location", type: "text", placeholder: "https://…", span: "half" },
  { name: "remarks", label: "Remarks", type: "textarea" },
];

function fieldsFor(subCategory?: string | null): FieldSpec[] {
  const subs = DOCUMENT_CATEGORIES.flatMap((c) => c.subCategories).map((s) => ({ value: s, label: s }));
  return documentFields.map((f) =>
    f.name === "sub_category"
      ? { ...f, options: subs, defaultValue: subCategory ?? f.defaultValue }
      : f,
  );
}

function DocumentRow({
  doc,
  onEdit,
  onDelete,
}: {
  doc: ProjectDocument;
  onEdit: (values: Record<string, string>) => Promise<void>;
  onDelete: () => Promise<unknown>;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3">
      <div className="min-w-[220px] flex-1">
        <p className="text-sm font-medium">{doc.title}</p>
        <p className="text-xs text-muted-foreground">
          Owner: {doc.owner || "—"} · Version: {doc.version || "—"}
          {doc.remarks ? ` · ${doc.remarks}` : ""}
        </p>
      </div>
      {doc.doc_url ? (
        <a
          href={doc.doc_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> Open
        </a>
      ) : null}
      <StatusBadge status={doc.status} />
      <div className="flex items-center gap-1">
        <RecordDialog
          title={`Edit ${doc.title}`}
          fields={fieldsFor(doc.sub_category)}
          submitLabel="Save changes"
          initialValues={doc}
          onSubmit={onEdit}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Edit ${doc.title}`} className="size-8">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <DeleteButton label={doc.title} onConfirm={onDelete} />
      </div>
    </li>
  );
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const documents = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => fetchProjectDocuments(projectId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });

  const payload = (values: Record<string, string>) => ({
    title: values.title,
    category: values.category,
    sub_category: values.sub_category,
    owner: values.owner || null,
    version: values.version || "1.0",
    status: (values.status || "not_started") as never,
    doc_url: values.doc_url || null,
    remarks: values.remarks || null,
  });

  const addDocument = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase
        .from("project_documents")
        .insert({ project_id: projectId, ...payload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("project_documents").update(payload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeDocument = useMutation({
    mutationFn: (id: string) => deleteProjectDocument(id),
    onSuccess: () => {
      toast.success("Document deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = useMemo(() => {
    const all = documents.data ?? [];
    return categoryFilter === "all" ? all : all.filter((d) => d.category === categoryFilter);
  }, [documents.data, categoryFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Map<string, ProjectDocument[]>>();
    for (const doc of list) {
      if (!map.has(doc.category)) map.set(doc.category, new Map());
      const subs = map.get(doc.category)!;
      if (!subs.has(doc.sub_category)) subs.set(doc.sub_category, []);
      subs.get(doc.sub_category)!.push(doc);
    }
    return map;
  }, [list]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Project documents</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <RecordDialog
            title="New document"
            description="Register a project document under its category and sub category."
            fields={fieldsFor()}
            submitLabel="Add document"
            onSubmit={(values) => addDocument.mutateAsync(values)}
            trigger={
              <Button>
                <Plus className="size-4" /> Add document
              </Button>
            }
          />
        </div>
      </div>

      {documents.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading documents…</p>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No documents yet. Add your first document under one of the standard categories —
            from Project Initiation to Handover &amp; Closure.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {DOCUMENT_CATEGORIES.filter(
            (c) => categoryFilter === "all" || c.category === categoryFilter,
          ).map(({ category, subCategories }) => {
            const subs = byCategory.get(category);
            if (!subs || subs.size === 0) return null;
            return (
              <section key={category}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="size-4 text-level-wbs" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide">{category}</h3>
                </div>
                <div className="mt-2 space-y-3">
                  {subCategories.map((sub) => {
                    const docs = subs.get(sub);
                    if (!docs?.length) return null;
                    return (
                      <div key={sub}>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">{sub}</p>
                        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                          {docs.map((doc) => (
                            <DocumentRow
                              key={doc.id}
                              doc={doc}
                              onEdit={(values) => updateDocument.mutateAsync({ id: doc.id, values })}
                              onDelete={() => removeDocument.mutateAsync(doc.id)}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
