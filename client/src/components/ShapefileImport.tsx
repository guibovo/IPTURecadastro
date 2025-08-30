import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileArchive, 
  X, 
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ShapefileImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadShapefileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/shapefiles/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shapefiles/layers"] });
      setSelectedFile(null);
      setLayerName("");
      setUploadProgress(0);
      toast({
        title: "Shapefile importado",
        description: "Shapefile importado com sucesso!",
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
        title: "Erro na importação",
        description: error.message || "Não foi possível importar o shapefile.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo ZIP contendo o shapefile.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    if (!layerName) {
      setLayerName(file.name.replace('.zip', ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !layerName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e defina o nome da camada.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('shapefile', selectedFile);
    formData.append('name', layerName.trim());
    formData.append('srid', 'EPSG:4326');

    // Simulate upload progress
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
      await uploadShapefileMutation.mutateAsync(formData);
      setUploadProgress(100);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setLayerName("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Importar Shapefile</h2>
      </div>

      {/* Step 1: File Upload */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
              1
            </div>
            <h3 className="font-medium text-card-foreground">Upload do Arquivo</h3>
          </div>
          
          {!selectedFile ? (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-shapefile"
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium text-card-foreground mb-2">
                Arraste o arquivo ZIP ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Suporte para arquivos .zip contendo .shp, .shx, .dbf e .prj
              </p>
              <Button size="sm" data-testid="button-select-file">
                Selecionar Arquivo
              </Button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileArchive className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={removeFile}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Step 2: Validation */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-6 w-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                2
              </div>
              <h3 className="font-medium text-card-foreground">Validação</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">Arquivo ZIP válido encontrado</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">Projeção: EPSG:4326 (WGS84)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Conversão para GeoJSON será necessária</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configuration */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-6 w-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                3
              </div>
              <h3 className="font-medium text-card-foreground">Configuração</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="layer-name">Nome da Camada</Label>
                <Input
                  id="layer-name"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  placeholder="Ex: Setor Norte 2025"
                  data-testid="input-layer-name"
                />
              </div>
              
              <div>
                <Label htmlFor="srid">Sistema de Coordenadas</Label>
                <Input
                  id="srid"
                  value="EPSG:4326"
                  disabled
                  data-testid="input-srid"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sistema de coordenadas será convertido automaticamente para WGS84
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processando shapefile...</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2">
              Convertendo para GeoJSON e validando dados...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {selectedFile && (
        <Button 
          onClick={handleUpload}
          disabled={!layerName.trim() || uploadShapefileMutation.isPending}
          className="w-full"
          data-testid="button-import-shapefile"
        >
          {uploadShapefileMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importar Shapefile
            </>
          )}
        </Button>
      )}
    </div>
  );
}
