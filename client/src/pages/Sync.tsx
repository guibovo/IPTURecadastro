import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  CloudUpload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Images,
  Home,
  Wifi,
  WifiOff
} from "lucide-react";
import { useLocation } from "wouter";
import type { SyncQueueItem } from "@/types";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Sync() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: syncQueue, isLoading } = useQuery<SyncQueueItem[]>({
    queryKey: ["/api/sync/queue"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const processSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/process', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/queue"] });
      toast({
        title: "Sincronização iniciada",
        description: `${data.processed} itens processados com sucesso.`,
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
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    },
  });

  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export/csv', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'recadastramento.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    },
    onSuccess: () => {
      toast({
        title: "CSV exportado",
        description: "Arquivo de dados baixado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na exportação",
        description: error.message || "Não foi possível exportar os dados.",
        variant: "destructive",
      });
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

  const syncStats = {
    pending: syncQueue?.filter(item => item.status === 'pending').length || 0,
    synced: syncQueue?.filter(item => item.status === 'completed').length || 0,
    errors: syncQueue?.filter(item => item.status === 'failed').length || 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Sincronizada';
      case 'failed':
        return 'Erro';
      case 'processing':
        return 'Processando';
      default:
        return 'Aguardando';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo_upload':
        return <Images className="h-4 w-4" />;
      default:
        return <Home className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'property_data':
        return 'Dados do imóvel';
      case 'photo_upload':
        return 'Upload de foto';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <Header />
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
        <BottomNavigation currentPage="sync" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Sync Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
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
            <h1 className="font-semibold text-card-foreground">Sincronização</h1>
            <p className="text-xs text-muted-foreground">
              Última sync: {syncQueue?.length ? 'há 2 horas' : 'nunca'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-600">Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sync Status Cards */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-sync">
                {syncStats.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-synced-count">
                {syncStats.synced}
              </div>
              <div className="text-xs text-muted-foreground">Sincronizadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600" data-testid="text-error-count">
                {syncStats.errors}
              </div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Sync Button */}
        <Button 
          onClick={() => processSyncMutation.mutate()}
          disabled={processSyncMutation.isPending || !isOnline}
          className="w-full bg-primary text-primary-foreground flex items-center justify-center"
          data-testid="button-sync-now"
        >
          {processSyncMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Agora
            </>
          )}
        </Button>

        {/* Sync Queue */}
        <Card>
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-card-foreground">Fila de Sincronização</h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {syncQueue?.length ? (
              syncQueue.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between" data-testid={`sync-item-${item.id}`}>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {getTypeLabel(item.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.error ? item.error.substring(0, 50) + '...' : 
                         item.attempts > 0 ? `Tentativa ${item.attempts}` : 'Aguardando'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <Badge variant="secondary" className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-card-foreground mb-2">Fila vazia</h3>
                <p className="text-sm text-muted-foreground">
                  Não há itens aguardando sincronização.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Export Options */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-medium text-card-foreground mb-3">Exportar Dados</h2>
            <div className="space-y-2">
              <Button 
                variant="outline"
                onClick={() => exportCSVMutation.mutate()}
                disabled={exportCSVMutation.isPending}
                className="w-full text-left justify-start"
                data-testid="button-export-csv"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar dados coletados (CSV)
              </Button>
              <Button 
                variant="outline"
                className="w-full text-left justify-start"
                disabled
                data-testid="button-export-photos"
              >
                <Images className="h-4 w-4 mr-2" />
                Exportar fotos compactadas (ZIP)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offline Warning */}
        {!isOnline && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Modo Offline</p>
                  <p className="text-xs text-amber-700">
                    A sincronização será realizada automaticamente quando a conexão for restaurada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation currentPage="sync" />
    </div>
  );
}
