-- Add idle_media_url column to avatars table
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS idle_media_url TEXT;