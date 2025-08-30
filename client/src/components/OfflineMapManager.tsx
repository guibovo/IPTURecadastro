import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Trash2, 
  MapPin, 
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { mapCache } from "@/lib/mapCache";
import { useToast } from "@/hooks/use-toast";

interface CacheArea {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  minZoom: number;
  maxZoom: number;
  totalTiles: number;
  downloadedTiles: number;
  lastUpdated: Date;
}

interface DownloadProgress {
  areaId: string;
  progress: number;
  downloadedTiles: number;
  totalTiles: number;
}

export default function OfflineMapManager() {
  const [cachedAreas, setCachedAreas] = useState<CacheArea[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [newAreaForm, setNewAreaForm] = useState({
    name: '',
    north: '',
    south: '',
    east: '',
    west: '',
    minZoom: '12',
    maxZoom: '16'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCachedAreas();
    loadCacheSize();
  }, []);

  const loadCachedAreas = async () => {
    try {
      const areas = await mapCache.getCachedAreas();
      setCachedAreas(areas);
    } catch (error) {
      console.error('Erro ao carregar áreas:', error);
    }
  };

  const loadCacheSize = async () => {
    try {
      const size = await mapCache.getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Erro ao calcular tamanho do cache:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadArea = async () => {
    if (!newAreaForm.name || !newAreaForm.north || !newAreaForm.south || !newAreaForm.east || !newAreaForm.west) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para definir a área",
        variant: "destructive"
      });
      return;
    }

    const bounds = {
      north: parseFloat(newAreaForm.north),
      south: parseFloat(newAreaForm.south),
      east: parseFloat(newAreaForm.east),
      west: parseFloat(newAreaForm.west)
    };

    if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
      toast({
        title: "Coordenadas inválidas",
        description: "Verifique as coordenadas da área",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ areaId: 'new', progress: 0, downloadedTiles: 0, totalTiles: 0 });

    try {
      const areaId = await mapCache.downloadAreaForOffline(
        bounds,
        newAreaForm.name,
        parseInt(newAreaForm.minZoom),
        parseInt(newAreaForm.maxZoom),
        (progress, totalTiles, downloadedTiles) => {
          setDownloadProgress({
            areaId: 'new',
            progress,
            downloadedTiles,
            totalTiles
          });
        }
      );

      toast({
        title: "Download concluído!",
        description: `Área "${newAreaForm.name}" salva para uso offline`,
      });

      // Reset form
      setNewAreaForm({
        name: '',
        north: '',
        south: '',
        east: '',
        west: '',
        minZoom: '12',
        maxZoom: '16'
      });

      // Refresh lists
      await loadCachedAreas();
      await loadCacheSize();

    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a área para uso offline",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    try {
      await mapCache.deleteArea(areaId);
      toast({
        title: "Área removida",
        description: `Área "${areaName}" foi removida do cache offline`,
      });
      
      await loadCachedAreas();
      await loadCacheSize();
    } catch (error) {
      console.error('Erro ao remover área:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a área",
        variant: "destructive"
      });
    }
  };

  const getAreaFromCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const buffer = 0.01; // ~1km buffer
          
          setNewAreaForm({
            ...newAreaForm,
            name: `Área atual - ${new Date().toLocaleDateString()}`,
            north: (latitude + buffer).toString(),
            south: (latitude - buffer).toString(),
            east: (longitude + buffer).toString(),
            west: (longitude - buffer).toString()
          });
        },
        (error) => {
          toast({
            title: "Erro de GPS",
            description: "Não foi possível obter a localização atual",
            variant: "destructive"
          });
        }
      );
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mapas Offline</h2>
        <Badge variant="outline" className="flex items-center space-x-1">
          <HardDrive className="h-3 w-3" />
          <span>{formatBytes(cacheSize)}</span>
        </Badge>
      </div>

      {/* Download New Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Baixar Nova Área</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">Nome da Área</Label>
              <Input
                id="area-name"
                placeholder="Ex: Centro da Cidade"
                value={newAreaForm.name}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, name: e.target.value })}
                data-testid="input-area-name"
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={getAreaFromCurrentLocation}
                className="w-full"
                data-testid="button-current-location"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Usar Localização Atual
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="north">Norte (Lat)</Label>
              <Input
                id="north"
                type="number"
                step="0.000001"
                placeholder="-23.5000"
                value={newAreaForm.north}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, north: e.target.value })}
                data-testid="input-north"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="south">Sul (Lat)</Label>
              <Input
                id="south"
                type="number"
                step="0.000001"
                placeholder="-23.6000"
                value={newAreaForm.south}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, south: e.target.value })}
                data-testid="input-south"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="east">Leste (Lng)</Label>
              <Input
                id="east"
                type="number"
                step="0.000001"
                placeholder="-46.6000"
                value={newAreaForm.east}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, east: e.target.value })}
                data-testid="input-east"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="west">Oeste (Lng)</Label>
              <Input
                id="west"
                type="number"
                step="0.000001"
                placeholder="-46.7000"
                value={newAreaForm.west}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, west: e.target.value })}
                data-testid="input-west"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-zoom">Zoom Mínimo</Label>
              <Input
                id="min-zoom"
                type="number"
                min="1"
                max="18"
                value={newAreaForm.minZoom}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, minZoom: e.target.value })}
                data-testid="input-min-zoom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-zoom">Zoom Máximo</Label>
              <Input
                id="max-zoom"
                type="number"
                min="1"
                max="18"
                value={newAreaForm.maxZoom}
                onChange={(e) => setNewAreaForm({ ...newAreaForm, maxZoom: e.target.value })}
                data-testid="input-max-zoom"
              />
            </div>
          </div>

          {downloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Baixando tiles...</span>
                <span>{downloadProgress.downloadedTiles} / {downloadProgress.totalTiles}</span>
              </div>
              <Progress value={downloadProgress.progress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={handleDownloadArea} 
            disabled={isDownloading}
            className="w-full"
            data-testid="button-download-area"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Baixando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar Área
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Cached Areas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Áreas em Cache</h3>
        
        {cachedAreas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma área baixada para uso offline</p>
              <p className="text-sm">Baixe áreas para trabalhar sem conexão</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cachedAreas.map((area) => (
              <Card key={area.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{area.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{area.downloadedTiles} / {area.totalTiles} tiles</span>
                        <span>Zoom {area.minZoom}-{area.maxZoom}</span>
                        <span>{new Date(area.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(area.downloadedTiles / area.totalTiles) * 100} 
                          className="w-32 h-2" 
                        />
                        <Badge variant={area.downloadedTiles === area.totalTiles ? "default" : "secondary"}>
                          {area.downloadedTiles === area.totalTiles ? (
                            <>
                              <Wifi className="h-3 w-3 mr-1" />
                              Completo
                            </>
                          ) : (
                            `${Math.round((area.downloadedTiles / area.totalTiles) * 100)}%`
                          )}
                        </Badge>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteArea(area.id, area.name)}
                      data-testid={`button-delete-${area.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}