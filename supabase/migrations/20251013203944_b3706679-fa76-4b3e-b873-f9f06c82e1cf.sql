-- Create storage bucket for avatar media
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar-media', 'avatar-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatar-media bucket
CREATE POLICY "Users can upload media for their avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatar-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatar media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatar-media');

CREATE POLICY "Users can delete their own avatar media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatar-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatar-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);