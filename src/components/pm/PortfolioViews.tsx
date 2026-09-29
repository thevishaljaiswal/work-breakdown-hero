import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/pm/StatusBadge";
import { DevTimer } from "@/components/pm/DevTimer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, type DevObject } from "@/lib/pm";

type ProjRef = { id: string; code: string; name: string } | null;

function OwnerFilter({
  owners,
  value,
  onChange,
  label,
}: {
  owners: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="__none">Unassigned</SelectItem>
          {owners.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useOwnerFilter<T>(rows: T[], get: (r: T) => string | null) {
  const [owner, setOwner] = useState("all");
  const owners = useMemo(
    () => [...new Set(rows.map(get).filter((v): v is string => !!v?.trim()))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const filtered = rows.filter((r) => {
    const v = get(r);
    if (owner === "all") return true;
    if (owner === "__none") return !v;
    return v === owner;
  });
  return { owner, setOwner, owners, filtered };
}

function ProjectLink({ project }: { project: ProjRef }) {
  if (!project) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="text-xs font-medium text-accent hover:underline"
    >
      {project.code} · {project.name}
    </Link>
  );
}

function Cell({ label, children, w = "w-28" }: { label: string; children: React.ReactNode; w?: string }) {
  return (
    <div className={`${w} text-xs`}>
      <p className="uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{children}</div>
    </div>
  );
}

function ListShell({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  if (empty)
    return (
      <p className="mt-8 rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Nothing to show for this filter.
      </p>
    );
  return (
    <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {children}
    </ul>
  );
}

export function MilestonesView() {
  const q = useQuery({
    queryKey: ["all-milestones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*, activities(code, name, wbs_items(code, projects(id, code, name)))")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const { owner, setOwner, owners, filtered } = useOwnerFilter(q.data ?? [], (r) => r.owner);
  return (
    <>
      <OwnerFilter label="Owner" owners={owners} value={owner} onChange={setOwner} />
      <ListShell loading={q.isLoading} empty={!filtered.length}>
        {filtered.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <div className="min-w-[220px] flex-1">
              <p className="text-sm font-semibold">
                {m.name} {m.is_critical ? <span className="text-xs text-destructive">· critical</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.activities?.wbs_items?.code} / {m.activities?.code} {m.activities?.name}
              </p>
            </div>
            <Cell label="Project" w="w-48">
              <ProjectLink project={m.activities?.wbs_items?.projects ?? null} />
            </Cell>
            <Cell label="Owner">{m.owner || "—"}</Cell>
            <Cell label="Due">{formatDate(m.due_date)}</Cell>
            <Cell label="Actual">{formatDate(m.actual_date)}</Cell>
            <StatusBadge status={m.status} />
          </li>
        ))}
      </ListShell>
    </>
  );
}

export function UserStoriesView() {
  const q = useQuery({
    queryKey: ["all-user-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stories")
        .select("*, sprints(name, projects(id, code, name))")
        .order("story_code");
      if (error) throw error;
      return data;
    },
  });
  const { owner, setOwner, owners, filtered } = useOwnerFilter(q.data ?? [], (r) => r.assignee);
  return (
    <>
      <OwnerFilter label="Assignee" owners={owners} value={owner} onChange={setOwner} />
      <ListShell loading={q.isLoading} empty={!filtered.length}>
        {filtered.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <span className="w-20 font-mono text-xs text-accent">{s.story_code}</span>
            <div className="min-w-[220px] flex-1">
              <p className="line-clamp-2 text-sm font-medium">{s.story}</p>
              <p className="text-xs text-muted-foreground">{s.backlog_item || "No backlog item"}</p>
            </div>
            <Cell label="Project" w="w-48">
              <ProjectLink project={s.sprints?.projects ?? null} />
            </Cell>
            <Cell label="Sprint">{s.sprints?.name ?? "—"}</Cell>
            <Cell label="Assignee">{s.assignee || "—"}</Cell>
            <Cell label="Points" w="w-16">{s.story_points}</Cell>
            <StatusBadge status={s.status} />
          </li>
        ))}
      </ListShell>
    </>
  );
}

export function DevObjectsView() {
  const q = useQuery({
    queryKey: ["all-dev-objects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dev_objects")
        .select("*, sprints(name, projects(id, code, name))")
        .order("object_code");
      if (error) throw error;
      return data;
    },
  });
  const { owner, setOwner, owners, filtered } = useOwnerFilter(q.data ?? [], (r) => r.developer);
  const est = filtered.reduce((a, o) => a + Number(o.estimate_hours ?? 0), 0);
  const act = filtered.reduce((a, o) => a + Number(o.actual_hours ?? 0), 0);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OwnerFilter label="Developer" owners={owners} value={owner} onChange={setOwner} />
        <p className="text-xs text-muted-foreground">
          Estimate {est.toFixed(2)} h · Actual {act.toFixed(2)} h
        </p>
      </div>
      <ListShell loading={q.isLoading} empty={!filtered.length}>
        {filtered.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <span className="w-20 font-mono text-xs text-accent">{o.object_code}</span>
            <div className="min-w-[200px] flex-1">
              <p className="truncate text-sm font-medium">{o.name}</p>
              <p className="text-xs text-muted-foreground">{o.module || "No module"}</p>
            </div>
            <Cell label="Project" w="w-44">
              <ProjectLink project={o.sprints?.projects ?? null} />
            </Cell>
            <Cell label="Sprint">{o.sprints?.name ?? "—"}</Cell>
            <Cell label="Developer">{o.developer || "—"}</Cell>
            <Cell label="Est / Actual">
              {o.estimate_hours} / {o.actual_hours} h
            </Cell>
            <StatusBadge status={o.status} />
            <DevTimer object={o as DevObject} />
          </li>
        ))}
      </ListShell>
    </>
  );
}
