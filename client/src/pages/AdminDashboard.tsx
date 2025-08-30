import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useLocation } from "wouter";
import {
  Users,
  ListTodo,
  Database,
  Upload,
  Settings,
  BarChart3,
  MapPin,
  FileText,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Eye,
  Edit,
  Download,
  RefreshCw,
  Calendar,
  Target,
  UserCheck,
  Building
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Verificar se o usuário é admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  // Queries para dados do dashboard
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/admin/recent-activity"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/admin/system-health"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: missions } = useQuery({
    queryKey: ["/api/missions"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: forms } = useQuery({
    queryKey: ["/api/forms"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: municipalStats } = useQuery({
    queryKey: ["/api/municipal-data/stats"],
    enabled: !!user && user.role === 'admin',
  });

  // Mutation para sync geral do sistema
  const syncSystemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/sync-system', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha na sincronização do sistema');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronização concluída",
        description: "Todos os dados foram sincronizados com sucesso.",
      });
      // Invalidar todas as queries para atualizar os dados
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Redirecionamento já está sendo feito no useEffect
  }

  const quickStats = [
    {
      title: "Total de Agentes",
      value: Array.isArray(users) ? users.filter((u: any) => u.role === 'field_agent').length : 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Missões Ativas",
      value: Array.isArray(missions) ? missions.filter((m: any) => m.status === 'in_progress').length : 0,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Coletas Hoje",
      value: (dashboardStats as any)?.todayCollections || 0,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Dados Municipais",
      value: (municipalStats as any)?.totalRecords || 0,
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const systemHealthItems = [
    {
      name: "Servidor",
      status: (systemHealth as any)?.server?.status || "healthy",
      uptime: (systemHealth as any)?.server?.uptime || "99.9%",
    },
    {
      name: "Banco de Dados",
      status: (systemHealth as any)?.database?.status || "healthy",
      uptime: (systemHealth as any)?.database?.uptime || "99.8%",
    },
    {
      name: "Armazenamento",
      status: (systemHealth as any)?.storage?.status || "healthy",
      uptime: (systemHealth as any)?.storage?.uptime || "100%",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600 bg-green-100";
      case "warning": return "text-yellow-600 bg-yellow-100";
      case "error": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />

      <div className="p-4">
        {/* Header administrativo */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground">Bem-vindo, {user.firstName || 'Administrador'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
            <Button
              size="sm"
              onClick={() => syncSystemMutation.mutate()}
              disabled={syncSystemMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncSystemMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="operations">Operações</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Cards de estatísticas rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickStats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <div className={`h-10 w-10 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ações rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => setLocation("/admin/municipal-data")}
                    className="h-auto py-4 flex flex-col items-center space-y-2"
                    data-testid="button-municipal-data"
                  >
                    <Database className="h-6 w-6" />
                    <span className="text-sm">Dados Municipais</span>
                  </Button>

                  <Button
                    onClick={() => setActiveTab("operations")}
                    variant="secondary"
                    className="h-auto py-4 flex flex-col items-center space-y-2"
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Gerenciar Agentes</span>
                  </Button>

                  <Button
                    onClick={() => setLocation("/admin")}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center space-y-2"
                  >
                    <ListTodo className="h-6 w-6" />
                    <span className="text-sm">Missões</span>
                  </Button>

                  <Button
                    onClick={() => setActiveTab("data")}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center space-y-2"
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Relatórios</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Atividade recente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Atividade Recente</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user} • {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma atividade recente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operações */}
          <TabsContent value="operations" className="space-y-6">
            {/* Gestão de agentes */}
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Agentes de Campo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Array.isArray(users) ? users.filter((u: any) => u.role === 'field_agent' && u.isActive).length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Agentes Ativos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Array.isArray(missions) ? missions.filter((m: any) => m.status === 'in_progress').length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Missões em Andamento</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(dashboardStats as any)?.todayCollections || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Coletas Hoje</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={() => setLocation("/admin")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Missão
                    </Button>
                    <Button variant="outline">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Gerenciar Agentes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Missões recentes */}
            <Card>
              <CardHeader>
                <CardTitle>Missões Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(missions) && missions.length > 0 ? (
                    missions.slice(0, 5).map((mission: any) => (
                      <div key={mission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{mission.address || "Endereço não informado"}</p>
                          <p className="text-sm text-muted-foreground">
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
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma missão encontrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dados */}
          <TabsContent value="data" className="space-y-6">
            {/* Estatísticas de dados municipais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Municipais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(municipalStats as any)?.totalRecords || 0}</div>
                    <div className="text-sm text-muted-foreground">Total de Registros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(municipalStats as any)?.bicRecords || 0}</div>
                    <div className="text-sm text-muted-foreground">Registros BIC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(municipalStats as any)?.iptuRecords || 0}</div>
                    <div className="text-sm text-muted-foreground">Registros IPTU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(municipalStats as any)?.lastImport ? '1' : '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">Importações Hoje</div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <Button onClick={() => setLocation("/admin/municipal-data")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulários */}
            <Card>
              <CardHeader>
                <CardTitle>Formulários de Coleta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(forms) && forms.length > 0 ? (
                    forms.slice(0, 3).map((form: any) => (
                      <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{form.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Versão {form.version} • {form.isActive ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={form.isActive ? "default" : "secondary"}>
                            {form.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum formulário encontrado
                    </p>
                  )}
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={() => setLocation("/admin")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Formulário
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sistema */}
          <TabsContent value="system" className="space-y-6">
            {/* Saúde do sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Saúde do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemHealthItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          item.status === 'healthy' ? 'bg-green-500' :
                          item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Uptime: {item.uptime}
                        </span>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === 'healthy' ? 'Saudável' :
                           item.status === 'warning' ? 'Atenção' : 'Erro'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configurações do sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Configurações avançadas do sistema. Tenha cuidado ao modificar estas configurações.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" disabled>
                      <Database className="h-4 w-4 mr-2" />
                      Backup do Banco
                    </Button>
                    <Button variant="outline" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Logs do Sistema
                    </Button>
                    <Button variant="outline" disabled>
                      <Users className="h-4 w-4 mr-2" />
                      Gestão de Usuários
                    </Button>
                    <Button variant="outline" disabled>
                      <Shield className="h-4 w-4 mr-2" />
                      Configurações de Segurança
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation currentPage="admin" />
    </div>
  );
}