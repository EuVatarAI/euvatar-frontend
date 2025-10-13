-- Add context description to media_triggers
ALTER TABLE public.media_triggers 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS keywords_text TEXT;

-- Function to extract keywords from description
CREATE OR REPLACE FUNCTION public.extract_keywords_from_trigger_description()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.keywords_text := lower(
      regexp_replace(NEW.description, '[^a-záàâãéèêíïóôõöúçñ0-9\s]', '', 'g')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-extract keywords
DROP TRIGGER IF EXISTS extract_trigger_keywords ON public.media_triggers;
CREATE TRIGGER extract_trigger_keywords
BEFORE INSERT OR UPDATE ON public.media_triggers
FOR EACH ROW
EXECUTE FUNCTION public.extract_keywords_from_trigger_description();