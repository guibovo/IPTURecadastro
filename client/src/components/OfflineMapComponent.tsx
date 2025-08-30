import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Info, Wifi, WifiOff, Download } from "lucide-react";
import { mapCache } from "@/lib/mapCache";
import { useAuth } from "@/hooks/useAuth";
import type { Mission } from "@/types";

interface OfflineMapComponentProps {
  missions: Mission[];
  selectedLayers: string[];
  onMissionSelect?: (mission: Mission) => void;
  enableOfflineMode?: boolean;
}

export default function OfflineMapComponent({ 
  missions, 
  selectedLayers, 
  onMissionSelect,
  enableOfflineMode = true 
}: OfflineMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [cachedTilesAvailable, setCachedTilesAvailable] = useState(false);
  const { isOnline } = useAuth();

  // Custom tile layer that checks cache first
  const createOfflineTileLayer = (L: any) => {
    const OfflineTileLayer = L.TileLayer.extend({
      createTile: function(coords: any, done: any) {
        const tile = document.createElement('img');
        
        if (enableOfflineMode && !isOnline) {
          // Try to get cached tile first
          mapCache.getTileUrl(coords.x, coords.y, coords.z).then(cachedUrl => {
            if (cachedUrl) {
              tile.src = cachedUrl;
              tile.onload = () => done(null, tile);
              tile.onerror = () => done(new Error('Cached tile failed'));
            } else {
              // No cached tile available
              tile.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk9mZmxpbmU8L3RleHQ+PC9zdmc+';
              tile.onload = () => done(null, tile);
            }
          }).catch(() => {
            // Fallback to placeholder
            tile.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk9mZmxpbmU8L3RleHQ+PC9zdmc+';
            tile.onload = () => done(null, tile);
          });
        } else {
          // Online mode - use regular tile server
          tile.src = this.getTileUrl(coords);
          tile.onload = () => done(null, tile);
          tile.onerror = () => done(new Error('Online tile failed'));
        }
        
        return tile;
      }
    });

    return new OfflineTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Check if Leaflet is available
    if (typeof window !== 'undefined' && (window as any).L) {
      const L = (window as any).L;
      
      const newMap = L.map(mapRef.current).setView([-23.5505, -46.6333], 13);

      // Add offline-capable tile layer
      const tileLayer = createOfflineTileLayer(L);
      tileLayer.addTo(newMap);

      // Add scale control
      L.control.scale().addTo(newMap);

      setMap(newMap);
    }
  }, [map, isOnline, enableOfflineMode]);

  // Update offline mode based on connectivity
  useEffect(() => {
    setIsOfflineMode(!isOnline && enableOfflineMode);
  }, [isOnline, enableOfflineMode]);

  // Check for cached tiles availability
  useEffect(() => {
    const checkCachedTiles = async () => {
      try {
        const areas = await mapCache.getCachedAreas();
        setCachedTilesAvailable(areas.length > 0);
      } catch (error) {
        console.error('Erro ao verificar tiles em cache:', error);
      }
    };

    checkCachedTiles();
  }, []);

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

            // Add new user marker
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });

            L.marker([newLocation.lat, newLocation.lng], { 
              icon: userIcon,
              isUserMarker: true 
            }).addTo(map);
          }
        },
        (error) => {
          console.error("Erro de GPS:", error);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [map]);

  // Update mission markers
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).L) return;

    const L = (window as any).L;

    // Remove existing mission markers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.isMissionMarker) {
        map.removeLayer(layer);
      }
    });

    // Add mission markers
    missions.forEach((mission) => {
      if (mission.coordinates) {
        const [lat, lng] = mission.coordinates;
        
        const missionIcon = L.divIcon({
          className: 'mission-marker',
          html: `
            <div class="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
              <div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([lat, lng], { 
          icon: missionIcon,
          isMissionMarker: true 
        }).addTo(map);

        marker.on('click', () => {
          setSelectedMission(mission);
          if (onMissionSelect) {
            onMissionSelect(mission);
          }
        });

        // Add popup with mission info
        const popupContent = `
          <div class="p-2 max-w-xs">
            <h3 class="font-medium text-sm mb-1">${mission.title}</h3>
            <p class="text-xs text-gray-600 mb-2">${mission.description || ''}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">${mission.status}</span>
              <span class="text-xs text-gray-500">${mission.priority} prioridade</span>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });
  }, [map, missions, onMissionSelect]);

  const centerOnUser = () => {
    if (map && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 16);
    }
  };

  const downloadCurrentArea = () => {
    if (map && userLocation) {
      const bounds = map.getBounds();
      const area = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      // Open offline map manager or trigger download
      // This could open a modal or navigate to the offline maps page
      console.log('Download área atual:', area);
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div ref={mapRef} className="h-full w-full" />

      {/* Offline mode indicator */}
      {isOfflineMode && (
        <Card className="absolute top-4 left-4 z-10 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Modo Offline
              </span>
              {cachedTilesAvailable && (
                <Badge variant="outline" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Cache OK
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-10">
        {/* Center on user button */}
        <Button
          onClick={centerOnUser}
          size="sm"
          className="w-12 h-12 rounded-full shadow-lg"
          disabled={!userLocation}
          data-testid="button-center-user"
        >
          <Navigation className="h-4 w-4" />
        </Button>

        {/* Download area button (when online) */}
        {isOnline && userLocation && (
          <Button
            onClick={downloadCurrentArea}
            size="sm"
            variant="outline"
            className="w-12 h-12 rounded-full shadow-lg bg-background"
            data-testid="button-download-area"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mission info popup */}
      {selectedMission && (
        <Card className="absolute bottom-4 left-4 max-w-sm z-10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium">{selectedMission.title}</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedMission(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {selectedMission.description}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{selectedMission.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {selectedMission.priority} prioridade
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GPS info */}
      {userLocation && (
        <Card className="absolute top-4 right-4 z-10">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-green-500" />
              <span className="font-mono text-xs">
                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}