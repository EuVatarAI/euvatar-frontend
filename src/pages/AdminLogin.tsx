import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import euvatarLogo from "@/assets/euvatar-logo-white.png";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user && profile?.role === "admin") {
      navigate('/admin/dashboard');
    }
    if (user && profile && profile.role !== "admin") {
      signOut();
      toast({
        title: "Acesso negado",
        description: "Sua conta não possui permissão administrativa.",
        variant: "destructive",
      });
    }
  }, [authLoading, navigate, profile, signOut, toast, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário inválido.");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("user_id", data.user.id)
        .single();

      if (profileError || !profileData) {
        await supabase.auth.signOut();
        throw new Error("Usuário sem permissão administrativa.");
      }

      if (profileData.role !== "admin" || !profileData.is_active) {
        await supabase.auth.signOut();
        throw new Error("Usuário sem permissão administrativa.");
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao painel administrativo.",
      });

      navigate("/admin/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Branding */}
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <img 
              src={euvatarLogo} 
              alt="Euvatar" 
              className="max-w-xs h-auto block" 
            />
          </div>
        </div>

        {/* Auth Form */}
        <Card className="gradient-card shadow-card border-border p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Área Administrativa</h2>
            </div>
            <p className="text-muted-foreground">
              Acesso restrito à equipe Euvatar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@euvatar.com"
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
                  placeholder="Sua senha"
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
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
