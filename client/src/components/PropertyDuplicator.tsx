import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy,
  Building,
  Clock,
  MapPin,
  CheckCircle2,
  Info
} from "lucide-react";

interface RecentProperty {
  id: string;
  inscricaoImobiliaria: string;
  numero?: string;
  usoPredominante: string;
  padraoConstrutivo?: string;
  numeroPavimentos?: number;
  areaTerreno?: number;
  areaConstruida?: number;
  agua: boolean;
  esgoto: boolean;
  energia: boolean;
  iluminacaoPublica: boolean;
  coletaLixo: boolean;
  meioFio: boolean;
  timestamp: Date;
  distance?: number;
}

interface PropertyDuplicatorProps {
  onDuplicateProperty: (propertyData: any) => void;
  currentLocation?: { latitude: number; longitude: number };
}

export default function PropertyDuplicator({ 
  onDuplicateProperty, 
  currentLocation 
}: PropertyDuplicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Mock data - in real app this would come from IndexedDB or API
  const recentProperties: RecentProperty[] = [
    {
      id: "1",
      inscricaoImobiliaria: "12345678",
      numero: "123",
      usoPredominante: "Residencial",
      padraoConstrutivo: "Médio",
      numeroPavimentos: 2,
      areaTerreno: 360,
      areaConstruida: 120,
      agua: true,
      esgoto: true,
      energia: true,
      iluminacaoPublica: true,
      coletaLixo: true,
      meioFio: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      distance: 0.1
    },
    {
      id: "2",
      inscricaoImobiliaria: "87654321",
      numero: "125",
      usoPredominante: "Residencial",
      padraoConstrutivo: "Médio",
      numeroPavimentos: 1,
      areaTerreno: 200,
      areaConstruida: 80,
      agua: true,
      esgoto: true,
      energia: true,
      iluminacaoPublica: true,
      coletaLixo: true,
      meioFio: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      distance: 0.2
    }
  ];

  const handleDuplicate = (property: RecentProperty) => {
    // Remove fields that should not be duplicated
    const { id, inscricaoImobiliaria, numero, timestamp, distance, ...duplicatableData } = property;
    
    onDuplicateProperty(duplicatableData);
    setIsOpen(false);
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} min atrás`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h atrás`;
    }
  };

  const getFieldsCount = (property: RecentProperty): number => {
    return Object.keys(property).filter(key => 
      !['id', 'inscricaoImobiliaria', 'numero', 'timestamp', 'distance'].includes(key) &&
      property[key as keyof RecentProperty] !== undefined && 
      property[key as keyof RecentProperty] !== null && 
      property[key as keyof RecentProperty] !== ""
    ).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full"
          data-testid="button-open-duplicator"
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicar Propriedade Recente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Copy className="h-5 w-5 text-primary" />
            <span>Duplicar Propriedade</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Selecione uma propriedade recente para copiar seus dados (exceto número e inscrição).
            </AlertDescription>
          </Alert>
          
          {recentProperties.map(property => (
            <Card 
              key={property.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleDuplicate(property)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">
                        Imóvel {property.numero || 'S/N'}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(property.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {property.usoPredominante} • {property.padraoConstrutivo || 'Padrão não definido'}
                    </p>
                    
                    {property.distance !== undefined && (
                      <div className="flex items-center space-x-1 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {property.distance < 1 ? 
                            `${Math.round(property.distance * 1000)}m de distância` :
                            `${property.distance.toFixed(1)}km de distância`
                          }
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {getFieldsCount(property)} campos
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                        Duplicar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {recentProperties.length === 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-medium mb-2">Nenhuma propriedade recente</h3>
                <p className="text-sm text-muted-foreground">
                  Complete alguns cadastros para poder duplicar dados rapidamente.
                </p>
              </CardContent>
            </Card>
          )}
          
          <Separator className="my-4" />
          
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Copy className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Dica de Produtividade</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use Ctrl+D para abrir rapidamente o duplicador de propriedades.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}