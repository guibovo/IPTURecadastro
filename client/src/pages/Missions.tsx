import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { 
  ArrowLeft, 
  Filter, 
  Navigation, 
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useLocation } from "wouter";
import type { Mission } from "@/types";

export default function Missions() {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: missions, isLoading } = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
  });

  const handleNavigation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    
    window.open(wazeUrl, '_blank') || window.open(googleMapsUrl, '_blank');
  };

  const calculateDistance = (lat?: number, lng?: number) => {
    if (!lat || !lng) return "N/A";
    // Simplified distance calculation
    return "2.3 km";
  };

  const estimateTime = (lat?: number, lng?: number) => {
    if (!lat || !lng) return "N/A";
    // Simplified time estimation
    return "15 min";
  };

  const filteredMissions = missions?.filter(mission => {
    switch (activeFilter) {
      case "pending":
        return mission.status === "new";
      case "today":
        const today = new Date();
        const missionDate = new Date(mission.createdAt);
        return missionDate.toDateString() === today.toDateString();
      case "overdue":
        return mission.deadline && new Date(mission.deadline) < new Date();
      default:
        return true;
    }
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluída", color: "bg-green-100 text-green-800" };
      case "in_progress":
        return { label: "Em Andamento", color: "bg-blue-100 text-blue-800" };
      case "pending_photos":
        return { label: "Aguardando Fotos", color: "bg-amber-100 text-amber-800" };
      default:
        return { label: "Pendente", color: "bg-amber-100 text-amber-800" };
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-amber-600";
      default:
        return "text-green-600";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <Header />
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
        <BottomNavigation currentPage="missions" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Missions Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-card-foreground">Minhas Missões</h1>
            <p className="text-xs text-muted-foreground">
              {filteredMissions?.length || 0} totais • {filteredMissions?.filter(m => m.status === "new").length || 0} pendentes
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          data-testid="button-filter"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </header>

      {/* Filter Tabs */}
      <div className="bg-card border-b border-border px-4">
        <div className="flex space-x-1 overflow-x-auto py-2">
          {[
            { key: "all", label: `Todas (${missions?.length || 0})` },
            { key: "pending", label: `Pendentes (${missions?.filter(m => m.status === "new").length || 0})` },
            { key: "today", label: "Hoje" },
            { key: "overdue", label: "Atrasadas" }
          ].map(filter => (
            <Button 
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter(filter.key)}
              className="whitespace-nowrap"
              data-testid={`button-filter-${filter.key}`}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Missions List */}
      <div className="p-4 space-y-4">
        {filteredMissions?.map((mission) => {
          const statusInfo = getStatusInfo(mission.status);
          
          return (
            <Card key={mission.id} className="border overflow-hidden" data-testid={`card-mission-${mission.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {mission.priority && (
                        <span className={`text-xs ${getPriorityColor(mission.priority)}`}>
                          {mission.priority === "high" ? "Alta prioridade" : 
                           mission.priority === "medium" ? "Prioridade média" : "Baixa prioridade"}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-card-foreground">
                      {mission.address || "Endereço não informado"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Código: {mission.propertyCode || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-card-foreground">
                      {calculateDistance(Number(mission.latitude), Number(mission.longitude))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {estimateTime(Number(mission.latitude), Number(mission.longitude))}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center">
                    {mission.status === "completed" ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concluída: {new Date(mission.updatedAt).toLocaleDateString()}
                      </>
                    ) : mission.deadline ? (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Prazo: {new Date(mission.deadline).toLocaleDateString()}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sem prazo definido
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2">
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
                    <Button 
                      size="sm"
                      onClick={() => setLocation(`/missions/${mission.id}/form`)}
                      data-testid={`button-start-${mission.id}`}
                    >
                      {mission.status === "completed" ? "Revisar" : 
                       mission.status === "in_progress" ? "Continuar" : "Iniciar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {(!filteredMissions || filteredMissions.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-card-foreground mb-2">
                {activeFilter === "all" ? "Nenhuma missão encontrada" : "Nenhuma missão neste filtro"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeFilter === "all" 
                  ? "Aguarde a atribuição de novas missões ou entre em contato com o administrador."
                  : "Tente ajustar os filtros para ver outras missões."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation currentPage="missions" />
    </div>
  );
}
