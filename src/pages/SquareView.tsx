import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  MapPin, 
  Monitor, 
  Video, 
  Brain, 
  Mic, 
  MessageCircle,
  Eye,
  Settings,
  Copy,
  Play
} from "lucide-react";

interface Totem {
  id: string;
  name: string;
  character: string;
  mediaCount: number;
  llmModel: string;
  voiceModel: string;
  backstory: string;
  interactions: number;
  visionData: {
    avgAge: number;
    gender: { male: number; female: number };
    engagement: number;
  };
}

interface Square {
  id: string;
  name: string;
  location: string;
  totems: Totem[];
}

const mockSquares: Square[] = [
  {
    id: "1",
    name: "Aeroporto Brasília",
    location: "Brasília, DF",
    totems: [
      {
        id: "1",
        name: "Totem Principal - Entrada",
        character: "Ana Virtual",
        mediaCount: 23,
        llmModel: "GPT-4",
        voiceModel: "ElevenLabs - Sarah",
        backstory: "Recepcionista virtual especializada em dar boas-vindas e informações gerais sobre o aeroporto.",
        interactions: 145,
        visionData: {
          avgAge: 32,
          gender: { male: 45, female: 55 },
          engagement: 78
        }
      },
      {
        id: "2", 
        name: "Totem Informativo - Portão A",
        character: "Carlos Assistente",
        mediaCount: 18,
        llmModel: "GPT-3.5 Turbo",
        voiceModel: "ElevenLabs - Daniel",
        backstory: "Assistente focado em informações de voos e direções dentro do terminal.",
        interactions: 98,
        visionData: {
          avgAge: 28,
          gender: { male: 60, female: 40 },
          engagement: 65
        }
      }
    ]
  },
  {
    id: "2",
    name: "Shopping Center Norte",
    location: "São Paulo, SP",
    totems: [
      {
        id: "3",
        name: "Totem Shopping - Praça Central",
        character: "Maria Recepcionista",
        mediaCount: 15,
        llmModel: "GPT-4",
        voiceModel: "ElevenLabs - Emma",
        backstory: "Assistente virtual para informações sobre lojas, promoções e localização no shopping.",
        interactions: 87,
        visionData: {
          avgAge: 25,
          gender: { male: 35, female: 65 },
          engagement: 82
        }
      }
    ]
  },
  {
    id: "3",
    name: "Parque Olímpico RJ",
    location: "Rio de Janeiro, RJ",
    totems: [
      {
        id: "4",
        name: "Totem Parque - Entrada Principal",
        character: "Roberto Guia",
        mediaCount: 20,
        llmModel: "GPT-3.5 Turbo",
        voiceModel: "ElevenLabs - Josh",
        backstory: "Guia virtual especializado em informações sobre eventos, atrações e atividades do parque.",
        interactions: 76,
        visionData: {
          avgAge: 30,
          gender: { male: 55, female: 45 },
          engagement: 71
        }
      }
    ]
  }
];

interface SquareViewProps {
  user: {
    name: string;
    email: string;
  };
  onLogout: () => void;
  onBack: () => void;
}

export const SquareView = ({ user, onLogout, onBack }: SquareViewProps) => {
  const [selectedTotem, setSelectedTotem] = useState<Totem | null>(null);
  const [selectedSquareFilter, setSelectedSquareFilter] = useState<string>("all");

  const totalTotems = mockSquares.reduce((acc, square) => acc + square.totems.length, 0);
  
  const filteredTotems = selectedSquareFilter === "all" 
    ? mockSquares.flatMap(square => square.totems.map(totem => ({ ...totem, squareName: square.name, squareLocation: square.location })))
    : mockSquares.find(square => square.id === selectedSquareFilter)?.totems.map(totem => ({ ...totem, squareName: mockSquares.find(s => s.id === selectedSquareFilter)!.name, squareLocation: mockSquares.find(s => s.id === selectedSquareFilter)!.location })) || [];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header user={user} onLogout={onLogout} />
      
      <main className="container py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1 h-auto"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-foreground">Visualização de Praças</span>
        </div>

        {/* Header */}
        <Card className="gradient-card shadow-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Gerenciamento de Praças e Totens
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{mockSquares.length} praças cadastradas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  <span>{totalTotems} totens ativos</span>
                </div>
              </div>
            </div>
            <Button className="bg-gradient-primary hover:shadow-glow">
              Criar Novo Totem
            </Button>
          </div>
        </Card>

        {/* Filter Accordion */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Filtrar por Praça</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="filter">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>
                    {selectedSquareFilter === "all" 
                      ? "Todas as Praças" 
                      : mockSquares.find(s => s.id === selectedSquareFilter)?.name}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 mt-4">
                  <Button
                    variant={selectedSquareFilter === "all" ? "default" : "outline"}
                    onClick={() => setSelectedSquareFilter("all")}
                    className="w-full justify-start"
                  >
                    Todas as Praças ({totalTotems} totens)
                  </Button>
                  {mockSquares.map((square) => (
                    <Button
                      key={square.id}
                      variant={selectedSquareFilter === square.id ? "default" : "outline"}
                      onClick={() => setSelectedSquareFilter(square.id)}
                      className="w-full justify-start"
                    >
                      <div className="text-left">
                        <div>{square.name}</div>
                        <div className="text-sm opacity-70">{square.location} • {square.totems.length} totens</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* All Totems Grid */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedSquareFilter === "all" 
              ? `Todos os Totens (${filteredTotems.length})` 
              : `Totens - ${mockSquares.find(s => s.id === selectedSquareFilter)?.name} (${filteredTotems.length})`}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTotems.map((totem) => (
              <Card key={totem.id} className="gradient-card shadow-card border-border p-6">
                <div className="space-y-4">
                  {/* Totem Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {totem.name}
                      </h3>
                      <p className="text-primary font-medium">{totem.character}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{totem.squareName}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-success border-success">
                      Ativo
                    </Badge>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{totem.mediaCount}</span> mídias
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{totem.interactions}</span> interações
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{totem.llmModel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{totem.voiceModel.split(' - ')[1]}</span>
                    </div>
                  </div>

                  {/* Vision Data */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Dados de Visão</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Idade média</div>
                        <div className="font-medium">{totem.visionData.avgAge} anos</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Gênero</div>
                        <div className="font-medium">
                          {totem.visionData.gender.male}% M / {totem.visionData.gender.female}% F
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Engajamento</div>
                        <div className="font-medium">{totem.visionData.engagement}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Backstory */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm font-medium mb-1">Backstory</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {totem.backstory}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Ver Mídias
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};