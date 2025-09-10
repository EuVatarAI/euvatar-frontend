-- Remove existing demo user and create a proper one
DELETE FROM public.profiles WHERE email = 'demo@euvatar.ai';
DELETE FROM auth.users WHERE email = 'demo@euvatar.ai';

-- Create a simple test user that bypasses email confirmation
-- This will be created through the handle_new_user trigger
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_sent_at,
  raw_user_meta_data,
  is_super_admin,
  phone_confirmed_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'demo@euvatar.ai',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated', 
  now(),
  '{"full_name": "Demo User", "company_name": "EuVatar Demo"}',
  false,
  null
);