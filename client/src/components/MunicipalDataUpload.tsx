import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  Download
} from "lucide-react";

interface MunicipalDataUploadProps {
  municipio: string;
  onUploadComplete?: (result: any) => void;
}

interface UploadResult {
  success: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: string[];
  duplicateRecords: number;
}

export default function MunicipalDataUpload({ municipio, onUploadComplete }: MunicipalDataUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fonte, setFonte] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/municipal-data/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      setUploadResult(result);
      setUploadProgress(100);
      toast({
        title: "Upload concluído!",
        description: `${result.validRecords} registros importados com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/municipal-data"] });
      onUploadComplete?.(result);
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível processar o arquivo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        toast({
          title: "Arquivo inválido",
          description: "Apenas arquivos CSV ou Excel são aceitos",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho (máximo 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 50MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fonte) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um arquivo e a fonte dos dados",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('municipio', municipio);
    formData.append('fonte', fonte);

    setUploadProgress(10);
    
    // Simular progresso durante o upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await uploadMutation.mutateAsync(formData);
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFonte("");
    setUploadProgress(0);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    // Criar CSV template
    const headers = [
      'inscricao_imobiliaria',
      'numero_logradouro',
      'complemento',
      'logradouro',
      'bairro',
      'cep',
      'uso_predominante',
      'area_terreno',
      'area_construida',
      'numero_pavimentos',
      'padrao_construtivo',
      'ano_construcao',
      'proprietario_nome',
      'proprietario_cpf_cnpj',
      'telefone',
      'valor_venal',
      'valor_iptu',
      'latitude',
      'longitude',
      'observacoes'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_dados_municipais.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template baixado",
      description: "Use este template para formatar seus dados",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Importar Dados Municipais</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Baixe o template para formatar seus dados corretamente</span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
          </AlertDescription>
        </Alert>

        {/* Fonte dos Dados */}
        <div className="space-y-2">
          <Label htmlFor="fonte">Fonte dos Dados</Label>
          <Select value={fonte} onValueChange={setFonte}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a fonte dos dados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BIC">BIC (Boletim de Informações Cadastrais)</SelectItem>
              <SelectItem value="IPTU">Base de Dados IPTU</SelectItem>
              <SelectItem value="Cadastro Municipal">Cadastro Municipal</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload de Arquivo */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo de Dados</Label>
            <div className="flex items-center space-x-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1"
                data-testid="input-file-upload"
              />
              {selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-reset-upload"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Badge variant="secondary">
                {selectedFile.type.includes('csv') ? 'CSV' : 'Excel'}
              </Badge>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processando arquivo...</span>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {uploadResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total de registros:</span> {uploadResult.totalRecords}
                  </div>
                  <div>
                    <span className="font-medium">Registros válidos:</span> {uploadResult.validRecords}
                  </div>
                  <div>
                    <span className="font-medium">Registros inválidos:</span> {uploadResult.invalidRecords}
                  </div>
                  <div>
                    <span className="font-medium">Duplicatas encontradas:</span> {uploadResult.duplicateRecords}
                  </div>
                </div>
                
                {uploadResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-600 mb-1">Erros encontrados:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      {uploadResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {uploadResult.errors.length > 5 && (
                        <li>• ... e mais {uploadResult.errors.length - 5} erros</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !fonte || uploadMutation.isPending}
            className="flex-1"
            data-testid="button-start-upload"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? "Processando..." : "Importar Dados"}
          </Button>
          
          {uploadResult && (
            <Button
              variant="outline"
              onClick={handleReset}
              data-testid="button-new-upload"
            >
              Novo Upload
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Formatos aceitos: CSV, Excel (.xlsx, .xls)</p>
          <p>• Tamanho máximo: 50MB</p>
          <p>• O sistema detectará automaticamente duplicatas</p>
          <p>• Dados inválidos serão reportados para correção</p>
        </div>
      </CardContent>
    </Card>
  );
}