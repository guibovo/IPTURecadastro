import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Trash2, 
  Image as ImageIcon,
  Upload,
  AlertTriangle
} from "lucide-react";
import type { Photo } from "@/types";
import { isUnauthorizedError } from "@/lib/authUtils";

interface PhotoCaptureProps {
  missionId: string;
  photos: Photo[];
  onPhotoAdded: () => void;
}

export default function PhotoCapture({ missionId, photos, onPhotoAdded }: PhotoCaptureProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const createPhotoMutation = useMutation({
    mutationFn: async (photoData: any) => {
      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(photoData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      onPhotoAdded();
      toast({
        title: "Foto salva",
        description: "Foto adicionada à galeria com sucesso!",
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
        title: "Erro ao salvar foto",
        description: error.message || "Não foi possível salvar a foto.",
        variant: "destructive",
      });
    },
  });

  const getUploadUrlMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/photos/upload-url', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
  });

  const handleFileSelect = async (files: FileList | null, photoType: string = 'general') => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        continue;
      }

      await uploadFile(file, photoType);
    }
  };

  const uploadFile = async (file: File, photoType: string) => {
    const fileId = `${file.name}-${Date.now()}`;
    setUploadingFiles(prev => new Set(prev).add(fileId));

    try {
      // Get upload URL
      const { uploadURL } = await getUploadUrlMutation.mutateAsync();

      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Get GPS location
      let latitude, longitude, accuracy;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
        } catch (error) {
          console.warn("Could not get GPS location for photo:", error);
        }
      }

      // Create photo record
      const photoData = {
        missionId,
        type: photoType,
        filename: file.name,
        localPath: uploadURL,
        remotePath: uploadURL,
        isPrimary: photos.length === 0, // First photo is primary
        latitude,
        longitude,
        width: 0, // Will be updated after image processing
        height: 0,
        fileSize: file.size,
      };

      await createPhotoMutation.mutateAsync(photoData);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const capturePhoto = async (photoType: string) => {
    setIsCapturing(true);
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Use back camera if available
        });

        // Create a simple camera interface
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black flex flex-col';
        modal.innerHTML = `
          <div class="flex-1 relative">
            <video id="camera-video" autoplay playsinline class="w-full h-full object-cover"></video>
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
          setIsCapturing(false);
        };

        captureBtn.addEventListener('click', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `foto_${photoType}_${Date.now()}.jpg`, {
                type: 'image/jpeg'
              });
              await uploadFile(file, photoType);
            }
            cleanup();
          }, 'image/jpeg', 0.8);
        });

        cancelBtn.addEventListener('click', cleanup);
      } else {
        // Fallback to file input
        fileInputRef.current?.click();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera. Tente selecionar um arquivo.",
        variant: "destructive",
      });
      fileInputRef.current?.click();
    } finally {
      setIsCapturing(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    // TODO: Implement photo deletion
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exclusão de fotos será implementada em breve.",
    });
  };

  const photoTypes = [
    { id: 'facade', label: 'Fachada', required: true },
    { id: 'number', label: 'Numeração', required: true },
    { id: 'lateral', label: 'Lateral', required: false },
    { id: 'back', label: 'Fundos', required: false },
  ];

  const getPhotosByType = (type: string) => {
    return photos.filter(photo => photo.type === type);
  };

  const requiredPhotos = photoTypes.filter(type => type.required);
  const completedRequiredTypes = requiredPhotos.filter(type => 
    getPhotosByType(type.id).length > 0
  ).length;

  return (
    <Card>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-card-foreground">Fotos do Imóvel</h2>
          <Badge variant={completedRequiredTypes >= requiredPhotos.length ? "default" : "secondary"}>
            {photos.length}/{photoTypes.length} fotos
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* Photo Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Existing Photos */}
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square bg-muted rounded-md overflow-hidden">
                {photo.remotePath ? (
                  <img
                    src={photo.remotePath}
                    alt={`Foto ${photo.type}`}
                    className="w-full h-full object-cover"
                    data-testid={`photo-${photo.id}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                  {photo.type === 'facade' ? 'Fachada' :
                   photo.type === 'number' ? 'Número' :
                   photo.type === 'lateral' ? 'Lateral' : 'Fundos'}
                </div>
                {photo.isPrimary && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                    Principal
                  </div>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute bottom-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deletePhoto(photo.id)}
                  data-testid={`button-delete-photo-${photo.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add Photo Buttons */}
          {photoTypes.map((photoType) => {
            const existingPhotos = getPhotosByType(photoType.id);
            const isUploading = Array.from(uploadingFiles).some(fileId => 
              fileId.includes(photoType.id)
            );
            
            if (existingPhotos.length > 0) return null; // Don't show button if photo exists
            
            return (
              <Button
                key={photoType.id}
                variant="outline"
                className="aspect-square border-2 border-dashed border-border hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center"
                onClick={() => capturePhoto(photoType.id)}
                disabled={isCapturing || isUploading}
                data-testid={`button-capture-${photoType.id}`}
              >
                {isUploading ? (
                  <Upload className="h-6 w-6 animate-pulse" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
                <span className="text-xs mt-1">{photoType.label}</span>
                {photoType.required && (
                  <span className="text-xs text-red-500">*</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Requirements Alert */}
        {completedRequiredTypes < requiredPhotos.length && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              É necessário ao menos {requiredPhotos.length} fotos obrigatórias para concluir o cadastro.
              Faltam: {requiredPhotos.filter(type => getPhotosByType(type.id).length === 0)
                .map(type => type.label).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        {/* Hidden file input for fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'general')}
        />

        {/* Manual Upload Button */}
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          data-testid="button-upload-photos"
        >
          <Upload className="h-4 w-4 mr-2" />
          Selecionar da Galeria
        </Button>
      </CardContent>
    </Card>
  );
}
