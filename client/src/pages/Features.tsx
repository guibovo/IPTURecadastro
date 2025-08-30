import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { 
  Moon,
  Smartphone,
  WifiOff,
  Map,
  Navigation,
  Camera,
  ScanText,
  CheckCircle2,
  Star,
  Zap,
  Shield,
  Download,
  Upload,
  Users,
  BarChart3,
  Settings,
  Layers,
  MapPin,
  Eye,
  Target
} from "lucide-react";

export default function Features() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const featureCategories = [
    { id: "all", label: "Todas", icon: Star },
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "offline", label: "Offline", icon: WifiOff },
    { id: "capture", label: "Captura", icon: Camera },
    { id: "advanced", label: "Avançado", icon: Zap }
  ];

  const features = [
    {
      id: "dark-mode",
      title: "Modo Noturno",
      description: "Interface escura otimizada para trabalho em baixa luminosidade e economia de bateria",
      category: "mobile",
      status: "completed",
      icon: Moon,
      highlights: [
        "Reduz fadiga ocular durante uso prolongado",
        "Economia de bateria em telas OLED",
        "Melhor visibilidade em ambientes escuros",
        "Transição automática baseada no horário"
      ]
    },
    {
      id: "mobile-interface",
      title: "Interface Mobile Otimizada",
      description: "Navegação com botões maiores e touch-friendly para uso em campo",
      category: "mobile",
      status: "completed",
      icon: Smartphone,
      highlights: [
        "Botões de navegação de 80px para fácil acesso",
        "Layout responsivo para diferentes tamanhos de tela",
        "Gestos touch otimizados",
        "Indicadores visuais de conectividade e GPS"
      ]
    },
    {
      id: "offline-auth",
      title: "Autenticação Offline",
      description: "Sistema de login persistente que funciona sem conexão com internet",
      category: "offline",
      status: "completed",
      icon: Shield,
      highlights: [
        "Cache seguro de credenciais locais",
        "Sincronização automática quando online",
        "Indicadores de status de conectividade",
        "Validação local de sessões"
      ]
    },
    {
      id: "offline-maps",
      title: "Mapas Offline",
      description: "Navegação completa com mapas pré-carregados e cache de tiles",
      category: "offline",
      status: "completed",
      icon: Map,
      highlights: [
        "Download de áreas específicas para uso offline",
        "Cache inteligente de tiles de mapa",
        "Navegação GPS sem internet",
        "Marcadores de propriedades offline"
      ]
    },
    {
      id: "location-tracking",
      title: "Rastreamento de Localização",
      description: "Sistema de trilhas de movimento com geofencing para áreas de trabalho",
      category: "advanced",
      status: "completed",
      icon: Navigation,
      highlights: [
        "Gravação de trilhas de movimento",
        "Geofencing para áreas de trabalho",
        "Alertas de entrada/saída de zonas",
        "Estatísticas de distância e tempo"
      ]
    },
    {
      id: "photo-annotations",
      title: "Fotos com Anotações",
      description: "Captura de fotos com sistema avançado de marcações e anotações",
      category: "capture",
      status: "completed",
      icon: Camera,
      highlights: [
        "Ferramentas de anotação (texto, setas, formas)",
        "Metadados GPS automáticos",
        "Tags e categorização de fotos",
        "Editor visual integrado"
      ]
    },
    {
      id: "ocr-recognition",
      title: "Reconhecimento OCR",
      description: "Detecção automática de números de imóveis usando tecnologia OCR",
      category: "capture",
      status: "completed",
      icon: ScanText,
      highlights: [
        "Reconhecimento automático de números",
        "Processamento de imagem aprimorado",
        "Validação de padrões brasileiros",
        "Integração direta com formulários"
      ]
    },
    {
      id: "smart-forms",
      title: "Formulários Inteligentes",
      description: "Validação em tempo real e campos condicionais baseados em contexto",
      category: "advanced",
      status: "in_progress",
      icon: Target,
      highlights: [
        "Validação em tempo real",
        "Campos condicionais dinâmicos",
        "Auto-preenchimento inteligente",
        "Verificação de consistência"
      ]
    },
    {
      id: "smart-sync",
      title: "Sincronização Inteligente",
      description: "Upload otimizado com compressão e priorização baseada em importância",
      category: "offline",
      status: "pending",
      icon: Upload,
      highlights: [
        "Compressão automática de dados",
        "Priorização por urgência",
        "Retry automático em falhas",
        "Sincronização em background"
      ]
    },
    {
      id: "realtime-dashboard",
      title: "Dashboard em Tempo Real",
      description: "Painel administrativo com métricas ao vivo e controle de equipes",
      category: "advanced",
      status: "pending",
      icon: BarChart3,
      highlights: [
        "Métricas de produtividade em tempo real",
        "Monitoramento de equipes",
        "Alertas automáticos",
        "Visualizações interativas"
      ]
    },
    {
      id: "auto-reports",
      title: "Relatórios Automáticos",
      description: "Geração automática de relatórios e análise de produtividade",
      category: "advanced",
      status: "pending",
      icon: Download,
      highlights: [
        "Relatórios automáticos diários/semanais",
        "Análise de produtividade por agente",
        "Exportação em múltiplos formatos",
        "Insights de performance"
      ]
    },
    {
      id: "team-management",
      title: "Gestão de Equipes",
      description: "Sistema de atribuição automática e gerenciamento de equipes",
      category: "advanced",
      status: "pending",
      icon: Users,
      highlights: [
        "Atribuição automática de missões",
        "Balanceamento de carga de trabalho",
        "Gestão de disponibilidade",
        "Comunicação entre equipes"
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "in_progress": return "Em Progresso";
      case "pending": return "Planejado";
      default: return "Desconhecido";
    }
  };

  const filteredFeatures = selectedCategory === "all" 
    ? features 
    : features.filter(feature => feature.category === selectedCategory);

  const completedCount = features.filter(f => f.status === "completed").length;
  const progressCount = features.filter(f => f.status === "in_progress").length;
  const pendingCount = features.filter(f => f.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 pb-20">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Funcionalidades Avançadas</h1>
            <p className="text-muted-foreground">
              Sistema de recadastramento com tecnologias de ponta
            </p>
          </div>

          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Status do Desenvolvimento</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-2xl font-bold text-green-600">{completedCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-2xl font-bold text-blue-600">{progressCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Em Progresso</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="h-3 w-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-2xl font-bold text-gray-600">{pendingCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Planejadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {featureCategories.map(category => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center space-x-1"
                  data-testid={`filter-${category.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Features Grid */}
          <div className="space-y-4">
            {filteredFeatures.map(feature => {
              const Icon = feature.icon;
              return (
                <Card key={feature.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(feature.status)}`}></div>
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(feature.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Principais recursos:</h4>
                      <ul className="space-y-1">
                        {feature.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Progress Summary */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold">Sistema Avançado de Recadastramento</h3>
                </div>
                <p className="text-muted-foreground">
                  {completedCount} de {features.length} funcionalidades implementadas
                </p>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / features.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.round((completedCount / features.length) * 100)}% de conclusão
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
}