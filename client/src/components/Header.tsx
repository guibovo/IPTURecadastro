import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Home, 
  User, 
  Settings, 
  LogOut,
  Wifi,
  WifiOff,
  Satellite,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

interface UserType {
  team?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export default function Header() {
  const { user, isOnline, isOfflineMode } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);


  // Get GPS accuracy
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setGpsAccuracy(Math.round(position.coords.accuracy));
        },
        (error) => {
          console.error("GPS error:", error);
          setGpsAccuracy(null);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-card border-b border-border shadow-sm relative">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-card-foreground">Recadastramento</h1>
            <p className="text-xs text-muted-foreground">
              {user?.team || "Setor Municipal"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Offline Mode Indicator */}
          {isOfflineMode && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
              Modo Offline
            </Badge>
          )}
          
          {/* Connectivity Status */}
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          
          {/* GPS Status */}
          <div className="flex items-center space-x-1">
            <Satellite className={`h-4 w-4 ${
              gpsAccuracy && gpsAccuracy <= 10 ? 'text-green-500' :
              gpsAccuracy && gpsAccuracy <= 20 ? 'text-amber-500' : 'text-red-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {gpsAccuracy ? `${gpsAccuracy}m` : "GPS"}
            </span>
          </div>
          
          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              data-testid="button-user-menu"
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>

            {showUserMenu && (
              <Card className="absolute top-full right-0 mt-2 w-64 shadow-lg z-50" data-testid="menu-user">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {user?.role === "admin" ? "Administrador" : "Agente de Campo"}
                        </Badge>
                        {user?.isActive && (
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-2">
                  {user?.role === "admin" && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm h-12"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.location.href = "/admin";
                      }}
                      data-testid="button-admin-panel"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Painel Administrativo
                    </Button>
                  )}
                  
                  {/* Theme Selector */}
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tema</p>
                    <div className="flex space-x-1">
                      <Button 
                        variant={theme === 'light' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() => setTheme('light')}
                        data-testid="button-theme-light"
                      >
                        <Sun className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={theme === 'dark' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() => setTheme('dark')}
                        data-testid="button-theme-dark"
                      >
                        <Moon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={theme === 'system' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() => setTheme('system')}
                        data-testid="button-theme-system"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm h-12"
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    data-testid="button-settings"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm h-12 text-red-600 hover:text-red-600"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
