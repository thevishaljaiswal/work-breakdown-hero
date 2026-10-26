CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  title text NOT NULL,
  category text NOT NULL,
  sub_category text NOT NULL,
  doc_url text,
  owner text,
  version text NOT NULL DEFAULT '1.0',
  status work_status NOT NULL DEFAULT 'not_started',
  remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO anon, authenticated;
GRANT ALL ON public.project_documents TO service_role;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read documents" ON public.project_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public write documents" ON public.project_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update documents" ON public.project_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete documents" ON public.project_documents FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_project_documents_project ON public.project_documents (project_id);

CREATE TRIGGER trg_project_documents_touch BEFORE UPDATE ON public.project_documents FOR EACH ROW EXECUTE FUNCTION touch_updated_at();