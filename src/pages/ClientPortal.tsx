import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { User, Play } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  cover_image_url: string | null;
  slug: string | null;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

const ClientPortal = () => {
  const { orgSlug, avatarSlug } = useParams<{ orgSlug: string; avatarSlug?: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [orgSlug, avatarSlug]);

  const fetchData = async () => {
    try {
      // Find organization by slug
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('slug', orgSlug)
        .single();

      if (orgError || !orgData) {
        setError('Organização não encontrada.');
        setLoading(false);
        return;
      }

      setOrganization(orgData);

      // Get user_id from profiles in this organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('organization_id', orgData.id)
        .limit(1)
        .single();

      if (profileError || !profileData) {
        setError('Nenhum euvatar disponível.');
        setLoading(false);
        return;
      }

      // Get avatars for this user
      const { data: avatarsData, error: avatarsError } = await supabase
        .from('avatars')
        .select('id, name, cover_image_url, slug')
        .eq('user_id', profileData.user_id);

      if (avatarsError) throw avatarsError;

      const avatarsList = (avatarsData || []) as Avatar[];
      setAvatars(avatarsList);

      // If avatarSlug is provided, redirect to the specific avatar
      if (avatarSlug) {
        const targetAvatar = avatarsList.find(a => a.slug === avatarSlug);
        if (targetAvatar) {
          // Redirect to the public euvatar page
          navigate(`/euvatar/${targetAvatar.id}`, { replace: true });
          return;
        } else {
          setError('Euvatar não encontrado.');
        }
      }

      // If only one avatar exists, redirect directly
      if (!avatarSlug && avatarsList.length === 1) {
        navigate(`/euvatar/${avatarsList[0].id}`, { replace: true });
        return;
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching client portal data:', err);
      setError('Erro ao carregar dados.');
      setLoading(false);
    }
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    navigate(`/euvatar/${avatar.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive text-lg">{error}</p>
          <p className="text-muted-foreground mt-2">
            Verifique se o link está correto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b py-6">
        <div className="container mx-auto px-4 text-center">
          {organization?.logo_url ? (
            <img 
              src={organization.logo_url} 
              alt={organization.name} 
              className="h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <h1 className="text-3xl font-bold">{organization?.name}</h1>
          )}
          <p className="text-muted-foreground">
            Selecione um euvatar para iniciar a experiência
          </p>
        </div>
      </div>

      {/* Avatars Grid */}
      <div className="container mx-auto px-4 py-12">
        {avatars.length === 0 ? (
          <div className="text-center text-muted-foreground">
            Nenhum euvatar disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {avatars.map((avatar) => (
              <Card 
                key={avatar.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden group"
                onClick={() => handleAvatarSelect(avatar)}
              >
                <div className="aspect-video relative bg-muted overflow-hidden">
                  {avatar.cover_image_url ? (
                    <img 
                      src={avatar.cover_image_url} 
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <User className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-8 w-8 text-primary fill-primary ml-1" />
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-center">{avatar.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPortal;
