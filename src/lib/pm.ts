import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type WbsItem = Tables<"wbs_items">;
export type Activity = Tables<"activities">;
export type Milestone = Tables<"milestones">;
export type Sprint = Tables<"sprints">;
export type UserStory = Tables<"user_stories">;
export type StoryTask = Tables<"story_tasks">;
export type StoryRequirement = Tables<"story_requirements">;
export type UserStoryNode = UserStory & { tasks: StoryTask[]; requirements: StoryRequirement[] };
export type SuccessMetric = Tables<"success_metrics">;
export type DevObject = Tables<"dev_objects">;

export const DEV_OBJECT_TYPE_OPTIONS = [
  { value: "report", label: "Report" },
  { value: "interface", label: "Interface" },
  { value: "conversion", label: "Conversion / migration" },
  { value: "enhancement", label: "Enhancement" },
  { value: "form", label: "Form" },
  { value: "workflow", label: "Workflow" },
  { value: "api", label: "API / service" },
  { value: "ui", label: "UI screen" },
  { value: "database", label: "Database object" },
  { value: "other", label: "Other" },
];

export const COMPLEXITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very high" },
];

export function devObjectTypeLabel(value: string) {
  return DEV_OBJECT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function complexityLabel(value: string) {
  return COMPLEXITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export type TraceabilityRow = {
  id: string;
  story_id: string;
  task_id: string | null;
  requirement_row_id: string | null;
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

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Next working day at or after the given date. */
function nextWorkday(date: Date, direction: 1 | -1) {
  while (isWeekend(date)) date.setDate(date.getDate() + direction);
  return date;
}

/** Adds (duration - 1) working days, skipping Saturdays and Sundays. */
function shiftWorkdays(value: string, duration: number, direction: 1 | -1) {
  const date = nextWorkday(new Date(`${value}T00:00:00`), direction);
  let remaining = duration - 1;
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    if (!isWeekend(date)) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Planned dates for an activity derived from its duration in working days.
 * Duration is inclusive and skips weekends: a 5-day activity starting Monday finishes Friday.
 */
export function derivePlannedDates(input: {
  planned_start?: string | null;
  planned_end?: string | null;
  duration_days?: number | null;
}) {
  const duration = Number(input.duration_days ?? 0);
  const start = input.planned_start || null;
  const end = input.planned_end || null;
  if (duration > 0 && start)
    return { planned_start: shiftWorkdays(start, 1, 1), planned_end: shiftWorkdays(start, duration, 1) };
  if (duration > 0 && end)
    return { planned_start: shiftWorkdays(end, duration, -1), planned_end: shiftWorkdays(end, 1, -1) };
  return { planned_start: start, planned_end: end };
}


/** Cascading deletes — child rows are removed first so foreign keys stay valid. */
export async function deleteMilestone(id: string) {
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteActivity(id: string) {
  const { error: msError } = await supabase.from("milestones").delete().eq("activity_id", id);
  if (msError) throw msError;
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteWbs(id: string) {
  const { data: activities, error: actError } = await supabase
    .from("activities")
    .select("id")
    .eq("wbs_id", id);
  if (actError) throw actError;
  for (const activity of activities ?? []) await deleteActivity(activity.id);
  const { error } = await supabase.from("wbs_items").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTestCase(id: string) {
  const { error } = await supabase.from("story_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from("story_requirements").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteUserStory(id: string) {
  const { error: taskError } = await supabase.from("story_tasks").delete().eq("user_story_id", id);
  if (taskError) throw taskError;
  const { error: reqError } = await supabase
    .from("story_requirements")
    .delete()
    .eq("user_story_id", id);
  if (reqError) throw reqError;
  const { error } = await supabase.from("user_stories").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteSprint(id: string) {
  const { data: stories, error: storyError } = await supabase
    .from("user_stories")
    .select("id")
    .eq("sprint_id", id);
  if (storyError) throw storyError;
  for (const story of stories ?? []) await deleteUserStory(story.id);
  const { error } = await supabase.from("sprints").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDevObjects(sprintIds: string[]): Promise<DevObject[]> {
  if (!sprintIds.length) return [];
  const { data, error } = await supabase
    .from("dev_objects")
    .select("*")
    .in("sprint_id", sprintIds)
    .order("sort_order")
    .order("object_code");
  if (error) throw error;
  return data;
}

export async function deleteDevObject(id: string) {
  const { error } = await supabase.from("dev_objects").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteSuccessMetric(id: string) {
  const { error } = await supabase.from("success_metrics").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { data: wbs, error: wbsError } = await supabase
    .from("wbs_items")
    .select("id")
    .eq("project_id", id);
  if (wbsError) throw wbsError;
  for (const item of wbs ?? []) await deleteWbs(item.id);

  const { data: sprints, error: sprintError } = await supabase
    .from("sprints")
    .select("id")
    .eq("project_id", id);
  if (sprintError) throw sprintError;
  for (const sprint of sprints ?? []) await deleteSprint(sprint.id);

  const { error: metricError } = await supabase.from("success_metrics").delete().eq("project_id", id);
  if (metricError) throw metricError;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
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

  const { data: requirements, error: reqError } = await supabase
    .from("story_requirements")
    .select("*")
    .in("user_story_id", stories.map((s) => s.id))
    .order("sort_order")
    .order("requirement_id");
  if (reqError) throw reqError;

  return stories.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.user_story_id === s.id),
    requirements: requirements.filter((r) => r.user_story_id === s.id),
  }));
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

  const { data: requirements, error: reqError } = await supabase
    .from("story_requirements")
    .select("*")
    .in("user_story_id", stories.map((s) => s.id))
    .order("sort_order")
    .order("requirement_id");
  if (reqError) throw reqError;

  const sprintName = new Map(sprints.map((s) => [s.id, s.name]));
  const rows: TraceabilityRow[] = [];

  for (const story of stories) {
    const storyCases = cases.filter((c) => c.user_story_id === story.id);
    const storyReqs = requirements.filter((r) => r.user_story_id === story.id);
    const reqList = storyReqs.length
      ? storyReqs
      : [null as null | (typeof requirements)[number]];

    for (const requirement of reqList) {
      const base = {
        story_code: story.story_code,
        story: story.story,
        sprint_name: sprintName.get(story.sprint_id) ?? "—",
        requirement_row_id: requirement?.id ?? null,
        requirement_id: requirement?.requirement_id || story.story_code,
        acceptance_criteria: requirement?.acceptance_criteria ?? story.acceptance_criteria,
        priority: requirement?.priority ?? "—",
      };
      if (!storyCases.length) {
        rows.push({
          ...base,
          id: requirement?.id ?? story.id,
          story_id: story.id,
          task_id: null,
          test_case_id: "—",
          test_scenario: null,
          status: requirement?.status ?? story.status,
        });
        continue;
      }
      for (const testCase of storyCases) {
        rows.push({
          ...base,
          id: `${requirement?.id ?? story.id}:${testCase.id}`,
          story_id: story.id,
          task_id: testCase.id,
          test_case_id: testCase.test_case_id || "—",
          test_scenario: testCase.test_scenario || testCase.task,
          status: testCase.status,
        });
      }
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