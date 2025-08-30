interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  missionId?: string;
  userId: string;
  isInsideWorkArea: boolean;
}

interface WorkArea {
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
  isActive: boolean;
  teamId?: string;
  createdAt: Date;
}

interface MovementSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalDistance: number;
  averageSpeed: number;
  pointsCount: number;
  workAreaEntries: number;
  workAreaExits: number;
}

class LocationTracker {
  private dbName = 'RecadastramentoLocationTracker';
  private version = 1;
  private db: IDBDatabase | null = null;
  private watchId: number | null = null;
  private currentSession: MovementSession | null = null;
  private lastKnownPosition: LocationPoint | null = null;
  private isTracking = false;
  private trackingInterval: number = 30000; // 30 seconds
  
  private callbacks: {
    onLocationUpdate: Array<(point: LocationPoint) => void>;
    onGeofenceEnter: Array<(area: WorkArea) => void>;
    onGeofenceExit: Array<(area: WorkArea) => void>;
  } = {
    onLocationUpdate: [],
    onGeofenceEnter: [],
    onGeofenceExit: []
  };

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
        
        // Location points store
        if (!db.objectStoreNames.contains('locationPoints')) {
          const pointsStore = db.createObjectStore('locationPoints', { keyPath: 'id' });
          pointsStore.createIndex('userId', 'userId', { unique: false });
          pointsStore.createIndex('timestamp', 'timestamp', { unique: false });
          pointsStore.createIndex('missionId', 'missionId', { unique: false });
        }

        // Work areas store
        if (!db.objectStoreNames.contains('workAreas')) {
          const areasStore = db.createObjectStore('workAreas', { keyPath: 'id' });
          areasStore.createIndex('teamId', 'teamId', { unique: false });
          areasStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Movement sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId', { unique: false });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        }
      };
    });
  }

  // Start tracking user location
  async startTracking(userId: string, missionId?: string): Promise<boolean> {
    if (!this.db) await this.init();
    
    if (!navigator.geolocation) {
      console.error('Geolocation não suportada');
      return false;
    }

    try {
      // Request permission and get initial position
      const position = await this.getCurrentPosition();
      
      this.isTracking = true;
      this.currentSession = {
        id: `session_${Date.now()}`,
        userId,
        startTime: new Date(),
        totalDistance: 0,
        averageSpeed: 0,
        pointsCount: 0,
        workAreaEntries: 0,
        workAreaExits: 0
      };

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handleLocationUpdate(pos, userId, missionId),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );

      console.log('Rastreamento iniciado para usuário:', userId);
      return true;
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      return false;
    }
  }

  // Stop tracking
  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      await this.saveSession(this.currentSession);
      this.currentSession = null;
    }

    this.isTracking = false;
    console.log('Rastreamento parado');
  }

  private async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      });
    });
  }

  private async handleLocationUpdate(
    position: GeolocationPosition, 
    userId: string, 
    missionId?: string
  ): Promise<void> {
    const point: LocationPoint = {
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude || undefined,
      accuracy: position.coords.accuracy,
      timestamp: new Date(),
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
      missionId,
      userId,
      isInsideWorkArea: await this.checkIfInsideWorkArea(position.coords.latitude, position.coords.longitude)
    };

    // Calculate distance from last point
    if (this.lastKnownPosition && this.currentSession) {
      const distance = this.calculateDistance(
        this.lastKnownPosition.latitude,
        this.lastKnownPosition.longitude,
        point.latitude,
        point.longitude
      );
      
      this.currentSession.totalDistance += distance;
      this.currentSession.pointsCount++;
      
      // Calculate average speed
      const timeSpan = (point.timestamp.getTime() - this.currentSession.startTime.getTime()) / 1000 / 3600; // hours
      this.currentSession.averageSpeed = this.currentSession.totalDistance / timeSpan;
    }

    // Check geofencing
    await this.checkGeofencing(point);

    // Save point
    await this.saveLocationPoint(point);
    
    // Update last known position
    this.lastKnownPosition = point;

    // Notify callbacks
    this.callbacks.onLocationUpdate.forEach(callback => callback(point));
  }

  private handleLocationError(error: GeolocationPositionError): void {
    console.error('Erro de localização:', error.message);
  }

  private async checkGeofencing(point: LocationPoint): Promise<void> {
    const workAreas = await this.getActiveWorkAreas();
    
    for (const area of workAreas) {
      const isInside = this.isPointInPolygon(
        { lat: point.latitude, lng: point.longitude },
        area.polygon
      );

      const wasInside = this.lastKnownPosition 
        ? await this.checkIfInsideWorkArea(this.lastKnownPosition.latitude, this.lastKnownPosition.longitude)
        : false;

      if (isInside && !wasInside) {
        // Entered work area
        if (this.currentSession) {
          this.currentSession.workAreaEntries++;
        }
        this.callbacks.onGeofenceEnter.forEach(callback => callback(area));
      } else if (!isInside && wasInside) {
        // Exited work area
        if (this.currentSession) {
          this.currentSession.workAreaExits++;
        }
        this.callbacks.onGeofenceExit.forEach(callback => callback(area));
      }
    }
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        ((polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat)) &&
        (point.lng < (polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat) / (polygon[j].lat - polygon[i].lat) + polygon[i].lng)
      ) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  // Data access methods
  async saveLocationPoint(point: LocationPoint): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['locationPoints'], 'readwrite');
      const store = transaction.objectStore('locationPoints');
      
      const request = store.put(point);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLocationHistory(userId: string, fromDate?: Date, toDate?: Date): Promise<LocationPoint[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['locationPoints'], 'readonly');
      const store = transaction.objectStore('locationPoints');
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      request.onsuccess = () => {
        let points = request.result || [];
        
        if (fromDate || toDate) {
          points = points.filter(point => {
            const pointDate = new Date(point.timestamp);
            if (fromDate && pointDate < fromDate) return false;
            if (toDate && pointDate > toDate) return false;
            return true;
          });
        }
        
        resolve(points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(session: MovementSession): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addWorkArea(area: WorkArea): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workAreas'], 'readwrite');
      const store = transaction.objectStore('workAreas');
      
      const request = store.put(area);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveWorkAreas(): Promise<WorkArea[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workAreas'], 'readonly');
      const store = transaction.objectStore('workAreas');
      const index = store.index('isActive');
      
      const request = index.getAll(true);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async checkIfInsideWorkArea(lat: number, lng: number): Promise<boolean> {
    const workAreas = await this.getActiveWorkAreas();
    return workAreas.some(area => 
      this.isPointInPolygon({ lat, lng }, area.polygon)
    );
  }

  // Event listeners
  onLocationUpdate(callback: (point: LocationPoint) => void): void {
    this.callbacks.onLocationUpdate.push(callback);
  }

  onGeofenceEnter(callback: (area: WorkArea) => void): void {
    this.callbacks.onGeofenceEnter.push(callback);
  }

  onGeofenceExit(callback: (area: WorkArea) => void): void {
    this.callbacks.onGeofenceExit.push(callback);
  }

  // Getters
  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  getCurrentSession(): MovementSession | null {
    return this.currentSession;
  }

  getLastKnownPosition(): LocationPoint | null {
    return this.lastKnownPosition;
  }
}

export const locationTracker = new LocationTracker();
export type { LocationPoint, WorkArea, MovementSession };