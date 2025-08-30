import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  ScanText, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Eye,
  Settings
} from "lucide-react";
import { ocrProcessor, type OCRResult } from "@/lib/ocrProcessor";
import { useToast } from "@/hooks/use-toast";

interface OCRScannerProps {
  onNumberDetected?: (numbers: string[]) => void;
  defaultNumber?: string;
}

export default function OCRScanner({ onNumberDetected, defaultNumber }: OCRScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string>(defaultNumber || '');
  const [showProcessedImage, setShowProcessedImage] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Initialize OCR processor
    initializeOCR();
  }, []);

  const initializeOCR = async () => {
    try {
      await ocrProcessor.init();
      console.log('OCR inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar OCR:', error);
      toast({
        title: "Erro no OCR",
        description: "Não foi possível inicializar o reconhecimento de texto",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Create camera modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 bg-black flex flex-col';
      modal.innerHTML = `
        <div class="flex-1 relative">
          <video id="camera-video" autoplay playsinline class="w-full h-full object-cover"></video>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="border-2 border-white border-dashed w-64 h-32 bg-black bg-opacity-30"></div>
          </div>
          <div class="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
            <p class="text-sm">Centralize o número do imóvel na área destacada</p>
          </div>
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button id="capture-btn" class="bg-white text-black rounded-full p-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button id="cancel-btn" class="bg-gray-600 text-white rounded-full p-4">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const video = modal.querySelector('#camera-video') as HTMLVideoElement;
      const captureBtn = modal.querySelector('#capture-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

      video.srcObject = stream;

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };

      captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);
        cleanup();
        
        // Process the image immediately
        processImage(imageDataUrl);
      });

      cancelBtn.addEventListener('click', cleanup);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setCapturedImage(imageDataUrl);
      processImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setOcrResults(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await ocrProcessor.processForHouseNumber(imageDataUrl);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);

      const ocrResult: OCRResult = {
        text: result.join(', '),
        confidence: 0.8,
        detectedNumbers: result
      };

      setOcrResults(ocrResult);

      if (result.length > 0) {
        const bestNumber = result[0]; // Take the first (most likely) result
        setSelectedNumber(bestNumber);
        setConfidence(ocrProcessor.getNumberConfidence(ocrResult.text, bestNumber));
        
        toast({
          title: "Número detectado!",
          description: `Encontrado: ${bestNumber}`,
        });

        if (onNumberDetected) {
          onNumberDetected(result);
        }
      } else {
        toast({
          title: "Nenhum número encontrado",
          description: "Tente capturar uma imagem mais clara do número",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro no processamento OCR:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a imagem",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const retryProcessing = () => {
    if (capturedImage) {
      processImage(capturedImage);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Número copiado para a área de transferência",
    });
  };

  const selectNumber = (number: string) => {
    setSelectedNumber(number);
    if (onNumberDetected) {
      onNumberDetected([number]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ScanText className="h-5 w-5" />
            <span>Reconhecimento de Números</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capture Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={capturePhoto}
              disabled={isProcessing}
              className="flex flex-col items-center space-y-2 h-auto p-4"
              data-testid="button-capture-ocr"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Capturar</span>
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
              className="flex flex-col items-center space-y-2 h-auto p-4"
              data-testid="button-select-image-ocr"
            >
              <Eye className="h-6 w-6" />
              <span className="text-sm">Galeria</span>
            </Button>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processando imagem...</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
            </div>
          )}

          {/* Captured Image */}
          {capturedImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Imagem Capturada</span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowProcessedImage(!showProcessedImage)}
                    data-testid="button-toggle-processed"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryProcessing}
                    disabled={isProcessing}
                    data-testid="button-retry-ocr"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <img
                src={showProcessedImage ? (ocrResults?.processedImage || capturedImage) : capturedImage}
                alt="Imagem para OCR"
                className="w-full rounded border max-h-64 object-contain"
              />
            </div>
          )}

          {/* OCR Results */}
          {ocrResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Números Detectados</span>
                <Badge variant={confidence > 0.7 ? "default" : "secondary"}>
                  {Math.round(confidence * 100)}% confiança
                </Badge>
              </div>

              {ocrResults.detectedNumbers.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {ocrResults.detectedNumbers.map((number, index) => (
                    <Button
                      key={index}
                      variant={selectedNumber === number ? "default" : "outline"}
                      className="justify-between"
                      onClick={() => selectNumber(number)}
                      data-testid={`button-select-number-${index}`}
                    >
                      <span>{number}</span>
                      <div className="flex space-x-1">
                        {ocrProcessor.validateBrazilianHouseNumber(number) && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <Copy 
                          className="h-4 w-4 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(number);
                          }}
                        />
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum número válido foi encontrado. Tente uma imagem mais clara ou com melhor iluminação.
                  </AlertDescription>
                </Alert>
              )}

              {/* Full Text Result */}
              {ocrResults.text && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <strong>Texto completo:</strong> {ocrResults.text}
                </div>
              )}
            </div>
          )}

          {/* Selected Number Display */}
          {selectedNumber && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Número selecionado</p>
                  <p className="text-lg font-semibold text-primary">{selectedNumber}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(selectedNumber)}
                  data-testid="button-copy-selected"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>
    </div>
  );
}