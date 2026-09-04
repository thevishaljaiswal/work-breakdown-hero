CREATE TABLE public.story_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  requirement_id text NOT NULL,
  description text,
  acceptance_criteria text,
  priority priority_level NOT NULL DEFAULT 'medium',
  status work_status NOT NULL DEFAULT 'not_started',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_requirements TO anon, authenticated;
GRANT ALL ON public.story_requirements TO service_role;

ALTER TABLE public.story_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read story requirements" ON public.story_requirements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write story requirements" ON public.story_requirements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update story requirements" ON public.story_requirements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete story requirements" ON public.story_requirements FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER touch_story_requirements BEFORE UPDATE ON public.story_requirements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX story_requirements_story_idx ON public.story_requirements(user_story_id);