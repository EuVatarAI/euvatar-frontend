import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import euvatarLogo from '@/assets/euvatar-logo-white.png';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  backPath?: string;
  rightContent?: ReactNode;
}

export const AppLayout = ({ 
  children, 
  title,
  showBackButton = false,
  backPath = '/avatars',
  rightContent
}: AppLayoutProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex justify-between items-center">
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => navigate('/avatars')}
            >
              <img
                src={euvatarLogo}
                alt="Logo da Euvatar"
                className="h-28 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              {rightContent}
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {title && (
          <h1 className="text-3xl font-bold mb-8">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
};
