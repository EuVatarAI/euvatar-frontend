import { useState, useEffect } from "react";
import { User, Session } from '@supabase/supabase-js';
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";
import { SquareView } from "./SquareView";
import { MediaUpload } from "./MediaUpload";
import { Characters } from "./Characters";
import { CreateSquare } from "./CreateSquare";
import { supabase } from "@/integrations/supabase/client";

type Page = 'auth' | 'dashboard' | 'square' | 'upload' | 'characters' | 'create';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('auth');
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setCurrentPage('dashboard');
      } else {
        setCurrentPage('auth');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCurrentPage('auth');
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user && currentPage !== 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  switch (currentPage) {
    case 'auth':
      return <Auth onAuthSuccess={handleAuthSuccess} />;
    case 'dashboard':
      return <Dashboard user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onNavigate={navigateTo} />;
    case 'square':
      return <SquareView user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'upload':
      return <MediaUpload user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'characters':
      return <Characters user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'create':
      return <CreateSquare user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    default:
      return <Dashboard user={{ name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário', email: user?.email || '' }} onLogout={handleLogout} onNavigate={navigateTo} />;
  }
};

export default Index;