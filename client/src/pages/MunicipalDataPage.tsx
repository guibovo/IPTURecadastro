import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import MunicipalDataUpload from "@/components/MunicipalDataUpload";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Database,
  Upload,
  FileText,
  BarChart3,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";

export default function MunicipalDataPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedMunicipio, setSelectedMunicipio] = useState("SP");

  // Buscar estatísticas dos dados municipais
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/municipal-data/stats', selectedMunicipio],
    enabled: !!user && user.role === 'admin',
  });

  // Buscar dados municipais recentes
  const { data: recentData, isLoading: dataLoading } = useQuery({
    queryKey: ['/api/municipal-data', selectedMunicipio],
    enabled: !!user && user.role === 'admin',
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Você precisa ser administrador para acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleUploadComplete = (result: any) => {
    // Invalidar queries para atualizar os dados
    // queryClient.invalidateQueries({ queryKey: ['/api/municipal-data'] });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Dados Municipais</h1>
          <p className="text-muted-foreground">
            Gerencie e importe dados municipais para matching inteligente
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Município: {selectedMunicipio}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{(stats as any)?.totalRecords || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{(stats as any)?.bicRecords || 0}</p>
                <p className="text-xs text-muted-foreground">Registros BIC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{(stats as any)?.iptuRecords || 0}</p>
                <p className="text-xs text-muted-foreground">Registros IPTU</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{(stats as any)?.lastImport ? '1' : '0'}</p>
                <p className="text-xs text-muted-foreground">
                  {(stats as any)?.lastImport ? 'Hoje' : 'Sem importação'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MunicipalDataUpload 
            municipio={selectedMunicipio} 
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Recent Data Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentData && Array.isArray(recentData) && recentData.length > 0 ? (
                <div className="space-y-3">
                  {recentData.slice(0, 5).map((record: any) => (
                    <div key={record.id} className="border rounded-lg p-3">
                      <div className="font-medium text-sm">
                        {record.inscricaoImobiliaria}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.logradouro}, {record.numeroLogradouro}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.proprietarioNome}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {record.fonte}
                      </Badge>
                    </div>
                  ))}
                  {recentData.length > 5 && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        +{recentData.length - 5} registros adicionais
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum dado municipal encontrado.
                    Faça o upload de um arquivo para começar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* AI Matching Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matching Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Critérios de Matching:</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Inscrição Imobiliária (100%)</li>
                  <li>• CPF/CNPJ Proprietário (90%)</li>
                  <li>• Localização GPS (80%)</li>
                  <li>• Endereço Similar (70%)</li>
                  <li>• Nome Proprietário (60%)</li>
                  <li>• Área Terreno/Construída (50%)</li>
                </ul>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Matches com 95%+ de confiança são aplicados automaticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}