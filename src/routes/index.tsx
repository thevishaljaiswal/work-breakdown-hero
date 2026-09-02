import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderTree, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  fetchProjectRollups,
  fetchProjects,
  formatDate,
  statusLabel,
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

      {projects.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.data?.length ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {projects.data.map((project) => {
            const rollup = rollups.data?.find((r) => r.project_id === project.id);
            return (
              <li key={project.id} className="relative">
                <div className="absolute right-4 top-4 z-10">
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
                </div>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="group block h-full rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-accent">{project.code}</p>
                      <h2 className="mt-1 text-lg font-semibold">{project.name}</h2>
                    </div>
                    <Badge variant="secondary" className="mr-10">
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                  {project.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                  ) : null}
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rolled-up start</dt>
                      <dd className="mt-1 font-medium">{formatDate(rollup?.rollup_start)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rolled-up finish</dt>
                      <dd className="mt-1 font-medium">{formatDate(rollup?.rollup_end)}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                    {rollup?.wbs_count ?? 0} WBS elements
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-12 rounded-lg border border-dashed border-border p-16 text-center">
          <FolderTree className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No projects yet. Create your first project to start building the hierarchy.
          </p>
        </div>
      )}
    </main>
  );
}
