import { useState } from "react";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { SquareView } from "./SquareView";
import { MediaUpload } from "./MediaUpload";
import { Characters } from "./Characters";
import { CreateSquare } from "./CreateSquare";

type Page = 'login' | 'dashboard' | 'square' | 'upload' | 'characters' | 'create';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const handleLogin = (credentials: { email: string; password: string }) => {
    setUser({
      name: "João Silva",
      email: credentials.email,
    });
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  if (!user && currentPage !== 'login') {
    return <Login onLogin={handleLogin} />;
  }

  switch (currentPage) {
    case 'login':
      return <Login onLogin={handleLogin} />;
    case 'dashboard':
      return <Dashboard user={user!} onLogout={handleLogout} onNavigate={navigateTo} />;
    case 'square':
      return <SquareView user={user!} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'upload':
      return <MediaUpload user={user!} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'characters':
      return <Characters user={user!} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    case 'create':
      return <CreateSquare user={user!} onLogout={handleLogout} onBack={() => navigateTo('dashboard')} />;
    default:
      return <Dashboard user={user!} onLogout={handleLogout} onNavigate={navigateTo} />;
  }
};

export default Index;