-- Allow public access to avatar_ads (for public avatar pages)
CREATE POLICY "Public can view avatar ads" 
ON public.avatar_ads 
FOR SELECT 
USING (true);