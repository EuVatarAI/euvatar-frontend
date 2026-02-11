-- Allow admins to view all avatar session records
CREATE POLICY "Admins can view all avatar sessions"
ON public.avatar_sessions
FOR SELECT
USING (is_admin(auth.uid()));
