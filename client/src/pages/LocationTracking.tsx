import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import LocationTrackerComponent from "@/components/LocationTracker";

export default function LocationTracking() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 pb-20">
        <LocationTrackerComponent />
      </main>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
}