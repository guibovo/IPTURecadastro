interface CachedTile {
  id: string;
  url: string;
  blob: Blob;
  x: number;
  y: number;
  z: number;
  timestamp: Date;
  area?: string;
}

interface CacheArea {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  minZoom: number;
  maxZoom: number;
  totalTiles: number;
  downloadedTiles: number;
  lastUpdated: Date;
}

class MapCacheManager {
  private dbName = 'RecadastramentoMapCache';
  private version = 1;
  private db: IDBDatabase | null = null;
  private maxCacheSize = 500 * 1024 * 1024; // 500MB limit
  private tileServerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
        
        // Tiles cache store
        if (!db.objectStoreNames.contains('tiles')) {
          const tilesStore = db.createObjectStore('tiles', { keyPath: 'id' });
          tilesStore.createIndex('area', 'area', { unique: false });
          tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Cache areas store
        if (!db.objectStoreNames.contains('areas')) {
          db.createObjectStore('areas', { keyPath: 'id' });
        }
      };
    });
  }

  async downloadAreaForOffline(
    bounds: { north: number; south: number; east: number; west: number },
    areaName: string,
    minZoom: number = 10,
    maxZoom: number = 16,
    onProgress?: (progress: number, totalTiles: number, downloadedTiles: number) => void
  ): Promise<string> {
    if (!this.db) await this.init();
    
    const areaId = `area_${Date.now()}`;
    const tiles: { x: number; y: number; z: number }[] = [];

    // Calculate all tiles for the area
    for (let z = minZoom; z <= maxZoom; z++) {
      const northWest = this.latLngToTile(bounds.north, bounds.west, z);
      const southEast = this.latLngToTile(bounds.south, bounds.east, z);
      
      for (let x = northWest.x; x <= southEast.x; x++) {
        for (let y = northWest.y; y <= southEast.y; y++) {
          tiles.push({ x, y, z });
        }
      }
    }

    const totalTiles = tiles.length;
    let downloadedTiles = 0;

    // Save area info
    const area: CacheArea = {
      id: areaId,
      name: areaName,
      bounds,
      minZoom,
      maxZoom,
      totalTiles,
      downloadedTiles: 0,
      lastUpdated: new Date()
    };

    await this.saveArea(area);

    // Download tiles in batches
    const batchSize = 10;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      const promises = batch.map(tile => this.downloadTile(tile.x, tile.y, tile.z, areaId));
      
      try {
        await Promise.allSettled(promises);
        downloadedTiles += batch.length;
        
        // Update progress
        if (onProgress) {
          onProgress((downloadedTiles / totalTiles) * 100, totalTiles, downloadedTiles);
        }

        // Update area progress
        area.downloadedTiles = downloadedTiles;
        await this.saveArea(area);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Erro no download do lote:', error);
      }
    }

    return areaId;
  }

  private async downloadTile(x: number, y: number, z: number, areaId: string): Promise<void> {
    const tileId = `${z}_${x}_${y}`;
    
    // Check if tile already exists
    const existingTile = await this.getTile(tileId);
    if (existingTile) return;

    try {
      const url = this.tileServerUrl
        .replace('{s}', 'a')
        .replace('{x}', x.toString())
        .replace('{y}', y.toString())
        .replace('{z}', z.toString());

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      
      const cachedTile: CachedTile = {
        id: tileId,
        url,
        blob,
        x,
        y,
        z,
        timestamp: new Date(),
        area: areaId
      };

      await this.saveTile(cachedTile);
    } catch (error) {
      console.error(`Erro ao baixar tile ${tileId}:`, error);
    }
  }

  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
  }

  async getTile(tileId: string): Promise<CachedTile | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      
      const request = store.get(tileId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveTile(tile: CachedTile): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      
      const request = store.put(tile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedAreas(): Promise<CacheArea[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['areas'], 'readonly');
      const store = transaction.objectStore('areas');
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveArea(area: CacheArea): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['areas'], 'readwrite');
      const store = transaction.objectStore('areas');
      
      const request = store.put(area);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteArea(areaId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tiles', 'areas'], 'readwrite');
      const tilesStore = transaction.objectStore('tiles');
      const areasStore = transaction.objectStore('areas');

      // Delete all tiles for this area
      const tilesIndex = tilesStore.index('area');
      const tilesRequest = tilesIndex.openCursor(IDBKeyRange.only(areaId));
      
      tilesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // Delete area record
          areasStore.delete(areaId);
          resolve();
        }
      };
      
      tilesRequest.onerror = () => reject(tilesRequest.error);
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      
      let totalSize = 0;
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          totalSize += cursor.value.blob.size;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get blob URL for offline tile
  getTileUrl(x: number, y: number, z: number): Promise<string | null> {
    const tileId = `${z}_${x}_${y}`;
    return this.getTile(tileId).then(tile => {
      if (tile) {
        return URL.createObjectURL(tile.blob);
      }
      return null;
    });
  }

  async clearOldTiles(daysOld: number = 30): Promise<void> {
    if (!this.db) await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

export const mapCache = new MapCacheManager();