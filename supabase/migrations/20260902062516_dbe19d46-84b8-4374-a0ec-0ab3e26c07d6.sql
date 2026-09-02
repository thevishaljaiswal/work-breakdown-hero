ALTER TABLE public.story_tasks
  ADD COLUMN IF NOT EXISTS test_case_id text,
  ADD COLUMN IF NOT EXISTS test_scenario text,
  ADD COLUMN IF NOT EXISTS priority priority_level NOT NULL DEFAULT 'medium'::priority_level;

ALTER TABLE public.user_stories
  ADD COLUMN IF NOT EXISTS requirement_id text;

CREATE TABLE public.success_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kpi text NOT NULL,
  target text NOT NULL,
  actual text,
  category text,
  owner text,
  status work_status NOT NULL DEFAULT 'not_started'::work_status,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.success_metrics TO anon, authenticated;
GRANT ALL ON public.success_metrics TO service_role;

ALTER TABLE public.success_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read success metrics" ON public.success_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write success metrics" ON public.success_metrics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update success metrics" ON public.success_metrics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete success metrics" ON public.success_metrics FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER touch_success_metrics BEFORE UPDATE ON public.success_metrics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();