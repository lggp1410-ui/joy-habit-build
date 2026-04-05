
-- Create icons storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('icons', 'icons', true);

-- Create icons table to store metadata
CREATE TABLE public.icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Allow anyone to read icons (public data)
ALTER TABLE public.icons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read icons"
  ON public.icons FOR SELECT
  TO anon, authenticated
  USING (true);

-- Storage: allow anyone to read icon files
CREATE POLICY "Public read icons"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'icons');

-- Storage: allow service role to insert (edge function uses service role)
CREATE POLICY "Service role insert icons"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'icons');
