import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Auth } from "./Auth";
import Dashboard from "./Dashboard";
import { SquareView } from "./SquareView";
import { MediaUpload } from "./MediaUpload";
import { Characters } from "./Characters";
import { CreateSquare } from "./CreateSquare";

type Page = 'auth' | 'dashboard' | 'square' | 'upload' | 'characters' | 'create';

const Index = () => {
  const { user, profile, organization, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('auth');

  useEffect(() => {
    if (user && profile && organization) {
      setCurrentPage('dashboard');
    } else if (!user) {
      setCurrentPage('auth');
    }
  }, [user, profile, organization]);

  const handleAuthSuccess = () => {
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await signOut();
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
      return <Dashboard />;
    case 'square':
      return <SquareView 
        user={{ 
          name: profile?.full_name || user?.email?.split('@')[0] || 'Usuário', 
          email: user?.email || '' 
        }} 
        organization={organization}
        profile={profile}
        onLogout={handleLogout} 
        onBack={() => navigateTo('dashboard')} 
      />;
    case 'upload':
      return <MediaUpload 
        user={{ 
          name: profile?.full_name || user?.email?.split('@')[0] || 'Usuário', 
          email: user?.email || '' 
        }} 
        organization={organization}
        profile={profile}
        onLogout={handleLogout} 
        onBack={() => navigateTo('dashboard')} 
      />;
    case 'characters':
      return <Characters 
        user={{ 
          name: profile?.full_name || user?.email?.split('@')[0] || 'Usuário', 
          email: user?.email || '' 
        }} 
        organization={organization}
        profile={profile}
        onLogout={handleLogout} 
        onBack={() => navigateTo('dashboard')} 
      />;
    case 'create':
      return <CreateSquare 
        user={{ 
          name: profile?.full_name || user?.email?.split('@')[0] || 'Usuário', 
          email: user?.email || '' 
        }} 
        organization={organization}
        profile={profile}
        onLogout={handleLogout} 
        onBack={() => navigateTo('dashboard')} 
      />;
    default:
      return <Dashboard />;
  }
};

export default Index;