CREATE TABLE public.dev_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  object_code TEXT NOT NULL,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL DEFAULT 'report',
  module TEXT,
  description TEXT,
  technical_spec TEXT,
  developer TEXT,
  reviewer TEXT,
  complexity TEXT NOT NULL DEFAULT 'medium',
  estimate_hours NUMERIC NOT NULL DEFAULT 0,
  actual_hours NUMERIC NOT NULL DEFAULT 0,
  transport_request TEXT,
  status public.work_status NOT NULL DEFAULT 'not_started',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  planned_start DATE,
  planned_end DATE,
  actual_end DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_objects TO anon, authenticated;
GRANT ALL ON public.dev_objects TO service_role;

ALTER TABLE public.dev_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read dev objects" ON public.dev_objects FOR SELECT USING (true);
CREATE POLICY "Public can insert dev objects" ON public.dev_objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update dev objects" ON public.dev_objects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete dev objects" ON public.dev_objects FOR DELETE USING (true);

CREATE INDEX dev_objects_sprint_idx ON public.dev_objects(sprint_id);