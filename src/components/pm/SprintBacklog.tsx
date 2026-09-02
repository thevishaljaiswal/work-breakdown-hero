import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { STATUS_OPTIONS, fetchSprintBacklog, statusLabel } from "@/lib/pm";

const storyFields: FieldSpec[] = [
  { name: "requirement_id", label: "Requirement ID", type: "text", placeholder: "REQ-01", span: "half" },
  { name: "story_code", label: "User Story ID", type: "text", required: true, placeholder: "US-01", span: "half" },
  { name: "backlog_item", label: "Backlog Item (Feature / PBI)", type: "text", span: "half" },
  { name: "story", label: "User Story", type: "textarea", required: true, placeholder: "As a <role> I want <goal> so that <benefit>" },
  { name: "acceptance_criteria", label: "Acceptance Criteria (story)", type: "textarea", placeholder: "One criterion per line" },
  { name: "assignee", label: "Assignee", type: "text", span: "half" },
  { name: "story_points", label: "Story Points", type: "number", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
];

const testCaseFields: FieldSpec[] = [
  { name: "test_case_id", label: "Test Case ID", type: "text", required: true, placeholder: "TC-01", span: "half" },
  { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, defaultValue: "medium", span: "half" },
  { name: "task", label: "Test case title", type: "text", required: true },
  { name: "test_scenario", label: "Test Scenario", type: "textarea", placeholder: "Steps / scenario under test" },
  { name: "assignee", label: "Assignee (tester)", type: "text", span: "half" },
  { name: "estimate_hours", label: "Estimate (hours)", type: "number", span: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "not_started", span: "half" },
  { name: "acceptance_criteria", label: "Expected result / acceptance criteria", type: "textarea" },
];

export function SprintBacklog({ sprintId }: { sprintId: string }) {
  const queryClient = useQueryClient();
  const backlog = useQuery({
    queryKey: ["sprint-backlog", sprintId],
    queryFn: () => fetchSprintBacklog(sprintId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sprint-backlog", sprintId] });

  const addStory = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("user_stories").insert({
        sprint_id: sprintId,
        story_code: values.story_code,
        story: values.story,
        acceptance_criteria: values.acceptance_criteria || null,
        backlog_item: values.backlog_item || null,
        assignee: values.assignee || null,
        story_points: values.story_points ? Number(values.story_points) : 0,
        status: (values.status || "not_started") as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User story added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addTask = useMutation({
    mutationFn: async ({ storyId, values }: { storyId: string; values: Record<string, string> }) => {
      const { error } = await supabase.from("story_tasks").insert({
        user_story_id: storyId,
        task: values.task,
        assignee: values.assignee || null,
        estimate_hours: values.estimate_hours ? Number(values.estimate_hours) : 0,
        acceptance_criteria: values.acceptance_criteria || null,
        status: (values.status || "not_started") as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateStory = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("user_stories")
        .update({
          story_code: values.story_code,
          story: values.story,
          acceptance_criteria: values.acceptance_criteria || null,
          backlog_item: values.backlog_item || null,
          assignee: values.assignee || null,
          story_points: values.story_points ? Number(values.story_points) : 0,
          status: (values.status || "not_started") as never,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User story updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("story_tasks")
        .update({
          task: values.task,
          assignee: values.assignee || null,
          estimate_hours: values.estimate_hours ? Number(values.estimate_hours) : 0,
          acceptance_criteria: values.acceptance_criteria || null,
          status: (values.status || "not_started") as never,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stories = backlog.data ?? [];
  const totalPoints = stories.reduce((sum, s) => sum + (s.story_points ?? 0), 0);
  const totalHours = stories.reduce(
    (sum, s) => sum + s.tasks.reduce((h, t) => h + Number(t.estimate_hours ?? 0), 0),
    0,
  );

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Sprint backlog · {stories.length} stories · {totalPoints} pts · {totalHours} h
        </p>
        <RecordDialog
          title="New user story"
          description="Add a user story to this sprint backlog."
          fields={storyFields}
          submitLabel="Add user story"
          onSubmit={(values) => addStory.mutateAsync(values)}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="size-4" /> User story
            </Button>
          }
        />
      </div>

      {backlog.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading backlog…</p>
      ) : stories.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No user stories yet. Add one with its acceptance criteria, points and tasks.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {stories.map((story) => (
            <div key={story.id} className="rounded-md bg-surface-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-primary">{story.story_code}</span>
                    {story.backlog_item ? (
                      <Badge variant="outline" className="text-xs">
                        {story.backlog_item}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">
                      {statusLabel(story.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{story.story}</p>
                  {story.acceptance_criteria ? (
                    <div className="mt-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Acceptance criteria
                      </span>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">
                        {story.acceptance_criteria}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Assignee: {story.assignee || "—"} · {story.story_points} story points
                  </p>
                </div>
                <div className="flex items-center gap-1">
                <RecordDialog
                  title={`Edit ${story.story_code}`}
                  fields={storyFields}
                  submitLabel="Save changes"
                  initialValues={story}
                  onSubmit={(values) => updateStory.mutateAsync({ id: story.id, values })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${story.story_code}`} className="size-8">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <RecordDialog
                  title={`New task in ${story.story_code}`}
                  fields={taskFields}
                  submitLabel="Add task"
                  onSubmit={(values) => addTask.mutateAsync({ storyId: story.id, values })}
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Plus className="size-4" /> Task
                    </Button>
                  }
                />
                </div>
              </div>

              {story.tasks.length > 0 ? (
                <div className="mt-3 overflow-x-auto border-t border-border pt-3">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">Task</th>
                        <th className="pb-2 pr-3 font-medium">Assignee</th>
                        <th className="pb-2 pr-3 font-medium">Est. (h)</th>
                        <th className="pb-2 pr-3 font-medium">Status</th>
                        <th className="pb-2 pr-3 font-medium">Acceptance criteria</th>
                        <th className="pb-2 font-medium sr-only">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {story.tasks.map((task) => (
                        <tr key={task.id} className="border-t border-border/60 align-top">
                          <td className="py-2 pr-3">{task.task}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{task.assignee || "—"}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{Number(task.estimate_hours)}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{statusLabel(task.status)}</td>
                          <td className="py-2 pr-3 whitespace-pre-line text-muted-foreground">
                            {task.acceptance_criteria || "—"}
                          </td>
                          <td className="py-2 text-right">
                            <RecordDialog
                              title={`Edit task`}
                              fields={taskFields}
                              submitLabel="Save changes"
                              initialValues={task}
                              onSubmit={(values) => updateTask.mutateAsync({ id: task.id, values })}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="Edit task" className="size-8">
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}