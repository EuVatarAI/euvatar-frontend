-- Create a demo user directly in auth.users with a known password hash
-- Password will be: demo123

-- First, let's create the organization for demo
INSERT INTO public.organizations (name, slug, description)
VALUES ('EuVatar Demo', 'euvatar-demo', 'Organização de demonstração')
ON CONFLICT (slug) DO NOTHING;

-- Get the organization ID
DO $$
DECLARE
    demo_org_id UUID;
    demo_user_id UUID := gen_random_uuid();
BEGIN
    -- Get or create demo organization
    SELECT id INTO demo_org_id FROM public.organizations WHERE slug = 'euvatar-demo' LIMIT 1;
    
    -- Delete existing demo user if exists
    DELETE FROM auth.users WHERE email = 'demo@euvatar.ai';
    
    -- Insert demo user with known credentials
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
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        demo_user_id,
        '00000000-0000-0000-0000-000000000000',
        'demo@euvatar.ai',
        '$2a$10$M4ClgBU8k5z5FgK5KbKFbeZ4VqzFkJ7VEqnVLkZzG5FqKqF5FqF5F', -- hashed 'demo123'
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        ''
    );
    
    -- Create profile for demo user
    INSERT INTO public.profiles (
        user_id,
        organization_id,
        email,
        full_name,
        role
    ) VALUES (
        demo_user_id,
        demo_org_id,
        'demo@euvatar.ai',
        'Usuário Demo',
        'admin'
    );
END $$;