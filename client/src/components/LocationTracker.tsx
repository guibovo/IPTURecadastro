import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  MapPin, 
  Navigation,
  Clock,
  Route,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { locationTracker, type LocationPoint, type WorkArea, type MovementSession } from "@/lib/locationTracker";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function LocationTrackerComponent() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<LocationPoint | null>(null);
  const [currentSession, setCurrentSession] = useState<MovementSession | null>(null);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [isInsideWorkArea, setIsInsideWorkArea] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize location tracker
    locationTracker.init();

    // Set up event listeners
    locationTracker.onLocationUpdate((point) => {
      setCurrentPosition(point);
      setIsInsideWorkArea(point.isInsideWorkArea);
      setCurrentSession(locationTracker.getCurrentSession());
    });

    locationTracker.onGeofenceEnter((area) => {
      toast({
        title: "Área de trabalho",
        description: `Você entrou na área: ${area.name}`,
      });
    });

    locationTracker.onGeofenceExit((area) => {
      toast({
        title: "Fora da área",
        description: `Você saiu da área: ${area.name}`,
        variant: "destructive"
      });
    });

    // Load work areas
    loadWorkAreas();

    return () => {
      if (locationTracker.getTrackingStatus()) {
        locationTracker.stopTracking();
      }
    };
  }, [toast]);

  const loadWorkAreas = async () => {
    try {
      const areas = await locationTracker.getActiveWorkAreas();
      setWorkAreas(areas);
    } catch (error) {
      console.error('Erro ao carregar áreas de trabalho:', error);
    }
  };

  const handleStartTracking = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não identificado",
        variant: "destructive"
      });
      return;
    }

    const started = await locationTracker.startTracking(user.id);
    if (started) {
      setIsTracking(true);
      toast({
        title: "Rastreamento iniciado",
        description: "Sua localização está sendo monitorada",
      });
    } else {
      toast({
        title: "Erro no GPS",
        description: "Não foi possível iniciar o rastreamento",
        variant: "destructive"
      });
    }
  };

  const handleStopTracking = async () => {
    await locationTracker.stopTracking();
    setIsTracking(false);
    setCurrentSession(null);
    toast({
      title: "Rastreamento parado",
      description: "Os dados foram salvos",
    });
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  const formatDuration = (startTime: Date) => {
    const duration = Date.now() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Rastreamento de Localização</h2>
        <Badge variant={isTracking ? "default" : "secondary"} className="flex items-center space-x-1">
          {isTracking ? (
            <>
              <Play className="h-3 w-3" />
              <span>Ativo</span>
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" />
              <span>Parado</span>
            </>
          )}
        </Badge>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="h-5 w-5" />
            <span>Controle de Rastreamento</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            {!isTracking ? (
              <Button 
                onClick={handleStartTracking}
                className="flex-1"
                data-testid="button-start-tracking"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Rastreamento
              </Button>
            ) : (
              <Button 
                onClick={handleStopTracking}
                variant="destructive"
                className="flex-1"
                data-testid="button-stop-tracking"
              >
                <Pause className="h-4 w-4 mr-2" />
                Parar Rastreamento
              </Button>
            )}
          </div>

          {/* Work Area Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              {isInsideWorkArea ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                {isInsideWorkArea ? "Dentro da área de trabalho" : "Fora da área de trabalho"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Position */}
      {currentPosition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Posição Atual</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Latitude</p>
                <p className="font-mono">{currentPosition.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Longitude</p>
                <p className="font-mono">{currentPosition.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Precisão</p>
                <p className="font-mono">{Math.round(currentPosition.accuracy)}m</p>
              </div>
              <div>
                <p className="text-muted-foreground">Horário</p>
                <p className="font-mono">{new Date(currentPosition.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
            
            {currentPosition.speed && (
              <div>
                <p className="text-muted-foreground text-sm">Velocidade</p>
                <p className="font-mono">{(currentPosition.speed * 3.6).toFixed(1)} km/h</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Stats */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Route className="h-5 w-5" />
              <span>Estatísticas da Sessão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Duração</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatDuration(currentSession.startTime)}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Distância</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatDistance(currentSession.totalDistance)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{currentSession.pointsCount}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{currentSession.workAreaEntries}</p>
                <p className="text-xs text-muted-foreground">Entradas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{currentSession.workAreaExits}</p>
                <p className="text-xs text-muted-foreground">Saídas</p>
              </div>
            </div>

            {currentSession.averageSpeed > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Velocidade Média</p>
                <p className="text-lg font-semibold">{currentSession.averageSpeed.toFixed(1)} km/h</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Areas */}
      {workAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Áreas de Trabalho Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workAreas.map((area) => (
                <div key={area.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-medium">{area.name}</span>
                  <Badge variant="outline">{area.polygon.length} pontos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}