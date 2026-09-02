import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordDialog, type FieldSpec } from "@/components/pm/RecordDialog";
import { DeleteButton } from "@/components/pm/DeleteButton";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  deleteTestCase,
  deleteUserStory,
  fetchSprintBacklog,
  priorityLabel,
  statusLabel,
} from "@/lib/pm";

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

function Chevron({ expanded }: { expanded: boolean }) {
  return expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />;
}

export function SprintBacklog({ sprintId }: { sprintId: string }) {
  const queryClient = useQueryClient();
  const [openStories, setOpenStories] = useState<Record<string, boolean>>({});
  const backlog = useQuery({
    queryKey: ["sprint-backlog", sprintId],
    queryFn: () => fetchSprintBacklog(sprintId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sprint-backlog", sprintId] });
    queryClient.invalidateQueries({ queryKey: ["traceability"] });
  };

  const addStory = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("user_stories").insert({
        sprint_id: sprintId,
        story_code: values.story_code,
        story: values.story,
        acceptance_criteria: values.acceptance_criteria || null,
        backlog_item: values.backlog_item || null,
        requirement_id: values.requirement_id || null,
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
        test_case_id: values.test_case_id || null,
        test_scenario: values.test_scenario || null,
        priority: (values.priority || "medium") as never,
        assignee: values.assignee || null,
        estimate_hours: values.estimate_hours ? Number(values.estimate_hours) : 0,
        acceptance_criteria: values.acceptance_criteria || null,
        status: (values.status || "not_started") as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test case added");
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
          requirement_id: values.requirement_id || null,
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
          test_case_id: values.test_case_id || null,
          test_scenario: values.test_scenario || null,
          priority: (values.priority || "medium") as never,
          assignee: values.assignee || null,
          estimate_hours: values.estimate_hours ? Number(values.estimate_hours) : 0,
          acceptance_criteria: values.acceptance_criteria || null,
          status: (values.status || "not_started") as never,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test case updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeStory = useMutation({
    mutationFn: (id: string) => deleteUserStory(id),
    onSuccess: () => {
      toast.success("User story deleted");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTask = useMutation({
    mutationFn: (id: string) => deleteTestCase(id),
    onSuccess: () => {
      toast.success("Test case deleted");
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
          No user stories yet. Add one with its acceptance criteria, points and test cases.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
          {stories.map((story) => {
            const expanded = openStories[story.id] ?? false;
            return (
              <li key={story.id}>
                <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${story.story_code}`}
                    onClick={() => setOpenStories((s) => ({ ...s, [story.id]: !expanded }))}
                  >
                    <Chevron expanded={expanded} />
                  </Button>
                  <span className="w-20 shrink-0 font-mono text-xs text-primary">{story.story_code}</span>
                  <span className="min-w-[200px] flex-1 truncate text-sm">{story.story}</span>
                  <span className="text-xs text-muted-foreground">{story.tasks.length} test cases</span>
                  <span className="text-xs text-muted-foreground">{story.story_points} pts</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {statusLabel(story.status)}
                  </Badge>
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
                      title={`New test case in ${story.story_code}`}
                      fields={testCaseFields}
                      submitLabel="Add test case"
                      onSubmit={(values) => addTask.mutateAsync({ storyId: story.id, values })}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Plus className="size-4" /> Test case
                        </Button>
                      }
                    />
                    <DeleteButton
                      label={story.story_code}
                      cascadeNote="its test cases"
                      onConfirm={() => removeStory.mutateAsync(story.id)}
                    />
                  </div>
                </div>

                {expanded ? (
                  <div className="border-t border-border bg-surface-raised px-4 py-3">
                    <div className="flex flex-wrap gap-6 text-xs">
                      {story.requirement_id ? (
                        <span className="text-muted-foreground">
                          Requirement: <span className="text-foreground">{story.requirement_id}</span>
                        </span>
                      ) : null}
                      {story.backlog_item ? (
                        <span className="text-muted-foreground">
                          Backlog item: <span className="text-foreground">{story.backlog_item}</span>
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        Assignee: <span className="text-foreground">{story.assignee || "—"}</span>
                      </span>
                    </div>
                    {story.acceptance_criteria ? (
                      <div className="mt-2 text-xs">
                        <span className="uppercase tracking-wide text-muted-foreground">
                          Acceptance criteria
                        </span>
                        <p className="whitespace-pre-line text-sm text-muted-foreground">
                          {story.acceptance_criteria}
                        </p>
                      </div>
                    ) : null}

                    <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                      Test cases ({story.tasks.length})
                    </p>
                    {story.tasks.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        No test cases yet — add one with its test case ID, scenario and priority.
                      </p>
                    ) : (
                      <ul className="mt-1 divide-y divide-border/70 rounded-md border border-border/70 bg-card">
                        {story.tasks.map((task) => (
                          <li key={task.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                            <span className="w-20 shrink-0 font-mono text-xs text-primary">
                              {task.test_case_id || "TC-—"}
                            </span>
                            <span className="min-w-[180px] flex-1 truncate text-sm">{task.task}</span>
                            <span className="hidden min-w-[160px] flex-1 truncate text-xs text-muted-foreground sm:block">
                              {task.test_scenario || "—"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {priorityLabel(task.priority)}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {statusLabel(task.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Number(task.estimate_hours)} h
                            </span>
                            <div className="flex items-center gap-1">
                              <RecordDialog
                                title={`Edit ${task.test_case_id || "test case"}`}
                                fields={testCaseFields}
                                submitLabel="Save changes"
                                initialValues={task}
                                onSubmit={(values) => updateTask.mutateAsync({ id: task.id, values })}
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="Edit test case" className="size-8">
                                    <Pencil className="size-4" />
                                  </Button>
                                }
                              />
                              <DeleteButton
                                label={task.test_case_id || "test case"}
                                onConfirm={() => removeTask.mutateAsync(task.id)}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
