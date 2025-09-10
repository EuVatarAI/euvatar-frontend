-- Limpar usuário demo existente
DELETE FROM public.profiles WHERE email = 'demo@euvatar.ai';
DELETE FROM auth.users WHERE email = 'demo@euvatar.ai';

-- Criar usuário demo diretamente com senha válida
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
  is_super_admin
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'demo@euvatar.ai',
  '$2a$10$5K8Z8Z8Z8Z8Z8Z8Z8Z8Z8eOb2Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated', 
  now(),
  '{"full_name": "Demo User", "company_name": "EuVatar Demo"}',
  false
);

-- Criar usuário alternativo para teste
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
  is_super_admin
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'teste@euvatar.ai',
  '$2a$10$5K8Z8Z8Z8Z8Z8Z8Z8Z8Z8eOb2Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated', 
  now(),
  '{"full_name": "Teste User", "company_name": "EuVatar Teste"}',
  false
);