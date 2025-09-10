-- Multi-tenant architecture with organizations

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create user profiles table linked to organizations
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- admin, manager, member
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create organization invites table
CREATE TABLE public.organization_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Enable RLS on invites
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Create function to get current user's organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user is admin/manager in organization
CREATE OR REPLACE FUNCTION public.user_can_manage_organization(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND organization_id = _org_id 
    AND role IN ('admin', 'manager')
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for Organizations
CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (id = public.get_current_user_organization_id());

CREATE POLICY "Admins can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (public.user_can_manage_organization(id));

-- RLS Policies for Profiles  
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (organization_id = public.get_current_user_organization_id());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles in their organization" 
ON public.profiles 
FOR ALL 
USING (public.user_can_manage_organization(organization_id));

-- RLS Policies for Organization Invites
CREATE POLICY "Admins can manage invites for their organization" 
ON public.organization_invites 
FOR ALL 
USING (public.user_can_manage_organization(organization_id));

CREATE POLICY "Users can view invites sent to them" 
ON public.organization_invites 
FOR SELECT 
USING (email = auth.email());

-- Function to handle new user signup (creates organization if first user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  user_email TEXT;
  invite_record RECORD;
BEGIN
  user_email := NEW.email;
  
  -- Check if user was invited to an organization
  SELECT * INTO invite_record 
  FROM public.organization_invites 
  WHERE email = user_email 
  AND expires_at > now() 
  AND accepted_at IS NULL
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF invite_record IS NOT NULL THEN
    -- User was invited, add to existing organization
    INSERT INTO public.profiles (user_id, organization_id, email, full_name, role)
    VALUES (
      NEW.id, 
      invite_record.organization_id, 
      user_email,
      NEW.raw_user_meta_data->>'full_name',
      invite_record.role
    );
    
    -- Mark invite as accepted
    UPDATE public.organization_invites 
    SET accepted_at = now() 
    WHERE id = invite_record.id;
  ELSE
    -- Create new organization for first-time user
    INSERT INTO public.organizations (name, slug, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
      lower(replace(COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email), ' ', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8),
      'Organização criada automaticamente'
    )
    RETURNING id INTO org_id;
    
    -- Create admin profile for the user
    INSERT INTO public.profiles (user_id, organization_id, email, full_name, role)
    VALUES (
      NEW.id, 
      org_id, 
      user_email,
      NEW.raw_user_meta_data->>'full_name',
      'admin'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updating timestamps
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();