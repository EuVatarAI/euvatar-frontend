import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AvatarSession {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  platform: string;
  topics: string[];
  summary: string | null;
  messages_count: number;
}

interface Avatar {
  id: string;
  name: string;
}

const AvatarSessions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [sessions, setSessions] = useState<AvatarSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSession, setSelectedSession] = useState<AvatarSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, id]);

  const fetchData = async () => {
    try {
      // Fetch avatar info
      const { data: avatarData } = await supabase
        .from('avatars')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (avatarData) {
        setAvatar(avatarData);
      }

      // Fetch sessions
      const { data: sessionsData, error } = await supabase
        .from('avatar_sessions')
        .select('*')
        .eq('avatar_id', id)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions(sessionsData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(parseISO(session.started_at), date)
    );
  };

  // Get dates that have sessions (for calendar highlighting)
  const datesWithSessions = sessions.map(s => parseISO(s.started_at));

  // Calculate total usage for selected date
  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];
  const totalDurationForDate = selectedDateSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}min ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}min`;
  };

  // Get usage stats by day of week
  const usageByDayOfWeek = () => {
    const dayStats = new Map<number, { count: number; duration: number }>();
    sessions.forEach(session => {
      const day = parseISO(session.started_at).getDay();
      const current = dayStats.get(day) || { count: 0, duration: 0 };
      current.count += 1;
      current.duration += session.duration_seconds || 0;
      dayStats.set(day, current);
    });
    return dayStats;
  };

  // Get all topics with counts
  const topicsWithCounts = () => {
    const topicMap = new Map<string, { count: number; sessions: AvatarSession[] }>();
    sessions.forEach(session => {
      session.topics?.forEach(topic => {
        const current = topicMap.get(topic) || { count: 0, sessions: [] };
        current.count += 1;
        current.sessions.push(session);
        topicMap.set(topic, current);
      });
    });
    return Array.from(topicMap.entries())
      .sort((a, b) => b[1].count - a[1].count);
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate(`/avatar/${id}`)} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Histórico de Sessões</h1>
            <p className="text-muted-foreground">{avatar?.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  hasSession: datesWithSessions
                }}
                modifiersStyles={{
                  hasSession: {
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    fontWeight: 'bold'
                  }
                }}
              />
              
              {/* Day of week stats */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Uso por dia da semana</p>
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((day, index) => {
                    const stats = usageByDayOfWeek().get(index);
                    return (
                      <div key={day} className="text-center">
                        <p className="text-xs text-muted-foreground">{day}</p>
                        <p className="text-sm font-medium">{stats?.count || 0}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions for selected date */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedDate ? (
                  <>
                    Sessões em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    {selectedDateSessions.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedDateSessions.length} sessão(ões) • {formatDuration(totalDurationForDate)}
                      </Badge>
                    )}
                  </>
                ) : (
                  'Selecione uma data'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateSessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {format(parseISO(session.started_at), 'HH:mm', { locale: ptBR })}
                            {session.ended_at && (
                              <span className="text-muted-foreground">
                                {' → '}{format(parseISO(session.ended_at), 'HH:mm', { locale: ptBR })}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.duration_seconds || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {session.messages_count || 0} mensagens
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">{session.platform}</Badge>
                      </div>
                      {session.topics && session.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {session.topics.slice(0, 5).map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {session.topics.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{session.topics.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma sessão nesta data
                </p>
              )}
            </CardContent>
          </Card>

          {/* Topics summary */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Assuntos Mais Relatados</CardTitle>
            </CardHeader>
            <CardContent>
              {topicsWithCounts().length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {topicsWithCounts().slice(0, 12).map(([topic, data]) => (
                    <div
                      key={topic}
                      onClick={() => {
                        // Show first session with this topic
                        if (data.sessions[0]) {
                          setSelectedDate(parseISO(data.sessions[0].started_at));
                          setSelectedSession(data.sessions[0]);
                        }
                      }}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-center"
                    >
                      <p className="font-medium capitalize">{topic}</p>
                      <p className="text-sm text-muted-foreground">{data.count} menções</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum assunto registrado ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session detail dialog */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Sessão</DialogTitle>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Início</p>
                    <p className="font-medium">
                      {format(parseISO(selectedSession.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fim</p>
                    <p className="font-medium">
                      {selectedSession.ended_at 
                        ? format(parseISO(selectedSession.ended_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Em andamento'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duração</p>
                    <p className="font-medium">{formatDuration(selectedSession.duration_seconds || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mensagens</p>
                    <p className="font-medium">{selectedSession.messages_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plataforma</p>
                    <p className="font-medium capitalize">{selectedSession.platform}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Sessão</p>
                    <p className="font-medium text-xs truncate">{selectedSession.session_id}</p>
                  </div>
                </div>

                {selectedSession.topics && selectedSession.topics.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tópicos discutidos</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.topics.map((topic, i) => (
                        <Badge key={i} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSession.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Resumo</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedSession.summary}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AvatarSessions;
