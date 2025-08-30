import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import DynamicForm from "@/components/DynamicForm";
import PhotoCapture from "@/components/PhotoCapture";
import OCRScanner from "@/components/OCRScanner";
import PropertyTemplates from "@/components/PropertyTemplates";
import SmartSuggestions from "@/components/SmartSuggestions";
import PropertyDuplicator from "@/components/PropertyDuplicator";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import BICSmartAssistant from "@/components/BICSmartAssistant";
import { 
  ArrowLeft, 
  Save, 
  Check, 
  MapPin,
  Wifi,
  WifiOff
} from "lucide-react";
import type { Mission, Form, PropertyCollection, Photo } from "@/types";
import { isUnauthorizedError } from "@/lib/authUtils";
import { smartAutofillService } from "@/lib/smartAutofill";

const propertyFormSchema = z.object({
  inscricaoImobiliaria: z.string().min(1, "Inscrição imobiliária é obrigatória"),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  usoPredominante: z.string().min(1, "Uso predominante é obrigatório"),
  areaTerreno: z.number().min(0).optional(),
  areaConstruida: z.number().min(0).optional(),
  numeroPavimentos: z.number().min(1).optional(),
  padraoConstrutivo: z.string().optional(),
  anoConstrucao: z.number().min(1800).max(new Date().getFullYear()).optional(),
  agua: z.boolean().default(false),
  esgoto: z.boolean().default(false),
  energia: z.boolean().default(false),
  iluminacaoPublica: z.boolean().default(false),
  coletaLixo: z.boolean().default(false),
  meioFio: z.boolean().default(false),
  proprietarioNome: z.string().optional(),
  proprietarioCpfCnpj: z.string().optional(),
  telefone: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

export default function PropertyForm() {
  const { id: missionId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [progress, setProgress] = useState(0);
  const [currentGPS, setCurrentGPS] = useState<{latitude: number, longitude: number, accuracy?: number} | null>(null);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      agua: false,
      esgoto: false,
      energia: false,
      iluminacaoPublica: false,
      coletaLixo: false,
      meioFio: false,
    },
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentGPS({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error("Error getting GPS location:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Calculate form progress
  useEffect(() => {
    const watchedFields = form.watch();
    const requiredFields = ['inscricaoImobiliaria', 'usoPredominante'];
    const optionalFields = ['numero', 'areaConstruida', 'areaTerreno', 'proprietarioNome'];
    
    let filledRequired = 0;
    let filledOptional = 0;
    
    requiredFields.forEach(field => {
      if (watchedFields[field as keyof PropertyFormData]) filledRequired++;
    });
    
    optionalFields.forEach(field => {
      if (watchedFields[field as keyof PropertyFormData]) filledOptional++;
    });
    
    const totalProgress = (filledRequired / requiredFields.length) * 60 + 
                         (filledOptional / optionalFields.length) * 40;
    setProgress(Math.round(totalProgress));
  }, [form.watch()]);

  const { data: mission, isLoading: missionLoading } = useQuery<Mission>({
    queryKey: ["/api/missions", missionId],
    enabled: !!missionId,
  });

  const { data: activeForm } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: ["/api/photos/mission", missionId],
    enabled: !!missionId,
  });

  const { data: existingCollection } = useQuery<PropertyCollection[]>({
    queryKey: ["/api/property-collections/mission", missionId],
    enabled: !!missionId,
  });

  const saveCollectionMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      if (!currentGPS) {
        throw new Error("Localização GPS é obrigatória");
      }

      const response = await fetch('/api/property-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          missionId,
          formResponses: data,
          latitude: currentGPS.latitude,
          longitude: currentGPS.longitude,
          accuracy: currentGPS.accuracy,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-collections/mission", missionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/missions", missionId] });
      toast({
        title: "Dados salvos",
        description: "Formulário salvo localmente com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    },
  });

  const updateMissionStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/missions/${missionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
    },
  });

  const handleSave = async (data: PropertyFormData) => {
    try {
      await saveCollectionMutation.mutateAsync(data);
      
      // Aprendizado contínuo da IA BIC (executado em background)
      if (mission?.municipio && data) {
        try {
          await fetch('/api/bic/learn-continuous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              municipio: mission.municipio,
              propertyData: data
            }),
          });
          console.log(`IA BIC atualizada com novos dados para ${mission.municipio}`);
        } catch (bicError) {
          // Não bloquear o fluxo principal se o aprendizado BIC falhar
          console.warn('Erro no aprendizado BIC (continuando normalmente):', bicError);
        }
      }
    } catch (error) {
      console.error("Error saving form:", error);
    }
  };

  const handleComplete = async (data: PropertyFormData) => {
    const minPhotos = 2;
    const currentPhotos = photos?.length || 0;

    if (currentPhotos < minPhotos) {
      toast({
        title: "Fotos insuficientes",
        description: `É necessário ao menos ${minPhotos} fotos para concluir o cadastro. Você tem ${currentPhotos}.`,
        variant: "destructive",
      });
      return;
    }

    if (!currentGPS) {
      toast({
        title: "GPS obrigatório",
        description: "Localização GPS é obrigatória para concluir o cadastro.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveCollectionMutation.mutateAsync(data);
      await updateMissionStatusMutation.mutateAsync('completed');
      
      // Aprendizado contínuo da IA BIC para dados finalizados (executado em background)
      if (mission?.municipio && data) {
        try {
          await fetch('/api/bic/learn-continuous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              municipio: mission.municipio,
              propertyData: data
            }),
          });
          console.log(`IA BIC atualizada com dados finalizados para ${mission.municipio}`);
        } catch (bicError) {
          // Não bloquear o fluxo principal se o aprendizado BIC falhar
          console.warn('Erro no aprendizado BIC ao finalizar (continuando normalmente):', bicError);
        }
      }
      
      toast({
        title: "Coleta concluída!",
        description: "Dados adicionados à fila de sincronização.",
      });
      
      setLocation("/missions");
    } catch (error) {
      console.error("Error completing form:", error);
    }
  };

  const handleOCRNumberDetected = (numbers: string[]) => {
    if (numbers.length > 0) {
      const detectedNumber = numbers[0]; // Use the first detected number
      form.setValue('numero', detectedNumber);
      setShowOCRScanner(false);
      toast({
        title: "Número detectado!",
        description: `Número ${detectedNumber} adicionado ao formulário`,
      });
      autoSave();
    }
  };

  const handleTemplateSelected = (templateData: any) => {
    Object.keys(templateData).forEach(key => {
      form.setValue(key as keyof PropertyFormData, templateData[key]);
    });
    toast({
      title: "Template aplicado!",
      description: "Campos preenchidos automaticamente",
    });
    autoSave();
  };

  const handleApplySuggestion = (field: string, value: any) => {
    form.setValue(field as keyof PropertyFormData, value);
    toast({
      title: "Sugestão aplicada!",
      description: `Campo ${field} preenchido automaticamente`,
    });
    autoSave();
  };

  const autoSave = async () => {
    if (!autoSaveEnabled) return;
    
    try {
      const formData = form.getValues();
      await saveCollectionMutation.mutateAsync(formData);
      setLastSaveTime(new Date());
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  };

  const updateGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentGPS({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          toast({
            title: "GPS atualizado",
            description: `Localização atualizada com precisão de ${Math.round(position.coords.accuracy)}m!`,
          });
        },
        (error) => {
          toast({
            title: "Erro no GPS",
            description: "Não foi possível obter a localização atual.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  if (missionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded"></div>
          <div className="h-32 bg-muted animate-pulse rounded"></div>
          <div className="h-48 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="font-medium text-card-foreground mb-2">Missão não encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                A missão solicitada não foi encontrada ou você não tem acesso a ela.
              </p>
              <Button onClick={() => setLocation("/missions")}>
                Voltar às Missões
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onSave={() => form.handleSubmit(handleSave)()}
        onComplete={() => form.handleSubmit(handleComplete)()}
        onUpdateGPS={updateGPS}
        onToggleOCR={() => setShowOCRScanner(!showOCRScanner)}
        onQuickFill={() => {}} // This would open templates dialog
      />
      
      {/* Form Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/missions")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-card-foreground">Cadastro do Imóvel</h1>
            <p className="text-xs text-muted-foreground">
              {mission.address || "Endereço não informado"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          {lastSaveTime && (
            <Badge variant="outline" className="text-xs">
              Salvo às {lastSaveTime.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Badge>
          )}
          <Button 
            size="sm"
            onClick={form.handleSubmit(handleSave)}
            disabled={saveCollectionMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-card-foreground">Progresso</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Form Content */}
      <div className="p-4 space-y-6">
        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PropertyTemplates 
            onTemplateSelected={handleTemplateSelected}
            currentData={form.getValues()}
          />
          <PropertyDuplicator
            onDuplicateProperty={handleTemplateSelected}
            currentLocation={currentGPS}
          />
        </div>

        {/* Smart Suggestions */}
        <SmartSuggestions
          currentData={form.getValues()}
          currentLocation={currentGPS}
          onApplySuggestion={handleApplySuggestion}
        />

        {/* BIC Smart Assistant */}
        {mission?.municipio && (
          <BICSmartAssistant
            municipio={mission.municipio}
            currentPropertyData={form.getValues()}
            onApplySuggestion={handleApplySuggestion}
            onSelectMatch={(matchData) => {
              // Implementar lógica para aplicar dados da correspondência BIC
              toast({
                title: "Correspondência BIC Encontrada",
                description: `Registro BIC ${matchData.bicId} com ${Math.round(matchData.overallScore * 100)}% de similaridade`,
              });
            }}
          />
        )}

        <DynamicForm 
          form={form}
          onSave={handleSave}
          schema={activeForm?.[0]?.schemaJson}
        />

        {/* Photos Section */}
        <PhotoCapture 
          missionId={missionId!}
          photos={photos || []}
          onPhotoAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/photos/mission", missionId] });
          }}
        />

        {/* OCR Scanner for House Numbers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-card-foreground">Reconhecimento de Números</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOCRScanner(!showOCRScanner)}
                data-testid="button-toggle-ocr"
              >
                {showOCRScanner ? 'Ocultar' : 'Usar OCR'}
              </Button>
            </div>
            
            {showOCRScanner && (
              <OCRScanner
                onNumberDetected={handleOCRNumberDetected}
                defaultNumber={form.getValues('numero')}
              />
            )}
          </CardContent>
        </Card>

        {/* GPS Location */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-medium text-card-foreground mb-3">Localização GPS</h2>
            <div className="bg-secondary rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-foreground">Coordenadas</span>
                <div className="flex items-center space-x-1">
                  <div className={`h-2 w-2 rounded-full ${
                    currentGPS?.accuracy && currentGPS.accuracy <= 10 ? 'bg-green-500' :
                    currentGPS?.accuracy && currentGPS.accuracy <= 20 ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-green-600">
                    {currentGPS?.accuracy ? `Precisão: ${Math.round(currentGPS.accuracy)}m` : "GPS desativado"}
                  </span>
                </div>
              </div>
              {currentGPS ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Latitude:</span>
                    <span className="font-mono ml-2">{currentGPS.latitude.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longitude:</span>
                    <span className="font-mono ml-2">{currentGPS.longitude.toFixed(6)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Obtendo localização...</p>
              )}
              <Button 
                onClick={updateGPS}
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                data-testid="button-update-gps"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Atualizar Localização
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline"
            onClick={form.handleSubmit(handleSave)}
            disabled={saveCollectionMutation.isPending}
            data-testid="button-save-draft"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button 
            onClick={form.handleSubmit(handleComplete)}
            disabled={saveCollectionMutation.isPending || updateMissionStatusMutation.isPending}
            data-testid="button-complete"
          >
            <Check className="h-4 w-4 mr-2" />
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
