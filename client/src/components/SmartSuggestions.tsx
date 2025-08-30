import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronRight,
  MapPin,
  User,
  Home,
  FileText,
  Zap,
  AlertTriangle
} from "lucide-react";

interface MatchReason {
  type: string;
  field: string;
  score: number;
  weight: number;
  description: string;
}

interface PropertyMatch {
  id: string;
  municipalDataId: string;
  score: number;
  confidence: string;
  reasons: MatchReason[];
  autoApplied: boolean;
  municipalData: {
    inscricaoImobiliaria: string;
    logradouro: string;
    numeroLogradouro: string;
    bairro: string;
    proprietarioNome: string;
    usoPredominante: string;
    areaTerreno: number;
    areaConstruida: number;
    valorVenal: number;
  };
}

interface SmartSuggestionsProps {
  matches: PropertyMatch[];
  onApplyMatch: (matchId: string, municipalDataId: string) => void;
  onRejectMatch: (matchId: string) => void;
  onViewDetails: (municipalData: any) => void;
  isLoading?: boolean;
}

export default function SmartSuggestions({ 
  matches, 
  onApplyMatch, 
  onRejectMatch, 
  onViewDetails,
  isLoading = false 
}: SmartSuggestionsProps) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "Muito Alta": return "bg-green-100 text-green-800 border-green-200";
      case "Alta": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Média": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Baixa": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case "exact_match": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "proximity": return <MapPin className="h-4 w-4 text-blue-600" />;
      case "similarity": return <Brain className="h-4 w-4 text-purple-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatArea = (area: number) => {
    return `${area.toFixed(2)} m²`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 animate-pulse" />
            <span>Analisando propriedades similares...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Sugestões Inteligentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma propriedade similar encontrada na base municipal.
              Esta pode ser uma propriedade nova ou os dados podem estar em formato diferente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Sugestões Inteligentes</span>
            <Badge variant="secondary">{matches.length} encontrada(s)</Badge>
          </div>
          {matches.some(m => m.autoApplied) && (
            <div className="flex items-center space-x-1 text-green-600">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Auto-aplicado</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.map((match, index) => (
          <div key={match.id} className="space-y-3">
            <Card className="relative">
              <CardContent className="p-4">
                {/* Auto-applied indicator */}
                {match.autoApplied && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Zap className="h-3 w-3 mr-1" />
                      Aplicado
                    </Badge>
                  </div>
                )}

                {/* Header with confidence and score */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className={getConfidenceColor(match.confidence)}>
                      {match.confidence} ({Math.round(match.score * 100)}%)
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Inscrição: {match.municipalData.inscricaoImobiliaria}
                    </span>
                  </div>
                </div>

                {/* Property info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {match.municipalData.logradouro}, {match.municipalData.numeroLogradouro}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {match.municipalData.bairro}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {match.municipalData.proprietarioNome}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {match.municipalData.usoPredominante}
                    </div>
                  </div>
                </div>

                {/* Property details */}
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
                  <div>
                    <span className="font-medium">Terreno:</span> {formatArea(match.municipalData.areaTerreno)}
                  </div>
                  <div>
                    <span className="font-medium">Construída:</span> {formatArea(match.municipalData.areaConstruida)}
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span> {formatCurrency(match.municipalData.valorVenal)}
                  </div>
                </div>

                {/* Match reasons */}
                <Collapsible 
                  open={expandedMatch === match.id} 
                  onOpenChange={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                >
                  <CollapsibleTrigger className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80">
                    {expandedMatch === match.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>Ver critérios de matching ({match.reasons.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                      {match.reasons.map((reason, reasonIndex) => (
                        <div key={reasonIndex} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getReasonIcon(reason.type)}
                            <span className="text-sm">{reason.description}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {Math.round(reason.score * 100)}%
                            </span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${reason.score * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Actions */}
                {!match.autoApplied && (
                  <div className="flex items-center space-x-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => onApplyMatch(match.id, match.municipalDataId)}
                      className="flex-1"
                      data-testid={`button-apply-match-${index}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aplicar Dados
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(match.municipalData)}
                      data-testid={`button-view-details-${index}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRejectMatch(match.id)}
                      data-testid={`button-reject-match-${index}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {match.autoApplied && (
                  <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Dados aplicados automaticamente devido à alta confiança
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {index < matches.length - 1 && <Separator />}
          </div>
        ))}

        {/* Summary */}
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Como funciona o matching inteligente:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <strong>Muito Alta:</strong> Auto-aplicado (95%+ confiança)</li>
                <li>• <strong>Alta:</strong> Recomendado para aplicação (85%+ confiança)</li>
                <li>• <strong>Média:</strong> Revisar antes de aplicar (65%+ confiança)</li>
                <li>• <strong>Baixa:</strong> Verificar dados manualmente (40%+ confiança)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}