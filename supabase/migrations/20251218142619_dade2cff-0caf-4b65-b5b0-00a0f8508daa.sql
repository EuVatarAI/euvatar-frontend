-- Add video_url column to avatar_buttons for storing pre-configured videos
ALTER TABLE public.avatar_buttons 
ADD COLUMN video_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.avatar_buttons.video_url IS 'URL of the video to be played when video_upload button is clicked';