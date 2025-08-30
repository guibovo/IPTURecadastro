interface OfflineUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  team?: string;
  isActive: boolean;
  lastSync: Date;
  cacheExpiry: Date;
}

interface OfflineAuthState {
  user: OfflineUser | null;
  isOffline: boolean;
  lastOnlineAuth: Date | null;
}

class OfflineAuthManager {
  private dbName = 'RecadastramentoOfflineAuth';
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
        
        // Auth state store
        if (!db.objectStoreNames.contains('authState')) {
          db.createObjectStore('authState');
        }

        // Cached credentials store (encrypted)
        if (!db.objectStoreNames.contains('credentials')) {
          db.createObjectStore('credentials');
        }
      };
    });
  }

  async saveUserSession(user: OfflineUser): Promise<void> {
    if (!this.db) await this.init();
    
    const cacheExpiry = new Date();
    cacheExpiry.setDate(cacheExpiry.getDate() + 7); // 7 dias de cache
    
    const userWithExpiry = {
      ...user,
      cacheExpiry,
      lastSync: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['authState'], 'readwrite');
      const store = transaction.objectStore('authState');
      
      const request = store.put(userWithExpiry, 'currentUser');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedUser(): Promise<OfflineUser | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['authState'], 'readonly');
      const store = transaction.objectStore('authState');
      
      const request = store.get('currentUser');
      request.onsuccess = () => {
        const user = request.result;
        if (user && new Date() < new Date(user.cacheExpiry)) {
          resolve(user);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setOfflineMode(isOffline: boolean): Promise<void> {
    if (!this.db) await this.init();

    const authState: OfflineAuthState = {
      user: await this.getCachedUser(),
      isOffline,
      lastOnlineAuth: isOffline ? new Date() : null
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['authState'], 'readwrite');
      const store = transaction.objectStore('authState');
      
      const request = store.put(authState, 'offlineState');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineState(): Promise<OfflineAuthState | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['authState'], 'readonly');
      const store = transaction.objectStore('authState');
      
      const request = store.get('offlineState');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearOfflineAuth(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['authState', 'credentials'], 'readwrite');
      
      const authStore = transaction.objectStore('authState');
      const credStore = transaction.objectStore('credentials');
      
      Promise.all([
        new Promise(r => { authStore.clear().onsuccess = () => r(true); }),
        new Promise(r => { credStore.clear().onsuccess = () => r(true); })
      ]).then(() => resolve()).catch(reject);
    });
  }

  // Verificar se pode trabalhar offline
  async canWorkOffline(): Promise<boolean> {
    const user = await this.getCachedUser();
    return user !== null && new Date() < new Date(user.cacheExpiry);
  }

  // Sincronizar com servidor quando online
  async syncWithServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        await this.saveUserSession(userData);
        await this.setOfflineMode(false);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Falha na sincronização de auth:', error);
      return false;
    }
  }
}

export const offlineAuth = new OfflineAuthManager();