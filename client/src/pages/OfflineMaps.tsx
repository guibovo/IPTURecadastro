import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import OfflineMapManager from "@/components/OfflineMapManager";

export default function OfflineMaps() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16 pb-20">
        <OfflineMapManager />
      </main>

      <BottomNavigation currentPage="admin" />
    </div>
  );
}