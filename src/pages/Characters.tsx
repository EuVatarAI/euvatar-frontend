import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Users, 
  Edit, 
  Plus,
  Search,
  Settings
} from "lucide-react";

interface Character {
  id: string;
  name: string;
  avatar: string;
  totalTotems: number;
  locations: string[];
  personality: string;
  clothingBrand?: string;
  status: 'active' | 'inactive';
}

const mockCharacters: Character[] = [
  {
    id: "1",
    name: "Ana Virtual",
    avatar: "AV",
    totalTotems: 12,
    locations: ["Aeroporto Brasília", "Terminal Rodoviário"],
    personality: "Amigável e profissional",
    clothingBrand: "Euvatar",
    status: "active"
  },
  {
    id: "2", 
    name: "Carlos Assistente",
    avatar: "CA",
    totalTotems: 8,
    locations: ["Parque Olímpico RJ"],
    personality: "Técnico e informativo",
    status: "active"
  },
  {
    id: "3",
    name: "Maria Recepcionista",
    avatar: "MR", 
    totalTotems: 5,
    locations: ["Shopping Center Norte"],
    personality: "Calorosa e acolhedora",
    clothingBrand: "Shopping Norte",
    status: "inactive"
  },
  {
    id: "4",
    name: "Roberto Guia",
    avatar: "RG",
    totalTotems: 3,
    locations: ["Terminal Rodoviário"],
    personality: "Experiente e confiável",
    status: "active"
  }
];

interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'member';
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  settings: any;
}

interface CharactersProps {
  user: {
    name: string;
    email: string;
  };
  organization: Organization | null;
  profile: Profile | null;
  onLogout: () => void;
  onBack: () => void;
}

export const Characters = ({ user, organization, profile, onLogout, onBack }: CharactersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const filteredCharacters = mockCharacters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.locations.some(loc => 
      loc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
          <span className="text-foreground">Personagens</span>
        </div>

        {/* Header */}
        <Card className="gradient-card shadow-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Gerenciar Personagens
              </h1>
              <p className="text-muted-foreground">
                Personalize e configure os avatares virtuais dos seus totens
              </p>
            </div>
            <Button className="bg-gradient-primary hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Novo Personagem
            </Button>
          </div>
        </Card>

        {/* Search and Filters */}
        <Card className="gradient-card shadow-card border-border p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar personagens ou localizações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted border-border"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredCharacters.length} personagens
            </Badge>
          </div>
        </Card>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCharacters.map((character) => (
            <Card key={character.id} className="gradient-card shadow-card border-border p-6 hover:shadow-glow/20 transition-all">
              <div className="space-y-4">
                {/* Character Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={character.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {character.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{character.name}</h3>
                      <p className="text-sm text-muted-foreground">{character.personality}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={character.status === 'active' ? 'default' : 'secondary'}
                    className={character.status === 'active' ? 'bg-success text-white' : ''}
                  >
                    {character.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-lg font-bold text-foreground">{character.totalTotems}</div>
                    <div className="text-xs text-muted-foreground">Totens</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-lg font-bold text-foreground">{character.locations.length}</div>
                    <div className="text-xs text-muted-foreground">Locais</div>
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">Localizações</div>
                  <div className="flex flex-wrap gap-1">
                    {character.locations.map((location, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Branding */}
                {character.clothingBrand && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-sm font-medium text-primary">Marca na roupa</div>
                    <div className="text-sm text-foreground">{character.clothingBrand}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Personalizar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredCharacters.length === 0 && (
          <Card className="gradient-card shadow-card border-border p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum personagem encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Não encontramos personagens com os critérios de busca informados.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Limpar filtros
            </Button>
          </Card>
        )}

        {/* Character Editor Modal Placeholder */}
        {selectedCharacter && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="gradient-card shadow-lg border-border p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Personalizar {selectedCharacter.name}
              </h3>
              <p className="text-muted-foreground mb-4">
                Funcionalidade de personalização em desenvolvimento...
              </p>
              <Button onClick={() => setSelectedCharacter(null)}>
                Fechar
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};