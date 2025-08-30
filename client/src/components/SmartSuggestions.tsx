import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Lightbulb,
  MapPin,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from "lucide-react";
import { smartAutofillService } from "@/lib/smartAutofill";

interface Suggestion {
  field: string;
  value: any;
  confidence: number;
  reason: string;
}

interface SmartSuggestionsProps {
  currentData: any;
  currentLocation?: { latitude: number; longitude: number };
  onApplySuggestion: (field: string, value: any) => void;
}

export default function SmartSuggestions({ 
  currentData, 
  currentLocation, 
  onApplySuggestion 
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [currentData, currentLocation]);

  const generateSuggestions = async () => {
    if (!currentLocation) return;
    
    setIsLoading(true);
    
    try {
      // Gerar sugestões baseadas na localização
      const locationSuggestions = smartAutofillService.generateLocationBasedSuggestions(currentLocation);
      
      // Gerar sugestões baseadas em propriedades similares
      const similarSuggestions = smartAutofillService.generateSimilarPropertySuggestions(currentData);
      
      // Combinar e filtrar sugestões duplicadas
      const allSuggestions = [...locationSuggestions, ...similarSuggestions];
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.field === suggestion.field)
      );
      
      // Filtrar apenas campos que ainda não foram preenchidos
      const relevantSuggestions = uniqueSuggestions.filter(suggestion => {
        const currentValue = currentData[suggestion.field];
        return currentValue === undefined || currentValue === null || currentValue === "";
      });
      
      setSuggestions(relevantSuggestions.slice(0, 5)); // Máximo 5 sugestões
    } catch (error) {
      console.warn('Erro ao gerar sugestões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion.field, suggestion.value);
    setAppliedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.field)));
    
    // Remover a sugestão aplicada da lista
    setSuggestions(prev => prev.filter(s => s.field !== suggestion.field));
  };

  const handleDismissSuggestion = (field: string) => {
    setSuggestions(prev => prev.filter(s => s.field !== field));
  };

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      usoPredominante: 'Uso Predominante',
      padraoConstrutivo: 'Padrão Construtivo',
      numeroPavimentos: 'Número de Pavimentos',
      areaConstruida: 'Área Construída',
      areaTerreno: 'Área do Terreno',
      agua: 'Água Encanada',
      esgoto: 'Rede de Esgoto',
      energia: 'Energia Elétrica',
      iluminacaoPublica: 'Iluminação Pública',
      coletaLixo: 'Coleta de Lixo',
      meioFio: 'Meio-fio'
    };
    return labels[field] || field;
  };

  const formatValue = (field: string, value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    if (field === 'areaConstruida' || field === 'areaTerreno') {
      return `${value}m²`;
    }
    if (field === 'numeroPavimentos') {
      return `${value} pavimento${value > 1 ? 's' : ''}`;
    }
    return String(value);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Média';
    return 'Baixa';
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Sugestões Inteligentes</h3>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {suggestions.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {isLoading && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Analisando propriedades próximas para gerar sugestões...
                </AlertDescription>
              </Alert>
            )}

            {suggestions.map((suggestion, index) => (
              <div key={`${suggestion.field}-${index}`} className="border rounded-lg p-3 bg-card/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{getFieldLabel(suggestion.field)}</span>
                      <div className="flex items-center space-x-1">
                        <div className={`h-2 w-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}></div>
                        <span className="text-xs text-muted-foreground">
                          {getConfidenceLabel(suggestion.confidence)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {formatValue(suggestion.field, suggestion.value)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.reason}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="flex-1"
                    data-testid={`apply-suggestion-${suggestion.field}`}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissSuggestion(suggestion.field)}
                    className="px-3"
                    data-testid={`dismiss-suggestion-${suggestion.field}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {suggestions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Baseado em {currentLocation ? 'propriedades próximas' : 'histórico similar'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Pode economizar até 3 minutos
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}