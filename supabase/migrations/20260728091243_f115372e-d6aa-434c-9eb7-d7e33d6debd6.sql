CREATE TYPE public.work_status AS ENUM ('not_started','in_progress','on_hold','completed','cancelled');
CREATE TYPE public.priority_level AS ENUM ('low','medium','high','critical');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  client text,
  manager text,
  status public.work_status NOT NULL DEFAULT 'not_started',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  budget numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  planned_start date,
  planned_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write projects" ON public.projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete projects" ON public.projects FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.wbs_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  owner text,
  status public.work_status NOT NULL DEFAULT 'not_started',
  weight numeric(6,2) NOT NULL DEFAULT 0,
  budget numeric(14,2) NOT NULL DEFAULT 0,
  planned_start date,
  planned_end date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);
CREATE INDEX idx_wbs_project ON public.wbs_items(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wbs_items TO anon, authenticated;
GRANT ALL ON public.wbs_items TO service_role;
ALTER TABLE public.wbs_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wbs" ON public.wbs_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write wbs" ON public.wbs_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update wbs" ON public.wbs_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete wbs" ON public.wbs_items FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wbs_id uuid NOT NULL REFERENCES public.wbs_items(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  owner text,
  status public.work_status NOT NULL DEFAULT 'not_started',
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  duration_days integer NOT NULL DEFAULT 0,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wbs_id, code)
);
CREATE INDEX idx_activity_wbs ON public.activities(wbs_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activities" ON public.activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write activities" ON public.activities FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update activities" ON public.activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete activities" ON public.activities FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  owner text,
  status public.work_status NOT NULL DEFAULT 'not_started',
  is_critical boolean NOT NULL DEFAULT false,
  due_date date,
  actual_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestone_activity ON public.milestones(activity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO anon, authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read milestones" ON public.milestones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write milestones" ON public.milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update milestones" ON public.milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete milestones" ON public.milestones FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_wbs_touch BEFORE UPDATE ON public.wbs_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_activities_touch BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_milestones_touch BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE VIEW public.activity_rollup WITH (security_invoker = true) AS
SELECT a.id AS activity_id,
       a.wbs_id,
       LEAST(a.planned_start, MIN(COALESCE(m.actual_date, m.due_date))) AS rollup_start,
       GREATEST(a.planned_end, MAX(COALESCE(m.actual_date, m.due_date))) AS rollup_end,
       COUNT(m.id) AS milestone_count
FROM public.activities a
LEFT JOIN public.milestones m ON m.activity_id = a.id
GROUP BY a.id, a.wbs_id, a.planned_start, a.planned_end;

CREATE VIEW public.wbs_rollup WITH (security_invoker = true) AS
SELECT w.id AS wbs_id,
       w.project_id,
       LEAST(w.planned_start, MIN(ar.rollup_start)) AS rollup_start,
       GREATEST(w.planned_end, MAX(ar.rollup_end)) AS rollup_end,
       COUNT(ar.activity_id) AS activity_count
FROM public.wbs_items w
LEFT JOIN public.activity_rollup ar ON ar.wbs_id = w.id
GROUP BY w.id, w.project_id, w.planned_start, w.planned_end;

CREATE VIEW public.project_rollup WITH (security_invoker = true) AS
SELECT p.id AS project_id,
       LEAST(p.planned_start, MIN(wr.rollup_start)) AS rollup_start,
       GREATEST(p.planned_end, MAX(wr.rollup_end)) AS rollup_end,
       COUNT(wr.wbs_id) AS wbs_count
FROM public.projects p
LEFT JOIN public.wbs_rollup wr ON wr.project_id = p.id
GROUP BY p.id, p.planned_start, p.planned_end;

GRANT SELECT ON public.activity_rollup, public.wbs_rollup, public.project_rollup TO anon, authenticated, service_role;