import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { offlineAuth } from "@/lib/offlineAuth";

export function useAuth() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineUser, setOfflineUser] = useState<any>(null);
  const [checkingOffline, setCheckingOffline] = useState(true);

  // Online authentication query
  const { data: onlineUser, isLoading: isOnlineLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isOnline,
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Try to sync when coming back online
      if (offlineUser) {
        offlineAuth.syncWithServer();
      }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineUser]);

  // Check for cached offline user
  useEffect(() => {
    const checkOfflineAuth = async () => {
      try {
        const cachedUser = await offlineAuth.getCachedUser();
        setOfflineUser(cachedUser);
        
        if (!isOnline && cachedUser) {
          await offlineAuth.setOfflineMode(true);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação offline:', error);
      } finally {
        setCheckingOffline(false);
      }
    };

    checkOfflineAuth();
  }, [isOnline]);

  // Save online user to offline cache
  useEffect(() => {
    if (onlineUser && isOnline) {
      offlineAuth.saveUserSession(onlineUser).catch(console.error);
      setOfflineUser(onlineUser);
    }
  }, [onlineUser, isOnline]);

  // Determine user and loading state
  const user = isOnline ? onlineUser : offlineUser;
  const isLoading = isOnline ? isOnlineLoading : checkingOffline;
  const isAuthenticated = !!user;

  // Offline mode indicator
  const isOfflineMode = !isOnline && !!offlineUser;

  return {
    user,
    isLoading,
    isAuthenticated,
    isOnline,
    isOfflineMode,
    canWorkOffline: !!offlineUser,
  };
}
