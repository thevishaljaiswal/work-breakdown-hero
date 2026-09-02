import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type WbsItem = Tables<"wbs_items">;
export type Activity = Tables<"activities">;
export type Milestone = Tables<"milestones">;
export type Sprint = Tables<"sprints">;
export type UserStory = Tables<"user_stories">;
export type StoryTask = Tables<"story_tasks">;
export type UserStoryNode = UserStory & { tasks: StoryTask[] };
export type SuccessMetric = Tables<"success_metrics">;

export type TraceabilityRow = {
  id: string;
  story_id: string;
  task_id: string | null;
  requirement_id: string;
  story_code: string;
  story: string;
  acceptance_criteria: string | null;
  test_case_id: string;
  test_scenario: string | null;
  priority: string;
  status: string;
  sprint_name: string;
};

export const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(value: string) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

type Rollup = { start: string | null; end: string | null };

function span(dates: (string | null | undefined)[]): Rollup {
  const valid = dates.filter((d): d is string => Boolean(d)).sort();
  return { start: valid[0] ?? null, end: valid[valid.length - 1] ?? null };
}

export function rollupMilestones(milestones: Milestone[]): Rollup {
  return span(milestones.map((m) => m.actual_date ?? m.due_date));
}

export function mergeSpans(...spans: (Rollup | { start?: string | null; end?: string | null })[]): Rollup {
  return span([...spans.map((s) => s.start), ...spans.map((s) => s.end)]);
}

/** Shape used across the hierarchy tree. */
export type ActivityNode = Activity & { milestones: Milestone[] };
export type WbsNode = WbsItem & { activities: ActivityNode[] };

export async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProjectRollups() {
  const { data, error } = await supabase.from("project_rollup").select("*");
  if (error) throw error;
  return data;
}

export async function fetchSprints(projectId: string) {
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("start_date", { nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function fetchProject(projectId: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSprintBacklog(sprintId: string): Promise<UserStoryNode[]> {
  const { data: stories, error } = await supabase
    .from("user_stories")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("sort_order")
    .order("story_code");
  if (error) throw error;
  if (!stories.length) return [];

  const { data: tasks, error: taskError } = await supabase
    .from("story_tasks")
    .select("*")
    .in("user_story_id", stories.map((s) => s.id))
    .order("sort_order")
    .order("created_at");
  if (taskError) throw taskError;

  return stories.map((s) => ({ ...s, tasks: tasks.filter((t) => t.user_story_id === s.id) }));
}

export async function fetchSuccessMetrics(projectId: string) {
  const { data, error } = await supabase
    .from("success_metrics")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export function priorityLabel(value: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === value)?.label ?? value;
}

export async function fetchTraceability(projectId: string): Promise<TraceabilityRow[]> {
  const sprints = await fetchSprints(projectId);
  if (!sprints.length) return [];

  const { data: stories, error } = await supabase
    .from("user_stories")
    .select("*")
    .in("sprint_id", sprints.map((s) => s.id))
    .order("story_code");
  if (error) throw error;
  if (!stories.length) return [];

  const { data: cases, error: caseError } = await supabase
    .from("story_tasks")
    .select("*")
    .in("user_story_id", stories.map((s) => s.id))
    .order("sort_order")
    .order("created_at");
  if (caseError) throw caseError;

  const sprintName = new Map(sprints.map((s) => [s.id, s.name]));
  const rows: TraceabilityRow[] = [];

  for (const story of stories) {
    const storyCases = cases.filter((c) => c.user_story_id === story.id);
    const base = {
      requirement_id: story.requirement_id || story.story_code,
      story_code: story.story_code,
      story: story.story,
      acceptance_criteria: story.acceptance_criteria,
      sprint_name: sprintName.get(story.sprint_id) ?? "—",
    };
    if (!storyCases.length) {
      rows.push({
        ...base,
        id: story.id,
        story_id: story.id,
        task_id: null,
        test_case_id: "—",
        test_scenario: null,
        priority: "—",
        status: story.status,
      });
      continue;
    }
    for (const testCase of storyCases) {
      rows.push({
        ...base,
        id: testCase.id,
        story_id: story.id,
        task_id: testCase.id,
        test_case_id: testCase.test_case_id || "—",
        test_scenario: testCase.test_scenario || testCase.task,
        priority: testCase.priority,
        status: testCase.status,
      });
    }
  }

  return rows;
}

export async function fetchHierarchy(projectId: string): Promise<WbsNode[]> {
  const { data: wbs, error: wbsError } = await supabase
    .from("wbs_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("code");
  if (wbsError) throw wbsError;
  if (!wbs.length) return [];

  const { data: activities, error: actError } = await supabase
    .from("activities")
    .select("*")
    .in("wbs_id", wbs.map((w) => w.id))
    .order("sort_order")
    .order("code");
  if (actError) throw actError;

  let milestones: Milestone[] = [];
  if (activities.length) {
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .in("activity_id", activities.map((a) => a.id))
      .order("sort_order")
      .order("due_date");
    if (error) throw error;
    milestones = data;
  }

  return wbs.map((w) => ({
    ...w,
    activities: activities
      .filter((a) => a.wbs_id === w.id)
      .map((a) => ({ ...a, milestones: milestones.filter((m) => m.activity_id === a.id) })),
  }));
}

export function activitySpan(activity: ActivityNode): Rollup {
  return mergeSpans(
    { start: activity.planned_start, end: activity.planned_end },
    rollupMilestones(activity.milestones),
  );
}

export function wbsSpan(wbs: WbsNode): Rollup {
  return mergeSpans(
    { start: wbs.planned_start, end: wbs.planned_end },
    ...wbs.activities.map(activitySpan),
  );
}

export function projectSpan(project: Project | null, wbs: WbsNode[]): Rollup {
  return mergeSpans(
    { start: project?.planned_start, end: project?.planned_end },
    ...wbs.map(wbsSpan),
  );
}