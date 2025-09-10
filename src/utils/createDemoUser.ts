import { supabase } from '@/integrations/supabase/client';

export const createDemoUser = async () => {
  try {
    // Primeiro, tente fazer login para ver se já existe
    const { data: existingUser, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'demo@euvatar.ai',
      password: 'demo123'
    });

    if (existingUser.user) {
      console.log('Demo user already exists and can login');
      await supabase.auth.signOut();
      return { success: true, message: 'Demo user exists' };
    }

    // Se não conseguir fazer login, cria o usuário
    const { data, error } = await supabase.auth.signUp({
      email: 'demo@euvatar.ai',
      password: 'demo123',
      options: {
        data: {
          full_name: 'Usuário Demo',
          company_name: 'EuVatar Demo'
        }
      }
    });

    if (error) {
      console.error('Error creating demo user:', error);
      return { success: false, error: error.message };
    }

    console.log('Demo user created successfully');
    
    // Fazer logout após criar
    await supabase.auth.signOut();
    
    return { success: true, message: 'Demo user created' };
    
  } catch (error: any) {
    console.error('Error in createDemoUser:', error);
    return { success: false, error: error.message };
  }
};