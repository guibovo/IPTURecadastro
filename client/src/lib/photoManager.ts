interface PhotoMetadata {
  id: string;
  filename: string;
  missionId?: string;
  userId: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  annotations: PhotoAnnotation[];
  tags: string[];
  description?: string;
  propertyCode?: string;
  category: 'facade' | 'interior' | 'damage' | 'documentation' | 'other';
  status: 'pending' | 'uploaded' | 'synced';
  size: number;
  format: string;
  localPath?: string;
  serverPath?: string;
  thumbnailPath?: string;
}

interface PhotoAnnotation {
  id: string;
  type: 'text' | 'arrow' | 'circle' | 'square' | 'measurement';
  x: number; // Relative position (0-1)
  y: number; // Relative position (0-1)
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  timestamp: Date;
  userId: string;
}

class PhotoManager {
  private dbName = 'RecadastramentoPhotoManager';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Photo metadata store
        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('missionId', 'missionId', { unique: false });
          photosStore.createIndex('userId', 'userId', { unique: false });
          photosStore.createIndex('timestamp', 'timestamp', { unique: false });
          photosStore.createIndex('status', 'status', { unique: false });
          photosStore.createIndex('category', 'category', { unique: false });
        }

        // Photo blobs store (for offline storage)
        if (!db.objectStoreNames.contains('photoBlobs')) {
          db.createObjectStore('photoBlobs', { keyPath: 'id' });
        }

        // Thumbnails store
        if (!db.objectStoreNames.contains('thumbnails')) {
          db.createObjectStore('thumbnails', { keyPath: 'id' });
        }
      };
    });
  }

  async capturePhoto(
    missionId?: string,
    userId?: string,
    category: PhotoMetadata['category'] = 'other'
  ): Promise<PhotoMetadata | null> {
    if (!this.db) await this.init();

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      return new Promise((resolve, reject) => {
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          // Create canvas for photo capture
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame to canvas
          context?.drawImage(video, 0, 0);
          
          // Stop video stream
          stream.getTracks().forEach(track => track.stop());
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Falha ao capturar foto'));
              return;
            }

            try {
              // Get current location
              const location = await this.getCurrentLocation();
              
              // Create photo metadata
              const photoMetadata: PhotoMetadata = {
                id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                filename: `photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
                missionId,
                userId: userId || 'unknown',
                timestamp: new Date(),
                location,
                annotations: [],
                tags: [],
                category,
                status: 'pending',
                size: blob.size,
                format: 'image/jpeg'
              };

              // Save photo and metadata
              await this.savePhotoBlob(photoMetadata.id, blob);
              await this.createThumbnail(photoMetadata.id, blob);
              await this.savePhotoMetadata(photoMetadata);

              resolve(photoMetadata);
            } catch (error) {
              reject(error);
            }
          }, 'image/jpeg', 0.9);
        };
      });
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      return null;
    }
  }

  private async getCurrentLocation(): Promise<PhotoMetadata['location']> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    });
  }

  async addAnnotation(photoId: string, annotation: Omit<PhotoAnnotation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) await this.init();

    const photo = await this.getPhotoMetadata(photoId);
    if (!photo) throw new Error('Foto não encontrada');

    const newAnnotation: PhotoAnnotation = {
      ...annotation,
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    photo.annotations.push(newAnnotation);
    await this.savePhotoMetadata(photo);
  }

  async removeAnnotation(photoId: string, annotationId: string): Promise<void> {
    if (!this.db) await this.init();

    const photo = await this.getPhotoMetadata(photoId);
    if (!photo) throw new Error('Foto não encontrada');

    photo.annotations = photo.annotations.filter(a => a.id !== annotationId);
    await this.savePhotoMetadata(photo);
  }

  async updatePhotoTags(photoId: string, tags: string[]): Promise<void> {
    if (!this.db) await this.init();

    const photo = await this.getPhotoMetadata(photoId);
    if (!photo) throw new Error('Foto não encontrada');

    photo.tags = tags;
    await this.savePhotoMetadata(photo);
  }

  async updatePhotoDescription(photoId: string, description: string): Promise<void> {
    if (!this.db) await this.init();

    const photo = await this.getPhotoMetadata(photoId);
    if (!photo) throw new Error('Foto não encontrada');

    photo.description = description;
    await this.savePhotoMetadata(photo);
  }

  private async savePhotoBlob(photoId: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photoBlobs'], 'readwrite');
      const store = transaction.objectStore('photoBlobs');
      
      const request = store.put({ id: photoId, blob });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPhotoBlob(photoId: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photoBlobs'], 'readonly');
      const store = transaction.objectStore('photoBlobs');
      
      const request = store.get(photoId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async createThumbnail(photoId: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate thumbnail size (max 200px)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (thumbnailBlob) => {
          if (!thumbnailBlob) {
            reject(new Error('Falha ao criar thumbnail'));
            return;
          }

          try {
            await this.saveThumbnail(photoId, thumbnailBlob);
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 'image/jpeg', 0.8);
      };

      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = URL.createObjectURL(blob);
    });
  }

  private async saveThumbnail(photoId: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['thumbnails'], 'readwrite');
      const store = transaction.objectStore('thumbnails');
      
      const request = store.put({ id: photoId, blob });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getThumbnail(photoId: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['thumbnails'], 'readonly');
      const store = transaction.objectStore('thumbnails');
      
      const request = store.get(photoId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async savePhotoMetadata(photo: PhotoMetadata): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');
      
      const request = store.put(photo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPhotoMetadata(photoId: string): Promise<PhotoMetadata | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      
      const request = store.get(photoId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getPhotosByMission(missionId: string): Promise<PhotoMetadata[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const index = store.index('missionId');
      
      const request = index.getAll(missionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPhotos(): Promise<PhotoMetadata[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingPhotos(): Promise<PhotoMetadata[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const index = store.index('status');
      
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['photos', 'photoBlobs', 'thumbnails'], 'readwrite');
    
    const photosStore = transaction.objectStore('photos');
    const blobsStore = transaction.objectStore('photoBlobs');
    const thumbnailsStore = transaction.objectStore('thumbnails');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = photosStore.delete(photoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = blobsStore.delete(photoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = thumbnailsStore.delete(photoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  // Get data URL for displaying photo
  async getPhotoDataUrl(photoId: string): Promise<string | null> {
    const blob = await this.getPhotoBlob(photoId);
    if (!blob) return null;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  // Get thumbnail data URL
  async getThumbnailDataUrl(photoId: string): Promise<string | null> {
    const blob = await this.getThumbnail(photoId);
    if (!blob) return null;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }
}

export const photoManager = new PhotoManager();
export type { PhotoMetadata, PhotoAnnotation };