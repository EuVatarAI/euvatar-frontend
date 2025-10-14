import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { createDemoUser } from "@/utils/createDemoUser";
import euvatarLogo from "@/assets/euvatar-logo-white.png";

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Remover a criação automática do usuário demo que estava causando problemas
  }, []);

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
      <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Logo and Branding */}
        <div className="text-center mb-4">
          <div className="flex justify-center">
            <img 
              src={euvatarLogo} 
              alt="Euvatar" 
              className="max-w-xs h-auto block" 
            />
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-lg text-center text-muted-foreground leading-tight">
            não fale para o seu público, converse com ele no mundo real.{" "}
            <span className="text-primary font-semibold">
              a evolução da comunicação humano-marca
            </span>
          </p>
        </div>

        {/* Auth Form */}
        <Card className="gradient-card shadow-card border-border p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">
              {isLogin ? "Entre na sua conta" : "Crie sua conta"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "Acesse sua plataforma de mídia OOH" : "Cadastre-se para começar"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {/* Demo Credentials */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">🔧 Credenciais Demo</h3>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Email:</strong> demo@euvatar.ai</p>
                <p><strong>Senha:</strong> demo123</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('demo@euvatar.ai');
                    setPassword('demo123');
                  }}
                  className="text-xs"
                >
                  Preencher Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const result = await createDemoUser();
                    if (result.success) {
                      toast({
                        title: "Conta demo criada!",
                        description: "Use as credenciais acima para fazer login.",
                      });
                    } else {
                      toast({
                        title: "Conta demo já existe",
                        description: "Use as credenciais acima para fazer login.",
                      });
                    }
                  }}
                  className="text-xs"
                >
                  Criar Demo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail da empresa</Label>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
      </div>
    </div>
  );
};