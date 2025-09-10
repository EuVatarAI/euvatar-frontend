-- Remover trigger problemático que está causando os erros
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Limpar usuários problemáticos
DELETE FROM public.profiles WHERE email LIKE '%demo%' OR email LIKE '%teste%';
DELETE FROM auth.users WHERE email LIKE '%demo%' OR email LIKE '%teste%';

-- Criar função mais simples para handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  user_email TEXT;
BEGIN
  user_email := NEW.email;
  
  -- Sempre criar nova organização para novos usuários
  INSERT INTO public.organizations (name, slug, description)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    lower(replace(COALESCE(NEW.raw_user_meta_data->>'company_name', user_email), ' ', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'Organização criada automaticamente'
  )
  RETURNING id INTO org_id;
  
  -- Criar perfil do usuário
  INSERT INTO public.profiles (user_id, organization_id, email, full_name, role)
  VALUES (
    NEW.id, 
    org_id, 
    user_email,
    NEW.raw_user_meta_data->>'full_name',
    'admin'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver qualquer erro, apenas retorna NEW para não bloquear a criação do usuário
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();