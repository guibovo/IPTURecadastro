import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Home,
  Building2,
  Store,
  Factory,
  Zap,
  Clock,
  CheckCircle2
} from "lucide-react";

interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  data: {
    usoPredominante: string;
    numeroPavimentos?: number;
    padraoConstrutivo?: string;
    agua: boolean;
    esgoto: boolean;
    energia: boolean;
    iluminacaoPublica: boolean;
    coletaLixo: boolean;
    meioFio: boolean;
    areaTerreno?: number;
    areaConstruida?: number;
  };
  estimatedTime: string;
}

interface PropertyTemplatesProps {
  onTemplateSelected: (templateData: any) => void;
  currentData?: any;
}

export default function PropertyTemplates({ onTemplateSelected, currentData }: PropertyTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const templates: PropertyTemplate[] = [
    {
      id: "casa-popular",
      name: "Casa Popular",
      description: "Residência térrea em bairro popular",
      icon: Home,
      estimatedTime: "3 min",
      data: {
        usoPredominante: "Residencial",
        numeroPavimentos: 1,
        padraoConstrutivo: "Popular",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: true,
        meioFio: false,
        areaTerreno: 200,
        areaConstruida: 60
      }
    },
    {
      id: "casa-classe-media",
      name: "Casa Classe Média",
      description: "Residência padrão médio com 2 pavimentos",
      icon: Home,
      estimatedTime: "4 min",
      data: {
        usoPredominante: "Residencial",
        numeroPavimentos: 2,
        padraoConstrutivo: "Médio",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: true,
        meioFio: true,
        areaTerreno: 360,
        areaConstruida: 120
      }
    },
    {
      id: "apartamento",
      name: "Apartamento",
      description: "Unidade residencial em edifício",
      icon: Building2,
      estimatedTime: "2 min",
      data: {
        usoPredominante: "Residencial",
        numeroPavimentos: 1,
        padraoConstrutivo: "Médio",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: true,
        meioFio: true,
        areaConstruida: 70
      }
    },
    {
      id: "comercio-pequeno",
      name: "Comércio Pequeno",
      description: "Loja ou estabelecimento comercial pequeno",
      icon: Store,
      estimatedTime: "3 min",
      data: {
        usoPredominante: "Comercial",
        numeroPavimentos: 1,
        padraoConstrutivo: "Médio",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: true,
        meioFio: true,
        areaTerreno: 150,
        areaConstruida: 80
      }
    },
    {
      id: "comercio-grande",
      name: "Comércio Grande",
      description: "Estabelecimento comercial de grande porte",
      icon: Building2,
      estimatedTime: "5 min",
      data: {
        usoPredominante: "Comercial",
        numeroPavimentos: 1,
        padraoConstrutivo: "Superior",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: true,
        meioFio: true,
        areaTerreno: 500,
        areaConstruida: 300
      }
    },
    {
      id: "industrial",
      name: "Industrial",
      description: "Galpão ou estabelecimento industrial",
      icon: Factory,
      estimatedTime: "6 min",
      data: {
        usoPredominante: "Industrial",
        numeroPavimentos: 1,
        padraoConstrutivo: "Médio",
        agua: true,
        esgoto: true,
        energia: true,
        iluminacaoPublica: true,
        coletaLixo: false,
        meioFio: true,
        areaTerreno: 1000,
        areaConstruida: 600
      }
    }
  ];

  const handleTemplateSelect = (template: PropertyTemplate) => {
    onTemplateSelected(template.data);
    setIsOpen(false);
  };

  const getFilledFieldsCount = (templateData: any) => {
    return Object.keys(templateData).filter(key => 
      templateData[key] !== undefined && templateData[key] !== null && templateData[key] !== ""
    ).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full"
          data-testid="button-open-templates"
        >
          <Zap className="h-4 w-4 mr-2" />
          Usar Template Rápido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Templates Rápidos</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha um template para preencher automaticamente os campos comuns:
          </p>
          
          {templates.map(template => {
            const Icon = template.icon;
            const fieldsCount = getFilledFieldsCount(template.data);
            
            return (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm truncate">{template.name}</h3>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{template.estimatedTime}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {fieldsCount} campos
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          Usar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <Separator className="my-4" />
          
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Dica de Produtividade</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Templates preenchem automaticamente os campos mais comuns, reduzindo o tempo de cadastro em até 70%.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}