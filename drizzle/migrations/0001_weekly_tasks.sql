CREATE TABLE public.weekly_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL,
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  due_date date,
  priority priority_level NOT NULL DEFAULT 'medium',
  status work_status NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_tasks TO anon, authenticated;
GRANT ALL ON public.weekly_tasks TO service_role;
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read weekly tasks" ON public.weekly_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write weekly tasks" ON public.weekly_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update weekly tasks" ON public.weekly_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete weekly tasks" ON public.weekly_tasks FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX weekly_tasks_week_idx ON public.weekly_tasks(week_start, owner);
CREATE TRIGGER trg_weekly_tasks_touch BEFORE UPDATE ON public.weekly_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();