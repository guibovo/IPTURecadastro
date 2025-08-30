import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import ShapefileImport from "@/components/ShapefileImport";
import { 
  ArrowLeft, 
  Users, 
  ListTodo, 
  Upload,
  Settings,
  Plus,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus
} from "lucide-react";
import { useLocation } from "wouter";
import type { Mission, Form, ShapefileLayer, DashboardStats } from "@/types";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: missions } = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
  });

  const { data: forms } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });

  const { data: layers } = useQuery<ShapefileLayer[]>({
    queryKey: ["/api/shapefiles/layers"],
  });

  const createFormMutation = useMutation({
    mutationFn: async (formData: { title: string; version: string; schemaJson: any }) => {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setIsCreatingForm(false);
      setNewFormTitle("");
      setNewFormDescription("");
      toast({
        title: "Formulário criado",
        description: "Novo formulário criado com sucesso!",
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
        title: "Erro ao criar formulário",
        description: error.message || "Não foi possível criar o formulário.",
        variant: "destructive",
      });
    },
  });

  const createMissionMutation = useMutation({
    mutationFn: async (missionData: any) => {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(missionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
      toast({
        title: "Missão criada",
        description: "Nova missão atribuída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar missão",
        description: error.message || "Não foi possível criar a missão.",
        variant: "destructive",
      });
    },
  });

  const handleCreateForm = () => {
    if (!newFormTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe o título do formulário.",
        variant: "destructive",
      });
      return;
    }

    const basicFormSchema = {
      form_id: `form_${Date.now()}`,
      title: newFormTitle,
      sections: [
        {
          id: "dados_basicos",
          title: "Dados Básicos",
          fields: [
            {
              id: "inscricao_imobiliaria",
              type: "text",
              label: "Inscrição Imobiliária",
              required: true
            },
            {
              id: "uso_predominante",
              type: "select",
              label: "Uso Predominante",
              options: ["Residencial", "Comercial", "Misto", "Industrial"],
              required: true
            },
            {
              id: "area_construida_m2",
              type: "number",
              label: "Área Construída (m²)",
              min: 0
            }
          ]
        }
      ],
      geofence_required: true,
      gps_accuracy_max_m: 15
    };

    createFormMutation.mutate({
      title: newFormTitle,
      version: "1.0",
      schemaJson: basicFormSchema,
    });
  };

  const recentActivity = [
    {
      id: 1,
      type: "completion",
      agent: "João Silva",
      description: "concluiu coleta",
      location: "Rua das Flores, 123",
      time: "há 1 hora",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      id: 2,
      type: "upload",
      description: "Shapefile importado",
      location: "setor_norte_2025.zip",
      time: "há 3 horas",
      icon: Upload,
      color: "text-blue-600"
    },
    {
      id: 3,
      type: "assignment",
      description: "Missões atribuídas",
      location: "25 missões para Maria Santos",
      time: "há 5 horas",
      icon: UserPlus,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Gestão de equipes e áreas</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="forms" data-testid="tab-forms">Formulários</TabsTrigger>
            <TabsTrigger value="missions" data-testid="tab-missions">Missões</TabsTrigger>
            <TabsTrigger value="shapefiles" data-testid="tab-shapefiles">Shapefiles</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Missões</p>
                      <p className="text-2xl font-bold text-card-foreground" data-testid="text-total-missions">
                        {stats?.totalMissions || missions?.length || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <ListTodo className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Agentes Ativos</p>
                      <p className="text-2xl font-bold text-card-foreground" data-testid="text-active-agents">
                        {stats?.activeAgents || 8}
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Admin */}
            <div className="space-y-3">
              <Button 
                onClick={() => setActiveTab("shapefiles")}
                className="w-full bg-blue-600 text-white h-auto py-4 text-left flex items-center justify-start"
                data-testid="button-import-shapefile"
              >
                <Upload className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Importar Shapefile</div>
                  <div className="text-xs opacity-80">Adicionar nova camada de imóveis</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setActiveTab("missions")}
                className="w-full bg-green-600 text-white h-auto py-4 text-left flex items-center justify-start"
                data-testid="button-assign-missions"
              >
                <UserPlus className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Atribuir Missões</div>
                  <div className="text-xs opacity-80">Designar coletas para agentes</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setActiveTab("forms")}
                className="w-full bg-purple-600 text-white h-auto py-4 text-left flex items-center justify-start"
                data-testid="button-form-builder"
              >
                <Settings className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Construtor de Formulários</div>
                  <div className="text-xs opacity-80">Criar e editar questionários</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setLocation("/offline-maps")}
                className="w-full bg-orange-600 text-white h-auto py-4 text-left flex items-center justify-start"
                data-testid="button-offline-maps"
              >
                <MapPin className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Mapas Offline</div>
                  <div className="text-xs opacity-80">Gerenciar cache de mapas para trabalho offline</div>
                </div>
              </Button>
            </div>

            {/* Recent Activity */}
            <Card>
              <div className="p-4 border-b border-border">
                <h2 className="font-medium text-card-foreground">Atividade Recente</h2>
              </div>
              <div className="divide-y divide-border">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                    <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                      <activity.icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        {activity.agent && <span className="font-medium">{activity.agent} </span>}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.location} • {activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Formulários</h2>
              <Button 
                onClick={() => setIsCreatingForm(true)}
                data-testid="button-create-form"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Formulário
              </Button>
            </div>

            {isCreatingForm && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4">Criar Novo Formulário</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="form-title">Título do Formulário</Label>
                      <Input
                        id="form-title"
                        value={newFormTitle}
                        onChange={(e) => setNewFormTitle(e.target.value)}
                        placeholder="Ex: Recadastramento IPTU 2025"
                        data-testid="input-form-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="form-description">Descrição (opcional)</Label>
                      <Textarea
                        id="form-description"
                        value={newFormDescription}
                        onChange={(e) => setNewFormDescription(e.target.value)}
                        placeholder="Descrição do formulário..."
                        data-testid="textarea-form-description"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleCreateForm}
                        disabled={createFormMutation.isPending}
                        data-testid="button-save-form"
                      >
                        {createFormMutation.isPending ? "Criando..." : "Criar"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setIsCreatingForm(false)}
                        data-testid="button-cancel-form"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {forms?.map((form) => (
                <Card key={form.id} data-testid={`form-card-${form.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">{form.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Versão {form.version} • Criado em {new Date(form.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={form.isActive ? "default" : "secondary"}>
                          {form.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!forms || forms.length === 0) && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-card-foreground mb-2">Nenhum formulário encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crie seu primeiro formulário para começar a coletar dados.
                    </p>
                    <Button onClick={() => setIsCreatingForm(true)}>
                      Criar Primeiro Formulário
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="missions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gerenciar Missões</h2>
              <Button data-testid="button-create-mission">
                <Plus className="h-4 w-4 mr-2" />
                Nova Missão
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {missions?.filter(m => m.status === 'new').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Novas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {missions?.filter(m => m.status === 'in_progress').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Em Andamento</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {missions?.filter(m => m.status === 'completed').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Concluídas</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {missions?.slice(0, 10).map((mission) => (
                <Card key={mission.id} data-testid={`mission-card-${mission.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">
                          {mission.address || "Endereço não informado"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Código: {mission.propertyCode || "N/A"} • 
                          Atribuída para: {mission.assignedTo || "Não atribuída"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          mission.status === 'completed' ? 'default' :
                          mission.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {mission.status === 'completed' ? 'Concluída' :
                           mission.status === 'in_progress' ? 'Em Andamento' : 'Nova'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shapefiles" className="space-y-6">
            <ShapefileImport />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Camadas Importadas</h3>
              {layers?.map((layer) => (
                <Card key={layer.id} data-testid={`layer-card-${layer.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">{layer.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          SRID: {layer.srid} • Importado em {new Date(layer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={layer.isActive ? "default" : "secondary"}>
                          {layer.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!layers || layers.length === 0) && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-card-foreground mb-2">Nenhuma camada encontrada</h3>
                    <p className="text-sm text-muted-foreground">
                      Importe seu primeiro shapefile para começar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation currentPage="admin" />
    </div>
  );
}
