-- Enable RLS on legacy public tables that were exposed via PostgREST
ALTER TABLE public.training_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Training docs: restrict access to docs linked to avatars owned by the current user
CREATE POLICY "Users can view training docs for their avatars"
ON public.training_docs
FOR SELECT
USING (
  avatar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_docs.avatar_id
      AND avatars.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create training docs for their avatars"
ON public.training_docs
FOR INSERT
WITH CHECK (
  avatar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_docs.avatar_id
      AND avatars.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update training docs for their avatars"
ON public.training_docs
FOR UPDATE
USING (
  avatar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_docs.avatar_id
      AND avatars.user_id = auth.uid()
  )
)
WITH CHECK (
  avatar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_docs.avatar_id
      AND avatars.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete training docs for their avatars"
ON public.training_docs
FOR DELETE
USING (
  avatar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_docs.avatar_id
      AND avatars.user_id = auth.uid()
  )
);

-- NOTE: public.users is a legacy table with PII-like data and no ownership column.
-- With RLS enabled and no policies, it becomes inaccessible from the client by default.