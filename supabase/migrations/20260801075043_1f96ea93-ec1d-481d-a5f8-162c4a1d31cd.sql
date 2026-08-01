CREATE TABLE public.sprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  features text,
  deliverables text,
  owner text,
  status work_status NOT NULL DEFAULT 'not_started'::work_status,
  start_date date,
  end_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO anon, authenticated;
GRANT ALL ON public.sprints TO service_role;

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sprints" ON public.sprints FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write sprints" ON public.sprints FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update sprints" ON public.sprints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete sprints" ON public.sprints FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER touch_sprints_updated_at BEFORE UPDATE ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX sprints_project_id_idx ON public.sprints(project_id);