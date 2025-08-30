import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useLocation } from "wouter";
import { 
  Zap,
  Clock,
  TrendingUp,
  Target,
  Lightbulb,
  Copy,
  Keyboard,
  Save,
  Gauge,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface ProductivityFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  timeSaved: string;
  keyShortcut?: string;
  benefits: string[];
  category: "speed" | "automation" | "intelligence";
}

export default function ProductivityFeatures() {
  const [, setLocation] = useLocation();

  const features: ProductivityFeature[] = [
    {
      id: "templates",
      title: "Templates Rápidos",
      description: "Preencha formulários instantaneamente com dados pré-configurados",
      icon: Zap,
      timeSaved: "2-3 min por propriedade",
      keyShortcut: "Ctrl+T",
      category: "speed",
      benefits: [
        "6 tipos de propriedades pré-configuradas",
        "Preenchimento automático de 12+ campos",
        "Reduz erros de digitação",
        "Ideal para bairros padronizados"
      ]
    },
    {
      id: "smart-suggestions",
      title: "Sugestões Inteligentes",
      description: "IA analisa propriedades próximas e sugere valores baseados no contexto",
      icon: Lightbulb,
      timeSaved: "1-2 min por propriedade",
      category: "intelligence",
      benefits: [
        "Analisa histórico de 500m de raio",
        "Sugere infraestrutura local",
        "Prediz padrões construtivos",
        "Aprende com cada cadastro"
      ]
    },
    {
      id: "duplicator",
      title: "Duplicação Inteligente",
      description: "Copie dados de propriedades similares cadastradas recentemente",
      icon: Copy,
      timeSaved: "1-2 min por propriedade",
      keyShortcut: "Ctrl+D",
      category: "speed",
      benefits: [
        "Lista propriedades por proximidade",
        "Filtra campos relevantes",
        "Evita re-digitação de dados similares",
        "Histórico dos últimos cadastros"
      ]
    },
    {
      id: "auto-save",
      title: "Salvamento Automático",
      description: "Dados são salvos automaticamente a cada alteração",
      icon: Save,
      timeSaved: "30 seg por propriedade",
      category: "automation",
      benefits: [
        "Salva a cada 30 segundos",
        "Indica horário do último salvamento",
        "Previne perda de dados",
        "Funciona offline"
      ]
    },
    {
      id: "keyboard-shortcuts",
      title: "Atalhos de Teclado",
      description: "Navegação ultrarrápida sem tirar as mãos do teclado",
      icon: Keyboard,
      timeSaved: "20-30 seg por ação",
      category: "speed",
      benefits: [
        "Ctrl+S: Salvar instantâneo",
        "Ctrl+Enter: Concluir cadastro",
        "Ctrl+G: Atualizar GPS",
        "F1: Mostrar ajuda"
      ]
    },
    {
      id: "real-time-validation",
      title: "Validação em Tempo Real",
      description: "Correção automática e validação instantânea de dados",
      icon: CheckCircle2,
      timeSaved: "1 min por propriedade",
      category: "intelligence",
      benefits: [
        "Valida CPF/CNPJ automaticamente",
        "Corrige formatos de telefone",
        "Verifica consistência de dados",
        "Alertas visuais inteligentes"
      ]
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "speed": return <Gauge className="h-4 w-4" />;
      case "automation": return <Target className="h-4 w-4" />;
      case "intelligence": return <Sparkles className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "speed": return "Velocidade";
      case "automation": return "Automação";
      case "intelligence": return "Inteligência";
      default: return "Produtividade";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "speed": return "bg-green-100 text-green-800";
      case "automation": return "bg-blue-100 text-blue-800";
      case "intelligence": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalTimeSaved = features.reduce((total, feature) => {
    const minutes = parseFloat(feature.timeSaved.split('-')[1] || feature.timeSaved.split(' ')[0]);
    return total + minutes;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 pb-20">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Melhorias de Produtividade</h1>
            <p className="text-muted-foreground">
              Funcionalidades que aceleram o processo de recadastramento
            </p>
          </div>

          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-8 w-8 text-primary mr-2" />
                    <span className="text-3xl font-bold text-primary">{Math.round(totalTimeSaved)}</span>
                    <span className="text-sm text-muted-foreground ml-1">min</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Economia por propriedade</p>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-8 w-8 text-green-600 mr-2" />
                    <span className="text-3xl font-bold text-green-600">70%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Redução no tempo total</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  De <span className="font-semibold">15 minutos</span> para <span className="font-semibold text-primary">4-5 minutos</span> por cadastro
                </p>
                <Badge variant="secondary" className="text-xs">
                  Até 40 propriedades por dia por agente
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Features List */}
          <div className="space-y-4">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <Card key={feature.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{feature.title}</span>
                            {feature.keyShortcut && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {feature.keyShortcut}
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs ${getCategoryColor(feature.category)}`}>
                          {getCategoryIcon(feature.category)}
                          <span className="ml-1">{getCategoryLabel(feature.category)}</span>
                        </Badge>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          {feature.timeSaved}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Benefícios:</h4>
                      <ul className="space-y-1">
                        {feature.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Target className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold">Teste as Melhorias</h3>
                </div>
                <p className="text-muted-foreground">
                  Experimente todas essas funcionalidades no formulário de propriedade
                </p>
                <Button 
                  onClick={() => setLocation("/missions")}
                  className="w-full"
                  data-testid="button-try-features"
                >
                  Começar Cadastro Otimizado
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Dicas de Máxima Produtividade</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Use templates para bairros com propriedades similares</li>
                <li>• Pressione F1 a qualquer momento para ver todos os atalhos</li>
                <li>• As sugestões ficam mais precisas conforme você usa o sistema</li>
                <li>• Deixe o salvamento automático ativado para maior segurança</li>
                <li>• Duplique dados quando estiver cadastrando uma sequência de casas</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation currentPage="features" />
    </div>
  );
}