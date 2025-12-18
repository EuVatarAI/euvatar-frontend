-- Allow public read access to avatar_buttons for the public euvatar page
CREATE POLICY "Public can view enabled buttons"
ON public.avatar_buttons FOR SELECT
TO anon
USING (enabled = true);

-- Allow public read access to avatars basic info for the public page
CREATE POLICY "Public can view avatars basic info"
ON public.avatars FOR SELECT
TO anon
USING (true);