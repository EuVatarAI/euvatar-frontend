import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { ResizableLogo } from "@/components/ResizableLogo";
interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}
export const Header = ({
  user,
  onLogout
}: HeaderProps) => {
  return <header className="sticky top-0 z-50 w-full border-b border-border bg-gradient-card backdrop-blur supports-[backdrop-filter]:bg-gradient-card/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <ResizableLogo 
            src="/lovable-uploads/afab8cad-2c7f-4598-b7ce-f0d5c353db4c.png" 
            alt="Euvatar" 
          />
        </div>

        {user && <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="hover:bg-secondary">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>}
      </div>
    </header>;
};