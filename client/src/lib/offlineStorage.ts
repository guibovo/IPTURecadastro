interface StorageItem {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  syncStatus: 'pending' | 'synced' | 'error';
}

class OfflineStorage {
  private dbName = 'IPTURecadastroApp';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Property collections store
        if (!db.objectStoreNames.contains('propertyCollections')) {
          const store = db.createObjectStore('propertyCollections', { keyPath: 'id' });
          store.createIndex('missionId', 'missionId', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const store = db.createObjectStore('photos', { keyPath: 'id' });
          store.createIndex('missionId', 'missionId', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Missions cache
        if (!db.objectStoreNames.contains('missions')) {
          const store = db.createObjectStore('missions', { keyPath: 'id' });
          store.createIndex('assignedTo', 'assignedTo', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Forms cache
        if (!db.objectStoreNames.contains('forms')) {
          db.createObjectStore('forms', { keyPath: 'id' });
        }
      };
    });
  }

  async savePropertyCollection(collection: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['propertyCollections'], 'readwrite');
    const store = transaction.objectStore('propertyCollections');
    
    const storageItem: StorageItem = {
      id: collection.id || `collection_${Date.now()}`,
      type: 'propertyCollection',
      data: collection,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(storageItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue
    await this.addToSyncQueue({
      id: `sync_${storageItem.id}`,
      type: 'property_data',
      referenceId: storageItem.id,
      payload: collection,
      syncStatus: 'pending'
    });
  }

  async savePhoto(photo: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');
    
    const storageItem: StorageItem = {
      id: photo.id || `photo_${Date.now()}`,
      type: 'photo',
      data: photo,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(storageItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue
    await this.addToSyncQueue({
      id: `sync_${storageItem.id}`,
      type: 'photo_upload',
      referenceId: storageItem.id,
      payload: photo,
      syncStatus: 'pending'
    });
  }

  async addToSyncQueue(item: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const queueItem = {
      ...item,
      timestamp: Date.now(),
      attempts: 0
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('syncStatus');

    return new Promise<any[]>((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncStatus(id: string, status: 'pending' | 'synced' | 'error'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.syncStatus = status;
          item.timestamp = Date.now();
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async cacheMissions(missions: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['missions'], 'readwrite');
    const store = transaction.objectStore('missions');

    for (const mission of missions) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(mission);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getCachedMissions(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['missions'], 'readonly');
    const store = transaction.objectStore('missions');

    return new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheForms(forms: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['forms'], 'readwrite');
    const store = transaction.objectStore('forms');

    for (const form of forms) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(form);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getCachedForms(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['forms'], 'readonly');
    const store = transaction.objectStore('forms');

    return new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeNames = ['missions', 'forms'];
    const transaction = this.db.transaction(storeNames, 'readwrite');

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async exportData(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const data: any = {};
    const storeNames = ['propertyCollections', 'photos', 'syncQueue', 'missions', 'forms'];

    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      data[storeName] = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return data;
  }
}

export const offlineStorage = new OfflineStorage();

// Initialize storage when module loads
if (typeof window !== 'undefined') {
  offlineStorage.init().catch(console.error);
}
