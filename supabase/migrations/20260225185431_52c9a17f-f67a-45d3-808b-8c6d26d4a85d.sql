
-- Storage bucket for design review attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('review-attachments', 'review-attachments', true);

-- RLS policies for storage
CREATE POLICY "Authenticated users can upload review attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view review attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-attachments');

CREATE POLICY "Users can delete own review attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'review-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table to track attachments with descriptions
CREATE TABLE public.review_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT,
  description TEXT DEFAULT '',
  assumption_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project attachments"
ON public.review_attachments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own attachments"
ON public.review_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
ON public.review_attachments FOR DELETE
USING (auth.uid() = user_id);
