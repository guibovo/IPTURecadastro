import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain,
  Search,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  MapPin,
  User,
  Building,
  Calendar,
  ArrowRight,
  Zap,
  TrendingUp,
  Eye,
  Check,
  X
} from "lucide-react";

interface BICSmartAssistantProps {
  municipio: string;
  currentPropertyData: any;
  onApplySuggestion: (field: string, value: string) => void;
  onSelectMatch: (matchData: any) => void;
}

interface PatternMatch {
  confidence: number;
  matches: {
    addressScore: number;
    ownerScore: number;
    propertyCodeScore: number;
    locationScore: number;
  };
  suggestions: {
    field: string;
    suggestedValue: string;
    reason: string;
    confidence: number;
  }[];
  potentialMatches: {
    bicId: string;
    overallScore: number;
    matchedFields: string[];
  }[];
}

export default function BICSmartAssistant({ 
  municipio, 
  currentPropertyData, 
  onApplySuggestion, 
  onSelectMatch 
}: BICSmartAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para verificar se existem padrões para o município
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ["/api/bic/patterns", municipio],
    enabled: !!municipio,
  });

  // Mutation para identificar propriedade
  const identifyPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await apiRequest(`/api/bic/identify-property`, "POST", {
        municipio,
        propertyData
      });
      return response as any;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Análise Concluída",
        description: `Identificação realizada com ${Math.round(data.result.confidence * 100)}% de confiança`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na Análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query para sugestões de cadastro
  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ["/api/bic/cadastro-suggestions", municipio, currentPropertyData],
    queryFn: async () => {
      if (!municipio || !currentPropertyData || Object.keys(currentPropertyData).length === 0) {
        return null;
      }
      
      const response = await apiRequest(`/api/bic/cadastro-suggestions`, "POST", {
        municipio,
        partialData: currentPropertyData
      });
      return response as any;
    },
    enabled: !!municipio && !!currentPropertyData && Object.keys(currentPropertyData).length > 0,
  });

  // Mutation para aprender padrões (admin)
  const learnPatternsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/bic/learn-patterns/${municipio}`, "POST");
      return response as any;
    },
    onSuccess: () => {
      toast({
        title: "Padrões Aprendidos",
        description: `IA aprendeu os padrões BIC de ${municipio} com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bic/patterns"] });
    },
    onError: (error) => {
      toast({
        title: "Erro no Aprendizado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Executar identificação automática quando os dados mudarem
  useEffect(() => {
    if (currentPropertyData && Object.keys(currentPropertyData).length >= 2 && patterns) {
      const timer = setTimeout(() => {
        setIsAnalyzing(true);
        identifyPropertyMutation.mutate(currentPropertyData);
        setTimeout(() => setIsAnalyzing(false), 1500);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPropertyData, patterns]);

  const matchData = identifyPropertyMutation.data?.result as PatternMatch;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 0.6) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <X className="h-4 w-4 text-red-600" />;
  };

  if (patternsLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 animate-pulse text-primary" />
            <span className="text-sm text-muted-foreground">Carregando IA BIC...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patterns) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Assistente IA BIC</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              A IA ainda não aprendeu os padrões BIC para {municipio}. 
              Execute o aprendizado primeiro para ativar as funcionalidades inteligentes.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={() => learnPatternsMutation.mutate()}
            disabled={learnPatternsMutation.isPending}
            className="w-full mt-4"
          >
            <Brain className="h-4 w-4 mr-2" />
            {learnPatternsMutation.isPending ? "Aprendendo..." : "Aprender Padrões BIC"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Assistente IA BIC</span>
              <Badge variant="secondary">
                {(patterns as any)?.pattern?.confidence >= 0.8 ? "Alta Confiança" : 
                 (patterns as any)?.pattern?.confidence >= 0.6 ? "Média Confiança" : "Baixa Confiança"}
              </Badge>
            </div>
            {isAnalyzing && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Analisando...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Município:</span>
              <p className="font-medium">{(patterns as any)?.pattern?.municipio}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Registros BIC:</span>
              <p className="font-medium">{(patterns as any)?.pattern?.sampleSize}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Identificação */}
      {matchData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Identificação Inteligente</span>
              </div>
              <Badge className={getConfidenceColor(matchData.confidence)}>
                {Math.round(matchData.confidence * 100)}% confiança
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pontuações individuais */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Endereço</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(matchData.matches.addressScore)}
                  <span className="text-sm font-medium">
                    {Math.round(matchData.matches.addressScore * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Proprietário</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(matchData.matches.ownerScore)}
                  <span className="text-sm font-medium">
                    {Math.round(matchData.matches.ownerScore * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span className="text-sm">Código Propriedade</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(matchData.matches.propertyCodeScore)}
                  <span className="text-sm font-medium">
                    {Math.round(matchData.matches.propertyCodeScore * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Localização</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(matchData.matches.locationScore)}
                  <span className="text-sm font-medium">
                    {Math.round(matchData.matches.locationScore * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Correspondências potenciais */}
            {matchData.potentialMatches.length > 0 && (
              <div className="mt-4">
                <Separator className="mb-3" />
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Correspondências Encontradas</span>
                </h4>
                <div className="space-y-2">
                  {matchData.potentialMatches.slice(0, 3).map((match, index) => (
                    <div 
                      key={match.bicId} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => onSelectMatch(match)}
                    >
                      <div>
                        <p className="text-sm font-medium">BIC ID: {match.bicId}</p>
                        <p className="text-xs text-muted-foreground">
                          Campos: {match.matchedFields.join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {Math.round(match.overallScore * 100)}%
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sugestões de Melhorias */}
      {(suggestions as any)?.suggestions && (suggestions as any).suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span>Sugestões de Melhoria</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(suggestions as any).suggestions.map((suggestion: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={
                        suggestion.priority === 'high' ? 'destructive' :
                        suggestion.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {suggestion.field}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.priority === 'high' ? 'Alta Prioridade' :
                         suggestion.priority === 'medium' ? 'Média Prioridade' : 'Baixa Prioridade'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {suggestion.message}
                    </p>
                    {suggestion.examples && (
                      <div className="text-xs text-muted-foreground">
                        Exemplos: {suggestion.examples.slice(0, 2).join(", ")}
                      </div>
                    )}
                    {suggestion.options && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.options.slice(0, 3).map((option: string, i: number) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => onApplySuggestion(suggestion.field, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>Ver Padrões</span>
            </Button>
            
            <Button
              size="sm"
              onClick={() => {
                identifyPropertyMutation.mutate(currentPropertyData);
                refetchSuggestions();
              }}
              disabled={identifyPropertyMutation.isPending}
              className="flex items-center space-x-1"
            >
              <Zap className="h-4 w-4" />
              <span>Analisar Novamente</span>
            </Button>
          </div>

          {/* Detalhes dos padrões */}
          {showDetails && patterns && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Padrões BIC Aprendidos</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Formatos de Endereço:</span>
                  <p className="font-medium">{(patterns as any)?.pattern?.patterns?.addressFormats?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipos de Propriedade:</span>
                  <p className="font-medium">{(patterns as any)?.pattern?.patterns?.commonPropertyTypes?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Padrões de CEP:</span>
                  <p className="font-medium">{(patterns as any)?.pattern?.patterns?.zipCodePatterns?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bairros:</span>
                  <p className="font-medium">{(patterns as any)?.pattern?.patterns?.neighborhoodPatterns?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}