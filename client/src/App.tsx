import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Map from "@/pages/Map";
import Missions from "@/pages/Missions";
import PropertyForm from "@/pages/PropertyForm";
import Sync from "@/pages/Sync";
import Admin from "@/pages/Admin";
import OfflineMaps from "@/pages/OfflineMaps";
import LocationTracking from "@/pages/LocationTracking";
import Features from "@/pages/Features";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/map" component={Map} />
          <Route path="/missions" component={Missions} />
          <Route path="/missions/:id/form" component={PropertyForm} />
          <Route path="/sync" component={Sync} />
          <Route path="/admin" component={Admin} />
          <Route path="/offline-maps" component={OfflineMaps} />
          <Route path="/location-tracking" component={LocationTracking} />
          <Route path="/features" component={Features} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
