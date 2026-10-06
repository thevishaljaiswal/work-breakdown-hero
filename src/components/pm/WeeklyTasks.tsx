import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { DeleteButton } from "@/components/pm/DeleteButton";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, fetchProjects, formatDate, priorityLabel } from "@/lib/pm";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mondayOf(d: Date) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - diff);
  return c;
}
function addDays(s: string, n: number) {
  const [y, m, d] = s.split("-").map(Number);
  return iso(new Date(y, m - 1, d + n));
}

export function WeeklyTasks() {
  const qc = useQueryClient();
  const [week, setWeek] = useState(() => iso(mondayOf(new Date())));
  const [owner, setOwner] = useState("all");
  const weekEnd = addDays(week, 6);

  const projects = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const tasks = useQuery({
    queryKey: ["weekly-tasks", week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .select("*, projects(code, name)")
        .eq("week_start", week)
        .order("owner")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const owners = useMemo(
    () => [...new Set((tasks.data ?? []).map((t) => t.owner))].sort(),
    [tasks.data],
  );
  const visible = (tasks.data ?? []).filter((t) => owner === "all" || t.owner === owner);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    visible.forEach((t) => map.set(t.owner, [...(map.get(t.owner) ?? []), t]));
    return [...map.entries()];
  }, [visible]);

  const fields: FieldSpec[] = [
    { name: "owner", label: "User", type: "text", required: true, span: "half", defaultValue: owner !== "all" ? owner : "" },
    { name: "week_start", label: "Week starting (Monday)", type: "date", required: true, span: "half", defaultValue: week },
    { name: "title", label: "Task", type: "text", required: true },
    { name: "description", label: "Details", type: "textarea" },
    {
      name: "project_id",
      label: "Project",
      type: "select",
      options: [{ value: "none", label: "No project" }, ...(projects.data ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))],
      defaultValue: "none",
      span: "half",
    },
    { name: "due_date", label: "Due date", type: "date", span: "half" },
    { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, defaultValue: "medium", span: "half" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  ];

  const payload = (v: Record<string, string>) => ({
    owner: v.owner.trim(),
    title: v.title,
    description: v.description || null,
    project_id: v.project_id && v.project_id !== "none" ? v.project_id : null,
    week_start: iso(mondayOf(new Date(v.week_start + "T00:00:00"))),
    due_date: v.due_date || null,
    priority: (v.priority || "medium") as never,
    status: (v.status || "not_started") as never,
  });

  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["weekly-tasks"] });
  };
  const create = useMutation({
    mutationFn: async (v: Record<string, string>) => {
      const { error } = await supabase.from("weekly_tasks").insert(payload(v));
      if (error) throw error;
    },
    onSuccess: () => done("Task created"),
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("weekly_tasks").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => done("Task updated"),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => done("Task deleted"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[200px] text-center text-sm font-medium">
            {formatDate(week)} – {formatDate(weekEnd)}
          </p>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeek(iso(mondayOf(new Date())))}>
            This week
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">User</span>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <RecordDialog
            title="New weekly task"
            fields={fields}
            submitLabel="Create task"
            onSubmit={(v) => create.mutateAsync(v)}
            trigger={<Button><Plus className="size-4" /> New task</Button>}
          />
        </div>
      </div>

      {tasks.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : !grouped.length ? (
        <p className="mt-8 rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No tasks for this week yet.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([user, items]) => {
            const completed = items.filter((t) => t.status === "completed").length;
            return (
              <section key={user} className="overflow-hidden rounded-lg border border-border bg-card">
                <header className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-2">
                  <h3 className="text-sm font-semibold">{user}</h3>
                  <span className="text-xs text-muted-foreground">{completed}/{items.length} completed</span>
                </header>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                      <div className="min-w-[220px] flex-1">
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {t.projects ? `${t.projects.code} · ${t.projects.name}` : "No project"}
                          {t.description ? ` — ${t.description}` : ""}
                        </p>
                      </div>
                      <div className="w-24 text-xs">
                        <p className="uppercase tracking-wide text-muted-foreground">Due</p>
                        <p className="mt-0.5 font-medium">{formatDate(t.due_date)}</p>
                      </div>
                      <div className="w-20 text-xs">
                        <p className="uppercase tracking-wide text-muted-foreground">Priority</p>
                        <p className="mt-0.5 font-medium">{priorityLabel(t.priority)}</p>
                      </div>
                      <Select
                        value={t.status}
                        onValueChange={(s) => update.mutate({ id: t.id, values: { status: s } })}
                      >
                        <SelectTrigger className="h-8 w-40 border-none bg-transparent px-1" aria-label={`Status of ${t.title}`}>
                          <StatusBadge status={t.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <RecordDialog
                        title="Edit weekly task"
                        fields={fields}
                        submitLabel="Save changes"
                        initialValues={{ ...t, project_id: t.project_id ?? "none" }}
                        onSubmit={(v) => update.mutateAsync({ id: t.id, values: payload(v) })}
                        trigger={
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${t.title}`}>
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeleteButton label={t.title} onConfirm={() => remove.mutateAsync(t.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
