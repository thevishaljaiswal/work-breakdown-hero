import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type WbsItem = Tables<"wbs_items">;
export type Activity = Tables<"activities">;
export type Milestone = Tables<"milestones">;

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

export async function fetchProject(projectId: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  return data;
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