import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Shield } from "lucide-react";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to Replit Auth
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Home className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">Recadastramento IPTU</h1>
            <p className="text-muted-foreground mt-2">Sistema Municipal de Coleta</p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar com Replit"
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/local-login')}
              className="w-full"
              data-testid="button-admin-login"
            >
              <Shield className="w-4 h-4 mr-2" />
              Acesso Administrativo
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Faça login usando sua conta Replit para acessar o sistema
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">v1.2.0 - Offline Ready</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
