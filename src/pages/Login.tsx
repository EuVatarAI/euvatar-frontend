import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import euvatar from "/lovable-uploads/71410e48-d9ab-4136-86ab-f30f24385139.png";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import Draggable from 'react-draggable';

interface LoginProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [editableText, setEditableText] = useState("não fale para o seu público, converse com ele no mundo real.");
  const [editableSubtext, setEditableSubtext] = useState("a evolução da comunicação humano-marca");
  const [demoTitle, setDemoTitle] = useState("Demo - Use qualquer credencial para entrar:");
  const [emailLabel, setEmailLabel] = useState("E-mail da empresa");
  const [passwordLabel, setPasswordLabel] = useState("Senha");
  const [buttonText, setButtonText] = useState("Entrar na plataforma");
  const [disclaimerText, setDisclaimerText] = useState("Este é um ambiente de demonstração. Qualquer email/senha funcionará.");
  const [editMode, setEditMode] = useState(false);
  
  // Position states for draggable elements
  const [positions, setPositions] = useState(() => {
    const saved = localStorage.getItem('login-page-positions');
    return saved ? JSON.parse(saved) : {
      logo: { x: 0, y: 0 },
      tagline: { x: 0, y: 0 },
      demo: { x: 0, y: 0 },
      form: { x: 0, y: 0 }
    };
  });
  
  const { toast } = useToast();

  // Save positions to localStorage
  const savePosition = (elementId: string, position: { x: number; y: number }) => {
    const newPositions = { ...positions, [elementId]: position };
    setPositions(newPositions);
    localStorage.setItem('login-page-positions', JSON.stringify(newPositions));
  };

  useEffect(() => {
    // Use the original logo directly without processing
    setProcessedLogo(euvatar);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      onLogin({ email, password });
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Credenciais inválidas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      {/* Mode Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "default" : "secondary"}
          size="sm"
          className="shadow-lg"
        >
          {editMode ? "✏️ Salvar" : "✏️ Editar"}
        </Button>
      </div>
      
      <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Logo and Branding */}
        <div 
          className="text-center mb-4"
          style={{ transform: `translate(${positions.logo.x}px, ${positions.logo.y}px)` }}
        >
          <div className="flex justify-center">
            <img 
              src={processedLogo || euvatar} 
              alt="Euvatar" 
              className="max-w-xs h-auto block" 
            />
          </div>
        </div>

        <div 
          className="text-center mb-4"
          style={{ transform: `translate(${positions.tagline.x}px, ${positions.tagline.y}px)` }}
        >
          <p className="text-lg text-center text-muted-foreground leading-tight">
            <span 
              contentEditable={editMode}
              suppressContentEditableWarning={true}
              onBlur={(e) => setEditableText(e.currentTarget.textContent || "")}
              className={`outline-none ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
            >
              {editableText}
            </span>{" "}
            <span 
              contentEditable={editMode}
              suppressContentEditableWarning={true}
              onBlur={(e) => setEditableSubtext(e.currentTarget.textContent || "")}
              className={`text-primary font-semibold outline-none ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
            >
              {editableSubtext}
            </span>
          </p>
        </div>

        {/* Demo Credentials */}
        <Card 
          className="gradient-card shadow-card border-border p-4 mb-2 mt-12"
          style={{ transform: `translate(${positions.demo.x}px, ${positions.demo.y}px)` }}
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              <strong 
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                onBlur={(e) => setDemoTitle(e.currentTarget.textContent || "")}
                className={`outline-none ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
              >
                {demoTitle}
              </strong>
            </p>
            <div className="flex flex-col gap-1 text-xs text-primary">
              <span>Email: demo@euvatar.com</span>
              <span>Senha: demo123</span>
            </div>
          </div>
        </Card>

        {/* Login Form */}
        <Card 
          className="gradient-card shadow-card border-border p-8"
          style={{ transform: `translate(${positions.form.x}px, ${positions.form.y}px)` }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label 
                htmlFor="email" 
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                onBlur={(e) => setEmailLabel(e.currentTarget.textContent || "")}
                className={`outline-none cursor-text ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
              >
                {emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@euvatar.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="password"
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                onBlur={(e) => setPasswordLabel(e.currentTarget.textContent || "")}
                className={`outline-none cursor-text ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
              >
                {passwordLabel}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="demo123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              disabled={loading}
            >
              <span 
                contentEditable={editMode && !loading}
                suppressContentEditableWarning={true}
                onBlur={(e) => setButtonText(e.currentTarget.textContent || "")}
                className={`outline-none ${editMode && !loading ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
              >
                {loading ? "Entrando..." : buttonText}
              </span>
            </Button>

            <div className="text-center">
              <p 
                className={`text-xs text-muted-foreground outline-none ${editMode ? 'focus:bg-muted/20 px-1 rounded' : ''}`}
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                onBlur={(e) => setDisclaimerText(e.currentTarget.textContent || "")}
              >
                {disclaimerText}
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};