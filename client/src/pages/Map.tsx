import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import MapComponent from "@/components/MapComponent";
import { 
  ArrowLeft, 
  Search, 
  Layers, 
  Crosshair,
  Satellite
} from "lucide-react";
import { useLocation } from "wouter";
import type { Mission, ShapefileLayer } from "@/types";

export default function Map() {
  const [, setLocation] = useLocation();
  const [showLayers, setShowLayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);

  const { data: missions } = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
  });

  const { data: layers } = useQuery<ShapefileLayer[]>({
    queryKey: ["/api/shapefiles/layers"],
  });

  const filteredMissions = missions?.filter(mission => 
    !searchQuery || 
    mission.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mission.propertyCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLayerToggle = (layerId: string) => {
    setSelectedLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Map component will handle centering
          console.log("User location:", position.coords);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Map Header */}
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
            <h1 className="font-semibold text-card-foreground">Mapa de Coleta</h1>
            <p className="text-xs text-muted-foreground">
              {filteredMissions?.length || 0} missões na área
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
            data-testid="button-layers"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={centerOnUser}
            data-testid="button-center-user"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Map Container */}
      <div className="relative h-96">
        <MapComponent 
          missions={filteredMissions || []}
          selectedLayers={selectedLayers}
        />
        
        {/* GPS Accuracy Indicator */}
        <div className="absolute top-4 right-4 bg-card rounded-full px-3 py-2 shadow-md">
          <div className="flex items-center space-x-2">
            <Satellite className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-card-foreground">GPS: 5m</span>
          </div>
        </div>
        
        {/* Layer Controls */}
        {showLayers && (
          <Card className="absolute top-4 left-4 shadow-md" data-testid="panel-layers">
            <CardContent className="p-3">
              <h3 className="font-medium text-card-foreground mb-2">Camadas</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="layer-lots" 
                    defaultChecked
                    onCheckedChange={(checked) => 
                      checked ? setSelectedLayers(prev => [...prev, 'lots']) : 
                      setSelectedLayers(prev => prev.filter(id => id !== 'lots'))
                    }
                  />
                  <Label htmlFor="layer-lots" className="text-sm">Lotes IPTU</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="layer-missions" 
                    defaultChecked
                    onCheckedChange={(checked) => 
                      checked ? setSelectedLayers(prev => [...prev, 'missions']) : 
                      setSelectedLayers(prev => prev.filter(id => id !== 'missions'))
                    }
                  />
                  <Label htmlFor="layer-missions" className="text-sm">Missões Ativas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="layer-completed"
                    onCheckedChange={(checked) => 
                      checked ? setSelectedLayers(prev => [...prev, 'completed']) : 
                      setSelectedLayers(prev => prev.filter(id => id !== 'completed'))
                    }
                  />
                  <Label htmlFor="layer-completed" className="text-sm">Concluídas</Label>
                </div>
                {layers?.map(layer => (
                  <div key={layer.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`layer-${layer.id}`}
                      onCheckedChange={(checked) => 
                        checked ? handleLayerToggle(layer.id) : handleLayerToggle(layer.id)
                      }
                    />
                    <Label htmlFor={`layer-${layer.id}`} className="text-sm">{layer.name}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-card border-b border-border">
        <div className="relative">
          <Input 
            type="text" 
            placeholder="Buscar por endereço ou inscrição..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-card">
        <h3 className="font-medium text-card-foreground mb-3">Legenda</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-600 rounded-full"></div>
            <span>Concluída</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-amber-600 rounded-full"></div>
            <span>Pendente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-red-600 rounded-full"></div>
            <span>Atrasada</span>
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="map" />
    </div>
  );
}
