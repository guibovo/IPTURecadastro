import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { 
  MapPin, 
  CheckCircle, 
  Clock, 
  CloudUpload, 
  Map as MapIcon,
  ListTodo,
  BarChart3,
  Check,
  Users,
  Navigation,
  ArrowRight
} from "lucide-react";
import type { DashboardStats, Mission } from "@/types";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentMissions, isLoading: missionsLoading } = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
  });

  const handleNavigation = (lat: number, lng: number) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    
    // Try to open Waze first, fallback to Google Maps
    window.open(wazeUrl, '_blank') || window.open(googleMapsUrl, '_blank');
  };

  const calculateDistance = (lat1?: number, lng1?: number) => {
    if (!lat1 || !lng1) return "N/A";
    // Simplified distance calculation - in real app would use proper geolocation
    return "2.3 km";
  };

  if (statsLoading || missionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
        <BottomNavigation currentPage="dashboard" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />

      {/* Statistics Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {stats?.todayMissions !== undefined ? "Missões Hoje" : "Total de Missões"}
                </p>
                <p className="text-2xl font-bold text-card-foreground" data-testid="text-missions-count">
                  {stats?.todayMissions || stats?.totalMissions || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {stats?.activeAgents !== undefined ? "Agentes Ativos" : "Concluídas"}
                </p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-count">
                  {stats?.activeAgents || stats?.completed || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                {stats?.activeAgents !== undefined ? (
                  <Users className="h-5 w-5 text-green-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">
                  {stats?.pending || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sincronizar</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-sync-count">
                  {stats?.toSync || stats?.pendingSync || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CloudUpload className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => setLocation("/map")}
            className="bg-primary text-primary-foreground p-4 h-auto flex flex-col items-center space-y-2 hover:bg-primary/90"
            data-testid="button-map"
          >
            <MapIcon className="h-6 w-6" />
            <span className="text-sm font-medium">Mapa</span>
          </Button>
          
          <Button 
            onClick={() => setLocation("/missions")}
            variant="secondary"
            className="p-4 h-auto flex flex-col items-center space-y-2"
            data-testid="button-missions"
          >
            <ListTodo className="h-6 w-6" />
            <span className="text-sm font-medium">Missões</span>
          </Button>
          
          <Button 
            onClick={() => setLocation("/sync")}
            variant="outline"
            className="p-4 h-auto flex flex-col items-center space-y-2"
            data-testid="button-sync"
          >
            <CloudUpload className="h-6 w-6" />
            <span className="text-sm font-medium">Sincronizar</span>
          </Button>
          
          <Button 
            onClick={() => setLocation("/location-tracking")}
            variant="outline"
            className="p-4 h-auto flex flex-col items-center space-y-2"
            data-testid="button-location-tracking"
          >
            <Navigation className="h-6 w-6" />
            <span className="text-sm font-medium">Rastreamento</span>
          </Button>
          
          <Button 
            variant="ghost"
            className="p-4 h-auto flex flex-col items-center space-y-2"
            data-testid="button-reports"
          >
            <BarChart3 className="h-6 w-6" />
            <span className="text-sm font-medium">Relatórios</span>
          </Button>
        </div>
      </div>

      {/* Recent Missions */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Missões Recentes</h2>
        <div className="space-y-3">
          {recentMissions?.slice(0, 3).map((mission) => (
            <Card key={mission.id} className="border" data-testid={`card-mission-${mission.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      mission.status === 'completed' ? 'bg-green-100 text-green-800' :
                      mission.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {mission.status === 'completed' ? 'Concluída' :
                       mission.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {calculateDistance(mission.latitude, mission.longitude)}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation(`/missions/${mission.id}/form`)}
                    data-testid={`button-mission-detail-${mission.id}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="font-medium text-card-foreground">{mission.address || "Endereço não informado"}</h3>
                <p className="text-sm text-muted-foreground">
                  Código: {mission.propertyCode || "N/A"}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {mission.deadline ? `Prazo: ${new Date(mission.deadline).toLocaleDateString()}` : "Sem prazo"}
                  </span>
                  {mission.latitude && mission.longitude && (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigation(Number(mission.latitude), Number(mission.longitude))}
                      className="text-xs"
                      data-testid={`button-navigate-${mission.id}`}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Navegar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!recentMissions || recentMissions.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-card-foreground mb-2">Nenhuma missão encontrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aguarde a atribuição de novas missões ou entre em contato com o administrador.
                </p>
                <Button 
                  onClick={() => setLocation("/missions")}
                  data-testid="button-view-all-missions"
                >
                  Ver Todas as Missões
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
}
