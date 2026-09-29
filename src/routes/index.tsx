import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderTree, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { DeleteButton } from "@/components/pm/DeleteButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevObjectsView, MilestonesView, UserStoriesView } from "@/components/pm/PortfolioViews";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  deleteProject,
  fetchProjectRollups,
  fetchProjects,
  formatDate,
} from "@/lib/pm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Hierarchy — WBS, Activities & Milestones" },
      {
        name: "description",
        content:
          "Plan projects as a structured hierarchy: work breakdown structures, activities and milestones with dates that roll up to every parent level.",
      },
      { property: "og:title", content: "Project Hierarchy — WBS, Activities & Milestones" },
      {
        property: "og:description",
        content: "Structure projects into WBS, activities and milestones with automatic date roll-up.",
      },
    ],
  }),
  component: ProjectsPage,
});

const PROJECT_FIELDS: FieldSpec[] = [
  { name: "code", label: "Project code", type: "text", required: true, placeholder: "PRJ-001", span: "half" },
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

function ProjectsPage() {
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const rollups = useQuery({ queryKey: ["project-rollups"], queryFn: fetchProjectRollups });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const visibleProjects = useMemo(
    () =>
      (projects.data ?? []).filter((p) => statusFilter === "all" || p.status === statusFilter),
    [projects.data, statusFilter],
  );

  const statusCount = (value: string) =>
    (projects.data ?? []).filter((p) => value === "all" || p.status === value).length;

  const createProject = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("projects").insert({
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
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project created");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-rollups"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("projects")
        .update({
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
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project updated");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-rollups"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeProject = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-rollups"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Portfolio</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Project hierarchy</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Every project breaks down into a WBS, each WBS into activities, and each activity into
            milestones. Dates roll up from milestones all the way to the project.
          </p>
        </div>
        <RecordDialog
          title="New project"
          description="Top level of the hierarchy."
          fields={PROJECT_FIELDS}
          submitLabel="Create project"
          onSubmit={(values) => createProject.mutateAsync(values)}
          trigger={
            <Button>
              <Plus className="size-4" /> New project
            </Button>
          }
        />
      </header>

      <Tabs defaultValue="projects" className="mt-6">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="stories">User stories</TabsTrigger>
          <TabsTrigger value="dev">Development objects</TabsTrigger>
        </TabsList>
        <TabsContent value="milestones"><MilestonesView /></TabsContent>
        <TabsContent value="stories"><UserStoriesView /></TabsContent>
        <TabsContent value="dev"><DevObjectsView /></TabsContent>
        <TabsContent value="projects">
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Filter by status</span>
        {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((option) => {
          const active = statusFilter === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
              <span className="ml-1 text-xs opacity-70">{statusCount(option.value)}</span>
            </Button>
          );
        })}
      </div>

      {projects.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading projects…</p>
      ) : visibleProjects.length ? (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {visibleProjects.map((project) => {
            const rollup = rollups.data?.find((r) => r.project_id === project.id);
            return (
              <li
                key={project.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="group flex min-w-0 flex-1 flex-wrap items-center gap-4"
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="font-mono text-xs text-accent">{project.code}</p>
                    <h2 className="mt-0.5 truncate text-base font-semibold">{project.name}</h2>
                    {project.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="w-28 text-xs">
                    <p className="uppercase tracking-wide text-muted-foreground">Start</p>
                    <p className="mt-0.5 font-medium">{formatDate(rollup?.rollup_start)}</p>
                  </div>
                  <div className="w-28 text-xs">
                    <p className="uppercase tracking-wide text-muted-foreground">Finish</p>
                    <p className="mt-0.5 font-medium">{formatDate(rollup?.rollup_end)}</p>
                  </div>
                  <div className="w-24 text-xs">
                    <p className="uppercase tracking-wide text-muted-foreground">WBS</p>
                    <p className="mt-0.5 font-medium">{rollup?.wbs_count ?? 0}</p>
                  </div>
                  <StatusBadge status={project.status} />
                  <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
                <RecordDialog
                  title={`Edit ${project.code}`}
                  description="Update this project's details."
                  fields={PROJECT_FIELDS}
                  submitLabel="Save changes"
                  initialValues={project}
                  onSubmit={(values) => updateProject.mutateAsync({ id: project.id, values })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${project.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <DeleteButton
                  label={project.name}
                  cascadeNote="WBS, activities, milestones, sprints and KPIs"
                  onConfirm={() => removeProject.mutateAsync(project.id)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-12 rounded-lg border border-dashed border-border p-16 text-center">
          <FolderTree className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            {projects.data?.length
              ? "No projects match this status filter."
              : "No projects yet. Create your first project to start building the hierarchy."}
          </p>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
