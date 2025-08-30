import { Button } from "@/components/ui/button";
import { 
  Home, 
  Map as MapIcon, 
  ListTodo, 
  CloudUpload,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface BottomNavigationProps {
  currentPage: "dashboard" | "map" | "missions" | "sync" | "admin";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as { user: { role?: string } | null | undefined };

  const navItems = [
    {
      id: "dashboard",
      label: "Início",
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

  // Add admin tab for admin users
  if (user?.role === "admin") {
    navItems.push({
      id: "admin",
      label: "Admin",
      icon: Settings,
      path: "/admin",
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className={`grid h-16 ${navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
