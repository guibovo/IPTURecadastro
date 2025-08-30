import { Button } from "@/components/ui/button";
import { 
  Home, 
  Map as MapIcon, 
  ListTodo, 
  CloudUpload,
  Settings,
  Star
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface BottomNavigationProps {
  currentPage: "dashboard" | "map" | "missions" | "sync" | "admin" | "features";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as { user: { role?: string } | null | undefined };

  const navItems = [
    {
      id: "dashboard",
      label: user?.role === "admin" ? "Dashboard" : "Início",
      icon: Home,
      path: "/",
    },
    {
      id: "map",
      label: "Mapa",
      icon: MapIcon,
      path: "/map",
    },
    {
      id: "missions",
      label: "Missões",
      icon: ListTodo,
      path: "/missions",
    },
    {
      id: "sync",
      label: "Sync",
      icon: CloudUpload,
      path: "/sync",
    },
  ];

  // Add appropriate tabs based on user role
  if (user?.role === "admin") {
    navItems.push({
      id: "admin",
      label: "Config",
      icon: Settings,
      path: "/admin",
    });
  } else {
    navItems.push({
      id: "features",
      label: "Recursos",
      icon: Star,
      path: "/features",
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-lg">
      <div className={`grid h-20 ${navItems.length >= 6 ? 'grid-cols-5' : navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none min-h-[44px] ${
                isActive 
                  ? "text-primary bg-primary/10 border-t-2 border-t-primary" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className={`${isActive ? 'h-6 w-6' : 'h-5 w-5'} transition-all`} />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
