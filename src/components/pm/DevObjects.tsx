import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Code2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { DeleteButton } from "@/components/pm/DeleteButton";
import { DevTimer } from "@/components/pm/DevTimer";
import {
  COMPLEXITY_OPTIONS,
  DEV_OBJECT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  complexityLabel,
  deleteDevObject,
  devObjectTypeLabel,
  fetchDevObjects,
  fetchSprints,
  formatDate,
  priorityLabel,
} from "@/lib/pm";

const objectFields: FieldSpec[] = [
  { name: "object_code", label: "Object ID", type: "text", required: true, placeholder: "DEV-001", span: "half" },
  { name: "name", label: "Object name", type: "text", required: true, span: "half" },
  {
    name: "object_type",
    label: "Object type",
    type: "select",
    options: DEV_OBJECT_TYPE_OPTIONS,
    defaultValue: "report",
    span: "half",
  },
  { name: "module", label: "Module / area", type: "text", placeholder: "Billing", span: "half" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "technical_spec", label: "Technical specification / notes", type: "textarea" },
  { name: "developer", label: "Developer", type: "text", span: "half" },
  { name: "reviewer", label: "Reviewer", type: "text", span: "half" },
  {
    name: "complexity",
    label: "Complexity",
    type: "select",
    options: COMPLEXITY_OPTIONS,
    defaultValue: "medium",
    span: "half",
  },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    options: PRIORITY_OPTIONS,
    defaultValue: "medium",
    span: "half",
  },
  { name: "estimate_hours", label: "Estimate (hours)", type: "number", span: "half" },
  { name: "actual_hours", label: "Actual (hours)", type: "number", span: "half" },
  { name: "transport_request", label: "Transport / branch", type: "text", span: "half" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: STATUS_OPTIONS,
    defaultValue: "not_started",
    span: "half",
  },
  { name: "planned_start", label: "Planned start", type: "date", span: "half" },
  { name: "planned_end", label: "Planned finish", type: "date", span: "half" },
  { name: "actual_end", label: "Actual finish", type: "date", span: "half" },
];

function payload(values: Record<string, string>) {
  return {
    object_code: values.object_code,
    name: values.name,
    object_type: values.object_type || "report",
    module: values.module || null,
    description: values.description || null,
    technical_spec: values.technical_spec || null,
    developer: values.developer || null,
    reviewer: values.reviewer || null,
    complexity: values.complexity || "medium",
    priority: (values.priority || "medium") as never,
    estimate_hours: values.estimate_hours ? Number(values.estimate_hours) : 0,
    actual_hours: values.actual_hours ? Number(values.actual_hours) : 0,
    transport_request: values.transport_request || null,
    status: (values.status || "not_started") as never,
    planned_start: values.planned_start || null,
    planned_end: values.planned_end || null,
    actual_end: values.actual_end || null,
  };
}

export function DevObjects({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  const sprints = useQuery({ queryKey: ["sprints", projectId], queryFn: () => fetchSprints(projectId) });
  const sprintIds = (sprints.data ?? []).map((s) => s.id);
  const objects = useQuery({
    queryKey: ["dev-objects", projectId, sprintIds.join(",")],
    queryFn: () => fetchDevObjects(sprintIds),
    enabled: sprints.isSuccess,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dev-objects", projectId] });

  const addObject = useMutation({
    mutationFn: async ({ sprintId, values }: { sprintId: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("dev_objects").insert({ sprint_id: sprintId, ...payload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Development object added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateObject = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("dev_objects").update(payload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Development object updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeObject = useMutation({
    mutationFn: (id: string) => deleteDevObject(id),
    onSuccess: () => {
      toast.success("Development object deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const all = objects.data ?? [];
  const visible = useMemo(
    () => all.filter((o) => statusFilter === "all" || o.status === statusFilter),
    [all, statusFilter],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Code2 className="size-4 text-level-activity" />
        <h2 className="text-xl font-semibold tracking-tight">Development objects planning</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Track every object that has to be built to complete a sprint — type, developer, effort,
        transport and status.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Filter by status</span>
        {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={statusFilter === option.value ? "default" : "outline"}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
            <span className="ml-1 text-xs opacity-70">
              {option.value === "all" ? all.length : all.filter((o) => o.status === option.value).length}
            </span>
          </Button>
        ))}
      </div>

      {sprints.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading sprints…</p>
      ) : sprintIds.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Create a sprint first — development objects are planned per sprint.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {(sprints.data ?? []).map((sprint) => {
            const items = visible.filter((o) => o.sprint_id === sprint.id);
            const expanded = open[sprint.id] ?? false;
            const estimate = items.reduce((sum, o) => sum + Number(o.estimate_hours ?? 0), 0);
            const actual = items.reduce((sum, o) => sum + Number(o.actual_hours ?? 0), 0);
            const done = items.filter((o) => o.status === "completed").length;
            return (
              <li key={sprint.id}>
                <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${sprint.name} objects`}
                    className="size-7 shrink-0"
                    onClick={() => setOpen((s) => ({ ...s, [sprint.id]: !expanded }))}
                  >
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </Button>
                  <span className="min-w-[140px] flex-1 truncate text-sm font-medium">{sprint.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} objects · {done} done
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {estimate} h est · {actual} h actual
                  </span>
                  <StatusBadge status={sprint.status} />
                  <RecordDialog
                    title={`New development object in ${sprint.name}`}
                    description="An object a developer must build for this sprint."
                    fields={objectFields}
                    submitLabel="Add object"
                    onSubmit={(values) => addObject.mutateAsync({ sprintId: sprint.id, values })}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Plus className="size-4" /> Object
                      </Button>
                    }
                  />
                </div>

                {expanded ? (
                  <ul className="divide-y divide-border/70 border-t border-border bg-surface-raised">
                    {items.length === 0 ? (
                      <li className="px-4 py-3 text-xs text-muted-foreground">
                        No development objects for this sprint yet.
                      </li>
                    ) : (
                      items.map((object) => (
                        <li key={object.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                          <span className="w-24 shrink-0 font-mono text-xs text-level-activity">
                            {object.object_code}
                          </span>
                          <div className="min-w-[200px] flex-1">
                            <p className="truncate text-sm font-medium">{object.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {devObjectTypeLabel(object.object_type)} · {object.module || "No module"} ·{" "}
                              {complexityLabel(object.complexity)} complexity
                            </p>
                          </div>
                          <div className="w-28 text-xs">
                            <p className="uppercase tracking-wide text-muted-foreground">Developer</p>
                            <p className="mt-0.5 font-medium">{object.developer || "—"}</p>
                          </div>
                          <div className="w-28 text-xs">
                            <p className="uppercase tracking-wide text-muted-foreground">Effort</p>
                            <p className="mt-0.5 font-medium">
                              {object.estimate_hours} / {object.actual_hours} h
                            </p>
                          </div>
                          <div className="w-36 text-xs">
                            <p className="uppercase tracking-wide text-muted-foreground">Plan</p>
                            <p className="mt-0.5 font-medium">
                              {formatDate(object.planned_start)} → {formatDate(object.planned_end)}
                            </p>
                          </div>
                          <div className="w-24 text-xs">
                            <p className="uppercase tracking-wide text-muted-foreground">Priority</p>
                            <p className="mt-0.5 font-medium">{priorityLabel(object.priority)}</p>
                          </div>
                          <StatusBadge status={object.status} />
                          <DevTimer object={object} />
                          <div className="flex items-center gap-1">
                            <RecordDialog
                              title={`Edit ${object.object_code}`}
                              fields={objectFields}
                              submitLabel="Save changes"
                              initialValues={object}
                              onSubmit={(values) => updateObject.mutateAsync({ id: object.id, values })}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit ${object.object_code}`}
                                  className="size-8"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                            <DeleteButton
                              label={`${object.object_code} ${object.name}`}
                              onConfirm={() => removeObject.mutateAsync(object.id)}
                            />
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
