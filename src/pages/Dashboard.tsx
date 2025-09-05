import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { 
  Monitor, 
  MessageCircle, 
  Video, 
  MapPin, 
  Plus, 
  Users, 
  Upload,
  Eye,
  BarChart3
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const interactionData = [
  { name: 'Totem 1', interactions: 145 },
  { name: 'Totem 2', interactions: 123 },
  { name: 'Totem 3', interactions: 98 },
  { name: 'Totem 4', interactions: 87 },
  { name: 'Totem 5', interactions: 76 },
];

const visionData = [
  { name: 'Homens', value: 45, color: '#8b5cf6' },
  { name: 'Mulheres', value: 55, color: '#06b6d4' },
];

const squares = [
  { name: "Aeroporto Brasília", location: "Brasília, DF", totems: 8, status: "active" },
  { name: "Parque Olímpico RJ", location: "Rio de Janeiro, RJ", totems: 12, status: "active" },
  { name: "Shopping Center Norte", location: "São Paulo, SP", totems: 6, status: "active" },
  { name: "Terminal Rodoviário", location: "Belo Horizonte, MG", totems: 4, status: "maintenance" },
];

interface DashboardProps {
  user: {
    name: string;
    email: string;
  };
  onLogout: () => void;
  onNavigate: (page: 'square' | 'upload' | 'characters' | 'create') => void;
}

export const Dashboard = ({ user, onLogout, onNavigate }: DashboardProps) => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header user={user} onLogout={onLogout} />
      
      <main className="container py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {user.name.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">
            Gerencie sua rede de mídia OOH interativa
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total de Totens"
            value="30"
            Icon={Monitor}
            trend={{ value: 12, label: "este mês" }}
          />
          <MetricCard
            title="Conversas Hoje"
            value="1,247"
            Icon={MessageCircle}
            trend={{ value: 8, label: "vs ontem" }}
          />
          <MetricCard
            title="Mídias Cadastradas"
            value="156"
            Icon={Video}
            trend={{ value: 5, label: "esta semana" }}
          />
        </div>

        {/* Quick Actions */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={() => onNavigate('create')}
            >
              <MapPin className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Criar Nova Praça</div>
                <div className="text-sm text-muted-foreground">Adicionar localização</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={() => onNavigate('characters')}
            >
              <Users className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Área de Personagens</div>
                <div className="text-sm text-muted-foreground">Gerenciar avatares</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={() => onNavigate('upload')}
            >
              <Upload className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Upload de Mídias</div>
                <div className="text-sm text-muted-foreground">Carregar vídeos</div>
              </div>
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Squares List */}
          <Card className="gradient-card shadow-card border-border p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Praças Cadastradas
            </h3>
            <div className="space-y-4">
              {squares.map((square) => (
                <div 
                  key={square.name}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('square')}
                >
                  <div>
                    <h4 className="font-medium">{square.name}</h4>
                    <p className="text-sm text-muted-foreground">{square.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{square.totems} totens</div>
                    <div className={`text-xs ${square.status === 'active' ? 'text-success' : 'text-warning'}`}>
                      {square.status === 'active' ? 'Ativo' : 'Manutenção'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interactions Chart */}
          <Card className="gradient-card shadow-card border-border p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Interações por Totem
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={interactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="interactions" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Vision Analytics */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Análise de Visão Computacional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Demografia dos Usuários</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={visionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {visionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground">Média de idade</div>
                <div className="text-2xl font-bold">28 anos</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground">Tempo médio de interação</div>
                <div className="text-2xl font-bold">2m 34s</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="text-sm text-muted-foreground">Taxa de engajamento</div>
                <div className="text-2xl font-bold">73%</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};