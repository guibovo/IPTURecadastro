import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Trash2, 
  Image as ImageIcon,
  Upload,
  AlertTriangle,
  Edit3,
  Save,
  Type,
  Circle,
  Square,
  ArrowRight,
  Ruler,
  Tag
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [selectedTool, setSelectedTool] = useState<'text' | 'arrow' | 'circle' | 'square' | 'measurement'>('text');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoTags, setPhotoTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);

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

  const handleEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setPhotoDescription(photo.description || '');
    setPhotoTags(photo.tags || []);
    setAnnotations(photo.annotations || []);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    if (selectedTool === 'text') {
      const text = prompt('Digite o texto da anotação:');
      if (text) {
        const newAnnotation = {
          id: `annotation_${Date.now()}`,
          type: 'text',
          x,
          y,
          text,
          color: selectedColor,
          strokeWidth: 2,
          timestamp: new Date()
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      }
    } else {
      setCurrentAnnotation({
        type: selectedTool,
        x,
        y,
        color: selectedColor,
        strokeWidth: 2
      });
      setIsDrawing(true);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setCurrentAnnotation({
      ...currentAnnotation,
      width: Math.abs(x - currentAnnotation.x),
      height: Math.abs(y - currentAnnotation.y)
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;

    if (currentAnnotation.width && currentAnnotation.height) {
      const newAnnotation = {
        ...currentAnnotation,
        id: `annotation_${Date.now()}`,
        timestamp: new Date()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const savePhotoAnnotations = async () => {
    if (!editingPhoto) return;

    try {
      // Save annotations to photo
      const updateData = {
        description: photoDescription,
        tags: photoTags,
        annotations: annotations
      };

      // TODO: Implement API call to update photo
      toast({
        title: "Anotações salvas!",
        description: "As anotações da foto foram salvas com sucesso",
      });

      setEditingPhoto(null);
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as anotações",
        variant: "destructive"
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !photoTags.includes(newTag.trim())) {
      setPhotoTags([...photoTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPhotoTags(photoTags.filter(tag => tag !== tagToRemove));
  };

  const redrawCanvas = () => {
    if (!canvasRef.current || !editingPhoto?.remotePath) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw annotations
      annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.fillStyle = annotation.color;

        const x = annotation.x * canvas.width;
        const y = annotation.y * canvas.height;

        switch (annotation.type) {
          case 'text':
            ctx.font = '16px Arial';
            ctx.fillText(annotation.text || '', x, y);
            break;
          case 'circle':
            const radius = (annotation.width || 0.1) * canvas.width / 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          case 'square':
            const width = (annotation.width || 0.1) * canvas.width;
            const height = (annotation.height || 0.1) * canvas.height;
            ctx.strokeRect(x, y, width, height);
            break;
          case 'arrow':
            const endX = x + (annotation.width || 0.1) * canvas.width;
            const endY = y + (annotation.height || 0.1) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
        }
      });

      // Draw current annotation being created
      if (currentAnnotation && currentAnnotation.width && currentAnnotation.height) {
        ctx.strokeStyle = currentAnnotation.color;
        ctx.lineWidth = currentAnnotation.strokeWidth;
        
        const currX = currentAnnotation.x * canvas.width;
        const currY = currentAnnotation.y * canvas.height;
        const currWidth = currentAnnotation.width * canvas.width;
        const currHeight = currentAnnotation.height * canvas.height;

        switch (currentAnnotation.type) {
          case 'circle':
            const radius = Math.max(currWidth, currHeight) / 2;
            ctx.beginPath();
            ctx.arc(currX, currY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          case 'square':
            ctx.strokeRect(currX, currY, currWidth, currHeight);
            break;
          case 'arrow':
            ctx.beginPath();
            ctx.moveTo(currX, currY);
            ctx.lineTo(currX + currWidth, currY + currHeight);
            ctx.stroke();
            break;
        }
      }
    };
    img.src = editingPhoto.remotePath;
  };

  useEffect(() => {
    if (editingPhoto) {
      redrawCanvas();
    }
  }, [editingPhoto, annotations, currentAnnotation]);

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
                <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 bg-white/80"
                    onClick={() => handleEditPhoto(photo)}
                    data-testid={`button-edit-photo-${photo.id}`}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 w-6 p-0"
                    onClick={() => deletePhoto(photo.id)}
                    data-testid={`button-delete-photo-${photo.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
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

      {/* Photo Editor Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Editar Foto</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPhoto(null)}
                  data-testid="button-close-editor"
                >
                  ×
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Annotation Tools */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                <Button
                  size="sm"
                  variant={selectedTool === 'text' ? "default" : "outline"}
                  onClick={() => setSelectedTool('text')}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Texto
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'arrow' ? "default" : "outline"}
                  onClick={() => setSelectedTool('arrow')}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Seta
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'circle' ? "default" : "outline"}
                  onClick={() => setSelectedTool('circle')}
                >
                  <Circle className="h-4 w-4 mr-1" />
                  Círculo
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'square' ? "default" : "outline"}
                  onClick={() => setSelectedTool('square')}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Quadrado
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'measurement' ? "default" : "outline"}
                  onClick={() => setSelectedTool('measurement')}
                >
                  <Ruler className="h-4 w-4 mr-1" />
                  Medição
                </Button>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Label htmlFor="color">Cor:</Label>
                  <input
                    id="color"
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded border"
                  />
                </div>
              </div>

              {/* Photo Canvas */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full border rounded-lg cursor-crosshair"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  style={{ maxWidth: '100%', height: 'auto' }}
                  data-testid="photo-editor-canvas"
                />
              </div>

              {/* Photo Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o que está na foto..."
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    data-testid="input-photo-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Nova tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      data-testid="input-new-photo-tag"
                    />
                    <Button size="sm" onClick={handleAddTag}>
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {photoTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{editingPhoto.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tamanho</p>
                  <p className="font-medium">{(editingPhoto.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Anotações</p>
                  <p className="font-medium">{annotations.length}</p>
                </div>
                {editingPhoto.latitude && editingPhoto.longitude && (
                  <div>
                    <p className="text-muted-foreground">GPS</p>
                    <p className="font-medium">
                      {editingPhoto.latitude.toFixed(6)}, {editingPhoto.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={savePhotoAnnotations}
                  className="flex-1"
                  data-testid="button-save-annotations"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Anotações
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEditingPhoto(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
