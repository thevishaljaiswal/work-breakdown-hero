import { forwardRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flag,
  ListTree,
  Pencil,
  Plus,
  Layers,
  Rocket,
  Code2,
  Table2,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { SprintBacklog } from "@/components/pm/SprintBacklog";
import { TraceabilityMatrix } from "@/components/pm/TraceabilityMatrix";
import { SuccessMetrics } from "@/components/pm/SuccessMetrics";
import { DevObjects } from "@/components/pm/DevObjects";
import { DeleteButton } from "@/components/pm/DeleteButton";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  activitySpan,
  deleteActivity,
  deleteMilestone,
  deleteSprint,
  deleteWbs,
  derivePlannedDates,
  fetchHierarchy,
  fetchProject,
  fetchSprints,
  formatDate,
  projectSpan,
  statusLabel,
  wbsSpan,
} from "@/lib/pm";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project breakdown — WBS, activities & milestones" },
      {
        name: "description",
        content:
          "Drill into a project: add WBS elements, activities inside each WBS and milestones inside each activity, with dates rolling up the hierarchy.",
      },
      { property: "og:title", content: "Project breakdown — WBS, activities & milestones" },
      {
        property: "og:description",
        content: "Manage the full work breakdown of a project with automatic date roll-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectDetail,
});

const projectFields: FieldSpec[] = [
  { name: "code", label: "Project code", type: "text", required: true, span: "half" },
  { name: "name", label: "Project name", type: "text", required: true, span: "half" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "client", label: "Client", type: "text", span: "half" },
  { name: "manager", label: "Project manager", type: "text", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, defaultValue: "medium", span: "half" },
  { name: "budget", label: "Budget", type: "number", span: "half" },
  { name: "currency", label: "Currency", type: "text", defaultValue: "USD", span: "half" },
  { name: "planned_start", label: "Planned start", type: "date", span: "half" },
  { name: "planned_end", label: "Planned finish", type: "date", span: "half" },
];

const wbsFields: FieldSpec[] = [
  { name: "code", label: "WBS code", type: "text", required: true, placeholder: "1.1", span: "half" },
  { name: "name", label: "WBS name", type: "text", required: true, span: "half" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "weight", label: "Weight (%)", type: "number", span: "half" },
  { name: "budget", label: "Budget", type: "number", span: "half" },
  { name: "planned_start", label: "Planned start", type: "date", span: "half" },
  { name: "planned_end", label: "Planned finish", type: "date", span: "half" },
];

const activityFields: FieldSpec[] = [
  { name: "code", label: "Activity code", type: "text", required: true, placeholder: "A-10", span: "half" },
  { name: "name", label: "Activity name", type: "text", required: true, span: "half" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "duration_days", label: "Duration (days)", type: "number", span: "half" },
  { name: "progress_pct", label: "Progress (%)", type: "number", span: "half" },
  { name: "planned_start", label: "Planned start", type: "date", span: "half" },
  { name: "planned_end", label: "Planned finish (auto from duration)", type: "date", span: "half" },
  { name: "actual_start", label: "Actual start", type: "date", span: "half" },
  { name: "actual_end", label: "Actual finish", type: "date", span: "half" },
];

const milestoneFields: FieldSpec[] = [
  { name: "name", label: "Milestone name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "due_date", label: "Due date", type: "date", required: true, span: "half" },
  { name: "actual_date", label: "Actual date", type: "date", span: "half" },
  {
    name: "is_critical",
    label: "Critical",
    type: "select",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
    defaultValue: "false",
    span: "half",
  },
];

const sprintFields: FieldSpec[] = [
  { name: "name", label: "Sprint name", type: "text", required: true, placeholder: "Sprint 1", span: "half" },
  { name: "owner", label: "Owner", type: "text", span: "half" },
  { name: "goal", label: "Sprint goal", type: "textarea", placeholder: "What this sprint should achieve" },
  { name: "features", label: "Features", type: "textarea", placeholder: "One feature per line" },
  { name: "deliverables", label: "Deliverables", type: "textarea", placeholder: "One deliverable per line" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "start_date", label: "Start date", type: "date", required: true, span: "half" },
  { name: "end_date", label: "End date", type: "date", required: true, span: "half" },
];

function DateSpan({ label, start, end }: { label: string; start: string | null; end: string | null }) {
  return (
    <div className="text-xs">
      <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="mt-0.5 font-medium">
        {formatDate(start)} → {formatDate(end)}
      </p>
    </div>
  );
}

function LineList({ label, value }: { label: string; value: string | null }) {
  const items = (value ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  return (
    <div className="text-xs">
      <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
      {items.length === 0 ? (
        <p className="mt-0.5 text-muted-foreground">—</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item, index) => (
            <li key={`${label}-${index}`} className="text-sm">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpandButton({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      onClick={onToggle}
      className="size-7 shrink-0"
    >
      {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
    </Button>
  );
}

const EditButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { label: string }
>(function EditButton({ label, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={`Edit ${label}`}
      className="size-8"
      {...props}
    >
      <Pencil className="size-4" />
    </Button>
  );
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => fetchProject(projectId) });
  const hierarchy = useQuery({ queryKey: ["hierarchy", projectId], queryFn: () => fetchHierarchy(projectId) });
  const sprints = useQuery({ queryKey: ["sprints", projectId], queryFn: () => fetchSprints(projectId) });

  const [openWbs, setOpenWbs] = useState<Record<string, boolean>>({});
  const [openActivity, setOpenActivity] = useState<Record<string, boolean>>({});
  const [openMilestones, setOpenMilestones] = useState<Record<string, boolean>>({});
  const [openSprint, setOpenSprint] = useState<Record<string, boolean>>({});

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    id: string,
    fallback: boolean,
  ) => setter((state) => ({ ...state, [id]: !(state[id] ?? fallback) }));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hierarchy", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-rollups"] });
  };

  const refreshProject = () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project-rollups"] });
  };

  const projectPayload = (values: Record<string, string>) => ({
    code: values.code,
    name: values.name,
    description: values.description || null,
    client: values.client || null,
    manager: values.manager || null,
    status: (values.status || "not_started") as never,
    priority: (values.priority || "medium") as never,
    budget: values.budget ? Number(values.budget) : 0,
    currency: values.currency || "USD",
    planned_start: values.planned_start || null,
    planned_end: values.planned_end || null,
  });

  const wbsPayload = (values: Record<string, string>) => ({
    code: values.code,
    name: values.name,
    description: values.description || null,
    owner: values.owner || null,
    status: (values.status || "not_started") as never,
    weight: values.weight ? Number(values.weight) : 0,
    budget: values.budget ? Number(values.budget) : 0,
    planned_start: values.planned_start || null,
    planned_end: values.planned_end || null,
  });

  const activityPayload = (values: Record<string, string>) => ({
    code: values.code,
    name: values.name,
    description: values.description || null,
    owner: values.owner || null,
    status: (values.status || "not_started") as never,
    duration_days: values.duration_days ? Number(values.duration_days) : 0,
    progress_pct: values.progress_pct ? Number(values.progress_pct) : 0,
    ...derivePlannedDates({
      planned_start: values.planned_start || null,
      planned_end: values.planned_end || null,
      duration_days: values.duration_days ? Number(values.duration_days) : 0,
    }),
    actual_start: values.actual_start || null,
    actual_end: values.actual_end || null,
  });

  const milestonePayload = (values: Record<string, string>) => ({
    name: values.name,
    description: values.description || null,
    owner: values.owner || null,
    status: (values.status || "not_started") as never,
    due_date: values.due_date || null,
    actual_date: values.actual_date || null,
    is_critical: values.is_critical === "true",
  });

  const sprintPayload = (values: Record<string, string>) => ({
    name: values.name,
    goal: values.goal || null,
    features: values.features || null,
    deliverables: values.deliverables || null,
    owner: values.owner || null,
    status: (values.status || "not_started") as never,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
  });

  const updateProject = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("projects").update(projectPayload(values)).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project updated");
      refreshProject();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addWbs = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("wbs_items").insert({ project_id: projectId, ...wbsPayload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WBS element added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateWbs = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("wbs_items").update(wbsPayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WBS element updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addActivity = useMutation({
    mutationFn: async ({ wbsId, values }: { wbsId: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("activities").insert({ wbs_id: wbsId, ...activityPayload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("activities").update(activityPayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMilestone = useMutation({
    mutationFn: async ({ activityId, values }: { activityId: string; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("milestones")
        .insert({ activity_id: activityId, ...milestonePayload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Milestone added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("milestones").update(milestonePayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Milestone updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addSprint = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("sprints").insert({ project_id: projectId, ...sprintPayload(values) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sprint added");
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSprint = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("sprints").update(sprintPayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sprint updated");
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeWbs = useMutation({
    mutationFn: (id: string) => deleteWbs(id),
    onSuccess: () => {
      toast.success("WBS element deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeActivity = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      toast.success("Activity deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMilestone = useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onSuccess: () => {
      toast.success("Milestone deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeSprint = useMutation({
    mutationFn: (id: string) => deleteSprint(id),
    onSuccess: () => {
      toast.success("Sprint deleted");
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      queryClient.invalidateQueries({ queryKey: ["traceability", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const wbsList = hierarchy.data ?? [];
  const rolled = projectSpan(project.data ?? null, wbsList);
  const sprintList = sprints.data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All projects
      </Link>

      <header className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-primary">{project.data?.code ?? "…"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.data?.name ?? "Project"}</h1>
            {project.data?.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.data.description}</p>
            ) : null}
          </div>
          {project.data ? (
            <RecordDialog
              title={`Edit ${project.data.code}`}
              description="Update this project's details."
              fields={projectFields}
              submitLabel="Save changes"
              initialValues={project.data}
              onSubmit={(values) => updateProject.mutateAsync(values)}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Edit project
                </Button>
              }
            />
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <DateSpan
            label="Entered dates"
            start={project.data?.planned_start ?? null}
            end={project.data?.planned_end ?? null}
          />
          <DateSpan label="Rolled-up dates" start={rolled.start} end={rolled.end} />
          <div className="text-xs">
            <span className="uppercase tracking-wide text-muted-foreground">Manager</span>
            <p className="mt-0.5 font-medium">{project.data?.manager || "—"}</p>
          </div>
          <div className="text-xs">
            <span className="uppercase tracking-wide text-muted-foreground">Status</span>
            <p className="mt-0.5 font-medium">{project.data ? statusLabel(project.data.status) : "—"}</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="wbs" className="mt-8">
        <TabsList>
          <TabsTrigger value="wbs" className="gap-2">
            <ListTree className="size-4" /> WBS structure
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-2">
            <Rocket className="size-4" /> Sprint planning
          </TabsTrigger>
          <TabsTrigger value="dev" className="gap-2">
            <Code2 className="size-4" /> Development objects
          </TabsTrigger>
          <TabsTrigger value="rtm" className="gap-2">
            <Table2 className="size-4" /> Traceability matrix
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <Target className="size-4" /> Success metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wbs" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-level-wbs" />
              <h2 className="text-xl font-semibold tracking-tight">Work breakdown structure</h2>
            </div>
            <RecordDialog
              title="New WBS element"
              description="Level 2 of the hierarchy — sits inside this project."
              fields={wbsFields}
              submitLabel="Add WBS"
              onSubmit={(values) => addWbs.mutateAsync(values)}
              trigger={
                <Button>
                  <Plus className="size-4" /> Add WBS
                </Button>
              }
            />
          </div>

          <section className="mt-4">
            {hierarchy.isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading breakdown…</p>
            ) : wbsList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <ListTree className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No WBS elements yet. Add one to start breaking down the work.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {wbsList.map((wbs) => {
                  const wbsDates = wbsSpan(wbs);
                  const wbsExpanded = openWbs[wbs.id] ?? false;
                  return (
                    <li key={wbs.id}>
                      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                        <ExpandButton
                          expanded={wbsExpanded}
                          onToggle={() => toggle(setOpenWbs, wbs.id, false)}
                          label={`WBS ${wbs.code}`}
                        />
                        <Layers className="size-4 shrink-0 text-level-wbs" />
                        <span className="w-20 shrink-0 font-mono text-xs text-level-wbs">{wbs.code}</span>
                        <span className="min-w-[180px] flex-1 truncate text-sm font-medium">{wbs.name}</span>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {formatDate(wbsDates.start)} → {formatDate(wbsDates.end)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {wbs.activities.length} activities
                        </span>
                        <StatusBadge status={wbs.status} />
                        <div className="flex items-center gap-1">
                          <RecordDialog
                            title={`Edit WBS ${wbs.code}`}
                            fields={wbsFields}
                            submitLabel="Save changes"
                            initialValues={wbs}
                            onSubmit={(values) => updateWbs.mutateAsync({ id: wbs.id, values })}
                            trigger={<EditButton label={`WBS ${wbs.code}`} />}
                          />
                          <RecordDialog
                            title={`New activity in WBS ${wbs.code}`}
                            fields={activityFields}
                            submitLabel="Add activity"
                            onSubmit={(values) => addActivity.mutateAsync({ wbsId: wbs.id, values })}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Plus className="size-4" /> Activity
                              </Button>
                            }
                          />
                          <DeleteButton
                            label={`WBS ${wbs.code}`}
                            cascadeNote="activities and milestones"
                            onConfirm={() => removeWbs.mutateAsync(wbs.id)}
                          />
                        </div>
                      </div>

                      {wbsExpanded ? (
                        <div className="border-t border-border bg-surface-raised px-4 py-3">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <DateSpan label="Entered dates" start={wbs.planned_start} end={wbs.planned_end} />
                            <DateSpan label="Rolled-up dates" start={wbsDates.start} end={wbsDates.end} />
                            <div className="text-xs">
                              <span className="uppercase tracking-wide text-muted-foreground">Owner</span>
                              <p className="mt-0.5 font-medium">{wbs.owner || "—"}</p>
                            </div>
                          </div>
                          {wbs.description ? (
                            <p className="mt-2 text-sm text-muted-foreground">{wbs.description}</p>
                          ) : null}

                          {wbs.activities.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              No activities in this WBS yet.
                            </p>
                          ) : (
                            <ul className="mt-3 divide-y divide-border/70 rounded-md border border-border/70 bg-card">
                              {wbs.activities.map((activity) => {
                                const actDates = activitySpan(activity);
                                const actExpanded = openActivity[activity.id] ?? false;
                                const msExpanded = openMilestones[activity.id] ?? false;
                                return (
                                  <li key={activity.id}>
                                    <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                                      <ExpandButton
                                        expanded={actExpanded}
                                        onToggle={() => toggle(setOpenActivity, activity.id, false)}
                                        label={`activity ${activity.code}`}
                                      />
                                      <span className="w-20 shrink-0 font-mono text-xs text-level-activity">
                                        {activity.code}
                                      </span>
                                      <span className="min-w-[160px] flex-1 truncate text-sm">
                                        {activity.name}
                                      </span>
                                      <span className="hidden text-xs text-muted-foreground sm:block">
                                        {formatDate(activity.planned_start)} → {formatDate(activity.planned_end)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {activity.duration_days} d · {activity.progress_pct}%
                                      </span>
                                      <StatusBadge status={activity.status} />
                                      <div className="flex items-center gap-1">
                                        <RecordDialog
                                          title={`Edit activity ${activity.code}`}
                                          fields={activityFields}
                                          submitLabel="Save changes"
                                          initialValues={activity}
                                          onSubmit={(values) =>
                                            updateActivity.mutateAsync({ id: activity.id, values })
                                          }
                                          trigger={<EditButton label={`activity ${activity.code}`} />}
                                        />
                                        <RecordDialog
                                          title={`New milestone in ${activity.code}`}
                                          fields={milestoneFields}
                                          submitLabel="Add milestone"
                                          onSubmit={(values) =>
                                            addMilestone.mutateAsync({ activityId: activity.id, values })
                                          }
                                          trigger={
                                            <Button variant="ghost" size="sm">
                                              <Plus className="size-4" /> Milestone
                                            </Button>
                                          }
                                        />
                                        <DeleteButton
                                          label={`activity ${activity.code}`}
                                          cascadeNote="its milestones"
                                          onConfirm={() => removeActivity.mutateAsync(activity.id)}
                                        />
                                      </div>
                                    </div>

                                    {actExpanded ? (
                                      <div className="border-t border-border/70 px-4 py-3">
                                        <div className="grid gap-3 sm:grid-cols-3">
                                          <DateSpan
                                            label="Planned (from duration)"
                                            start={activity.planned_start}
                                            end={activity.planned_end}
                                          />
                                          <DateSpan
                                            label="Rolled-up dates"
                                            start={actDates.start}
                                            end={actDates.end}
                                          />
                                          <div className="text-xs">
                                            <span className="uppercase tracking-wide text-muted-foreground">
                                              Owner
                                            </span>
                                            <p className="mt-0.5 font-medium">{activity.owner || "—"}</p>
                                          </div>
                                        </div>

                                        <div className="mt-3 flex items-center gap-1">
                                          <ExpandButton
                                            expanded={msExpanded}
                                            onToggle={() => toggle(setOpenMilestones, activity.id, false)}
                                            label={`milestones of ${activity.code}`}
                                          />
                                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Milestones ({activity.milestones.length})
                                          </span>
                                        </div>

                                        {msExpanded ? (
                                          <ul className="mt-2 divide-y divide-border/70 rounded-md border border-border/70">
                                            {activity.milestones.length === 0 ? (
                                              <li className="px-3 py-2 text-xs text-muted-foreground">
                                                No milestones yet.
                                              </li>
                                            ) : (
                                              activity.milestones.map((milestone) => (
                                                <li
                                                  key={milestone.id}
                                                  className="flex flex-wrap items-center gap-3 px-3 py-2"
                                                >
                                                  <Flag className="size-3.5 shrink-0 text-level-milestone" />
                                                  <span className="min-w-[160px] flex-1 truncate text-sm">
                                                    {milestone.name}
                                                  </span>
                                                  {milestone.is_critical ? (
                                                    <Badge variant="destructive" className="text-[10px]">
                                                      Critical
                                                    </Badge>
                                                  ) : null}
                                                  <span className="text-xs text-muted-foreground">
                                                    {formatDate(milestone.actual_date ?? milestone.due_date)}
                                                  </span>
                                                  <StatusBadge status={milestone.status} />
                                                  <div className="flex items-center gap-1">
                                                    <RecordDialog
                                                      title={`Edit ${milestone.name}`}
                                                      fields={milestoneFields}
                                                      submitLabel="Save changes"
                                                      initialValues={milestone}
                                                      onSubmit={(values) =>
                                                        updateMilestone.mutateAsync({ id: milestone.id, values })
                                                      }
                                                      trigger={<EditButton label={milestone.name} />}
                                                    />
                                                    <DeleteButton
                                                      label={milestone.name}
                                                      onConfirm={() => removeMilestone.mutateAsync(milestone.id)}
                                                    />
                                                  </div>
                                                </li>
                                              ))
                                            )}
                                          </ul>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        </TabsContent>

        <TabsContent value="sprints" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Rocket className="size-4 text-primary" />
              <h2 className="text-xl font-semibold tracking-tight">Sprint planning</h2>
            </div>
            <RecordDialog
              title="New sprint"
              description="Plan a sprint with its goal, features, deliverables and dates."
              fields={sprintFields}
              submitLabel="Add sprint"
              onSubmit={(values) => addSprint.mutateAsync(values)}
              trigger={
                <Button>
                  <Plus className="size-4" /> Add sprint
                </Button>
              }
            />
          </div>
          <div className="mt-4">
            {sprints.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sprints…</p>
            ) : sprintList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No sprints yet. Add one to plan features and deliverables over a date window.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {sprintList.map((sprint) => {
                  const expanded = openSprint[sprint.id] ?? false;
                  return (
                    <li key={sprint.id}>
                      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                        <ExpandButton
                          expanded={expanded}
                          onToggle={() => toggle(setOpenSprint, sprint.id, false)}
                          label={sprint.name}
                        />
                        <Rocket className="size-4 shrink-0 text-primary" />
                        <span className="min-w-[160px] flex-1 truncate text-sm font-medium">{sprint.name}</span>
                        <span className="hidden min-w-[160px] flex-1 truncate text-xs text-muted-foreground sm:block">
                          {sprint.goal || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}
                        </span>
                        <StatusBadge status={sprint.status} />
                        <div className="flex items-center gap-1">
                          <RecordDialog
                            title={`Edit ${sprint.name}`}
                            fields={sprintFields}
                            submitLabel="Save changes"
                            initialValues={sprint}
                            onSubmit={(values) => updateSprint.mutateAsync({ id: sprint.id, values })}
                            trigger={<EditButton label={sprint.name} />}
                          />
                          <DeleteButton
                            label={sprint.name}
                            cascadeNote="user stories and test cases"
                            onConfirm={() => removeSprint.mutateAsync(sprint.id)}
                          />
                        </div>
                      </div>

                      {expanded ? (
                        <div className="border-t border-border bg-surface-raised px-4 py-3">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <DateSpan label="Sprint dates" start={sprint.start_date} end={sprint.end_date} />
                            <div className="text-xs">
                              <span className="uppercase tracking-wide text-muted-foreground">Owner</span>
                              <p className="mt-0.5 font-medium">{sprint.owner || "—"}</p>
                            </div>
                            <LineList label="Features" value={sprint.features} />
                            <LineList label="Deliverables" value={sprint.deliverables} />
                          </div>
                          <SprintBacklog sprintId={sprint.id} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </TabsContent>

        <TabsContent value="dev" className="mt-6">
          <DevObjects projectId={projectId} />
        </TabsContent>

        <TabsContent value="rtm" className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Table2 className="size-4 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Requirement traceability matrix</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Every requirement traced through its user story, acceptance criteria and test cases.
          </p>
          <div className="mt-4">
            <TraceabilityMatrix projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <SuccessMetrics projectId={projectId} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
