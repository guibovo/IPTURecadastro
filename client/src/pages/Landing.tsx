import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, Loader2 } from "lucide-react";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);

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
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                E-mail
              </Label>
              <Input 
                id="email"
                type="email" 
                placeholder="usuario@exemplo.com.br"
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Senha
              </Label>
              <Input 
                id="password"
                type="password" 
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" data-testid="checkbox-remember" />
              <Label htmlFor="remember" className="text-sm text-muted-foreground">
                Lembrar de mim
              </Label>
            </div>
            
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
                "Entrar"
              )}
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">v1.2.0 - Offline Ready</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
