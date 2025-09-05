import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import euvatar from "@/assets/euvatar-logo.png";

interface LoginProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-primary shadow-glow">
              <img src={euvatar} alt="Euvatar" className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Euvatar
          </h1>
          <p className="mt-4 text-lg text-center text-muted-foreground leading-relaxed">
            não fale para o seu público, converse com ele no mundo real.{" "}
            <span className="text-primary font-semibold">
              a evolução da comunicação humano-marca
            </span>
          </p>
        </div>

        {/* Login Form */}
        <Card className="gradient-card shadow-card border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail da empresa</Label>
              <Input
                id="email"
                type="email"
                placeholder="empresa@exemplo.com"
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
                placeholder="••••••••"
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
              {loading ? "Entrando..." : "Entrar na plataforma"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};