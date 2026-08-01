CREATE TABLE public.user_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  story_code text NOT NULL,
  story text NOT NULL,
  acceptance_criteria text,
  backlog_item text,
  assignee text,
  story_points integer NOT NULL DEFAULT 0,
  status work_status NOT NULL DEFAULT 'not_started'::work_status,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stories TO anon, authenticated;
GRANT ALL ON public.user_stories TO service_role;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user_stories" ON public.user_stories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write user_stories" ON public.user_stories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update user_stories" ON public.user_stories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete user_stories" ON public.user_stories FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER touch_user_stories BEFORE UPDATE ON public.user_stories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX user_stories_sprint_id_idx ON public.user_stories(sprint_id);

CREATE TABLE public.story_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  task text NOT NULL,
  assignee text,
  estimate_hours numeric NOT NULL DEFAULT 0,
  acceptance_criteria text,
  status work_status NOT NULL DEFAULT 'not_started'::work_status,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_tasks TO anon, authenticated;
GRANT ALL ON public.story_tasks TO service_role;
ALTER TABLE public.story_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read story_tasks" ON public.story_tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write story_tasks" ON public.story_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update story_tasks" ON public.story_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete story_tasks" ON public.story_tasks FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER touch_story_tasks BEFORE UPDATE ON public.story_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX story_tasks_user_story_id_idx ON public.story_tasks(user_story_id);