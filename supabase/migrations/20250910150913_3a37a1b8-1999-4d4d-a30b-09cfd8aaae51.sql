-- Confirmar o email do usuário demo para permitir login
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'demo@euvatar.ai' AND email_confirmed_at IS NULL;