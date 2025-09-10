import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import euvatar from "/lovable-uploads/71410e48-d9ab-4136-86ab-f30f24385139.png";
import Draggable from 'react-draggable';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editableText, setEditableText] = useState("não fale para o seu público, converse com ele no mundo real.");
  const [editableSubtext, setEditableSubtext] = useState("a evolução da comunicação humano-marca");
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta à plataforma.",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar sua conta.",
        });
      }
    } catch (error: any) {
      toast({
        title: isLogin ? "Erro no login" : "Erro no cadastro",
        description: error.message || "Algo deu errado. Tente novamente.",
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
          {editMode ? "✏️ Editar" : "🔄 Mover"}
        </Button>
      </div>
      
      <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Logo and Branding */}
        <Draggable disabled={editMode}>
          <div className={`text-center mb-4 ${editMode ? 'cursor-text' : 'cursor-move'}`}>
            <div className="flex justify-center">
              <img 
                src={euvatar} 
                alt="Euvatar" 
                className="max-w-xs h-auto block" 
              />
            </div>
          </div>
        </Draggable>

        <Draggable disabled={editMode}>
          <div className={`text-center mb-4 ${editMode ? 'cursor-text' : 'cursor-move'}`}>
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
        </Draggable>

        {/* Auth Form */}
        <Draggable disabled={editMode}>
          <Card className={`gradient-card shadow-card border-border p-8 ${editMode ? 'cursor-text' : 'cursor-move'}`}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">
                {isLogin ? "Entre na sua conta" : "Crie sua conta"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin ? "Acesse sua plataforma de mídia OOH" : "Cadastre-se para começar"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted border-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Processando..." : isLogin ? "Entrar na plataforma" : "Criar conta"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Faça login"}
                </button>
              </div>
            </form>
          </Card>
        </Draggable>
      </div>
    </div>
  );
};