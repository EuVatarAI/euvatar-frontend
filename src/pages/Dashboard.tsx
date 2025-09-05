import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  Badge as BadgeIcon
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

const conversationData = [
  { name: 'Totem Principal', conversations: 89, avgDuration: '3m 24s' },
  { name: 'Totem Entrada', conversations: 76, avgDuration: '2m 18s' },
  { name: 'Totem Info A', conversations: 65, avgDuration: '1m 45s' },
  { name: 'Totem Info B', conversations: 52, avgDuration: '2m 01s' },
  { name: 'Totem Saída', conversations: 34, avgDuration: '1m 12s' },
];

const topMediaData = [
  { name: 'Promoção Black Friday', views: 1432, engagement: 85, duration: '30s' },
  { name: 'Novo Produto Tech', views: 1218, engagement: 72, duration: '15s' },
  { name: 'Campanha Sustentável', views: 967, engagement: 68, duration: '1m' },
  { name: 'Ofertas Especiais', views: 845, engagement: 79, duration: '30s' },
  { name: 'Tutorial Produto', views: 723, engagement: 91, duration: '1m' },
];

const visionData = [
  { name: 'Homens', value: 45, color: '#8b5cf6' },
  { name: 'Mulheres', value: 55, color: '#06b6d4' },
];

const allTotems = [
  { 
    id: '1', 
    name: 'Totem Principal - Entrada', 
    location: 'Aeroporto Brasília',
    character: 'Ana Virtual',
    status: 'active',
    interactions: 145,
    conversations: 89,
    lastActive: '2 min atrás'
  },
  { 
    id: '2', 
    name: 'Totem Informativo - Portão A', 
    location: 'Aeroporto Brasília',
    character: 'Carlos Assistente',
    status: 'active',
    interactions: 123,
    conversations: 76,
    lastActive: '5 min atrás'
  },
  { 
    id: '3', 
    name: 'Totem Shopping - Praça Central', 
    location: 'Shopping Center Norte',
    character: 'Maria Recepcionista',
    status: 'maintenance',
    interactions: 98,
    conversations: 65,
    lastActive: '1h atrás'
  },
  { 
    id: '4', 
    name: 'Totem Parque - Entrada Principal', 
    location: 'Parque Olímpico RJ',
    character: 'Roberto Guia',
    status: 'active',
    interactions: 87,
    conversations: 52,
    lastActive: '3 min atrás'
  },
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
          {/* Conversations by Totem */}
          <Card className="gradient-card shadow-card border-border p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Conversas por Totem
            </h3>
            <div className="space-y-3">
              {conversationData.map((totem, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    console.log('Clicou em conversa por totem');
                    onNavigate('square');
                  }}
                >
                  <div>
                    <h4 className="font-medium text-sm">{totem.name}</h4>
                    <p className="text-xs text-muted-foreground">Duração média: {totem.avgDuration}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{totem.conversations}</div>
                    <div className="text-xs text-muted-foreground">conversas</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Media by Views */}
          <Card className="gradient-card shadow-card border-border p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Mídias Mais Visualizadas
            </h3>
            <div className="space-y-3">
              {topMediaData.slice(0, 5).map((media, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{media.name}</h4>
                      <p className="text-xs text-muted-foreground">{media.duration} • {media.engagement}% engajamento</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{media.views.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">visualizações</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* All Totems Grid */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Todos os Totens
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTotems.map((totem) => (
              <div 
                key={totem.id}
                className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-all cursor-pointer hover:shadow-card"
                onClick={() => {
                  console.log('Clicou em totem');
                  onNavigate('square');
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-sm">{totem.name}</h4>
                    <p className="text-xs text-muted-foreground">{totem.location}</p>
                  </div>
                  <Badge 
                    variant={totem.status === 'active' ? 'default' : 'secondary'}
                    className={`text-xs ${totem.status === 'active' ? 'bg-success text-white' : 'bg-warning text-black'}`}
                  >
                    {totem.status === 'active' ? 'Ativo' : 'Manutenção'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Personagem:</span>
                    <span className="font-medium text-primary">{totem.character}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Interações:</span>
                    <span className="font-medium">{totem.interactions}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Conversas:</span>
                    <span className="font-medium">{totem.conversations}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Última atividade:</span>
                    <span className="font-medium text-success">{totem.lastActive}</span>
                  </div>
                </div>
              </div>
            ))}
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