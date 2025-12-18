-- Add new columns to avatar_buttons for enhanced styling
ALTER TABLE public.avatar_buttons 
ADD COLUMN border_style TEXT NOT NULL DEFAULT 'rounded' CHECK (border_style IN ('square', 'rounded', 'pill')),
ADD COLUMN font_family TEXT NOT NULL DEFAULT 'Inter';