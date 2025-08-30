import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Info } from "lucide-react";
import type { Mission } from "@/types";

interface MapComponentProps {
  missions: Mission[];
  selectedLayers: string[];
  onMissionSelect?: (mission: Mission) => void;
}

export default function MapComponent({ missions, selectedLayers, onMissionSelect }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Check if Leaflet is available
    if (typeof window !== 'undefined' && (window as any).L) {
      const L = (window as any).L;
      
      const newMap = L.map(mapRef.current).setView([-23.5505, -46.6333], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(newMap);

      setMap(newMap);
    }
  }, [map]);

  // Update user location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);

          if (map && typeof window !== 'undefined' && (window as any).L) {
            const L = (window as any).L;
            
            // Remove existing user marker
            map.eachLayer((layer: any) => {
              if (layer.options && layer.options.isUserMarker) {
                map.removeLayer(layer);
              }
            });

            // Add user location marker
            const userMarker = L.marker([newLocation.lat, newLocation.lng], {
              isUserMarker: true
            }).addTo(map);

            // Add accuracy circle
            const accuracyCircle = L.circle([newLocation.lat, newLocation.lng], {
              radius: position.coords.accuracy,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
              isUserMarker: true
            }).addTo(map);

            userMarker.bindPopup("Sua localização atual");
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [map]);

  // Add mission markers
  useEffect(() => {
    if (!map || !missions.length || typeof window === 'undefined' || !(window as any).L) return;

    const L = (window as any).L;

    // Remove existing mission markers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.isMissionMarker) {
        map.removeLayer(layer);
      }
    });

    // Add mission markers
    missions.forEach((mission) => {
      if (!mission.latitude || !mission.longitude) return;

      const getMarkerColor = (status: string) => {
        switch (status) {
          case 'completed':
            return '#16a34a'; // green
          case 'in_progress':
            return '#3b82f6'; // blue
          case 'pending_photos':
            return '#f59e0b'; // amber
          default:
            return '#f59e0b'; // amber for new/pending
        }
      };

      const markerColor = getMarkerColor(mission.status);
      
      const marker = L.circleMarker([Number(mission.latitude), Number(mission.longitude)], {
        radius: 8,
        fillColor: markerColor,
        color: markerColor,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        isMissionMarker: true
      }).addTo(map);

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-medium">${mission.address || 'Endereço não informado'}</h3>
          <p class="text-sm text-gray-600">Código: ${mission.propertyCode || 'N/A'}</p>
          <p class="text-sm">Status: ${
            mission.status === 'completed' ? 'Concluída' :
            mission.status === 'in_progress' ? 'Em Andamento' :
            mission.status === 'pending_photos' ? 'Aguardando Fotos' : 'Pendente'
          }</p>
        </div>
      `);

      marker.on('click', () => {
        setSelectedMission(mission);
        if (onMissionSelect) {
          onMissionSelect(mission);
        }
      });
    });
  }, [map, missions, onMissionSelect]);

  const centerOnUser = () => {
    if (userLocation && map) {
      map.setView([userLocation.lat, userLocation.lng], 16);
    }
  };

  const handleNavigation = (lat: number, lng: number) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    
    window.open(wazeUrl, '_blank') || window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" data-testid="map-container" />
      
      {/* Center on user button */}
      <Button
        onClick={centerOnUser}
        className="absolute bottom-4 right-4 rounded-full h-12 w-12 p-0 shadow-lg"
        data-testid="button-center-on-user"
      >
        <MapPin className="h-5 w-5" />
      </Button>

      {/* Mission details popup */}
      {selectedMission && (
        <Card className="absolute bottom-4 left-4 right-4 mx-auto max-w-sm shadow-lg z-10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-card-foreground">
                  {selectedMission.address || "Endereço não informado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Código: {selectedMission.propertyCode || "N/A"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMission(null)}
                data-testid="button-close-mission-popup"
              >
                ✕
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant={
                selectedMission.status === 'completed' ? 'default' :
                selectedMission.status === 'in_progress' ? 'secondary' : 'outline'
              }>
                {selectedMission.status === 'completed' ? 'Concluída' :
                 selectedMission.status === 'in_progress' ? 'Em Andamento' :
                 selectedMission.status === 'pending_photos' ? 'Aguardando Fotos' : 'Pendente'}
              </Badge>
              
              <div className="flex space-x-2">
                {selectedMission.latitude && selectedMission.longitude && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNavigation(
                      Number(selectedMission.latitude), 
                      Number(selectedMission.longitude)
                    )}
                    data-testid={`button-navigate-${selectedMission.id}`}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Navegar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = `/missions/${selectedMission.id}/form`;
                  }}
                  data-testid={`button-open-mission-${selectedMission.id}`}
                >
                  <Info className="h-3 w-3 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
