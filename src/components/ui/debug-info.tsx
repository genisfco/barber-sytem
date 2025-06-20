import { useAuth } from "@/contexts/AuthContext";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { useLocation } from "react-router-dom";

export const DebugInfo = () => {
  const { session, isLoading } = useAuth();
  const { selectedBarberShop } = useBarberShopContext();
  const location = useLocation();

  // Só mostra em desenvolvimento
  if (import.meta.env.PROD) return null;

  /*return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div>Path: {location.pathname}</div>
        <div>Auth Loading: {isLoading ? "✅" : "❌"}</div>
        <div>Session: {session ? "✅" : "❌"}</div>
        <div>BarberShop: {selectedBarberShop ? "✅" : "❌"}</div>
        <div>User ID: {session?.user?.id || "N/A"}</div>
        <div>BarberShop ID: {selectedBarberShop?.id || "N/A"}</div>
      </div>
    </div>
  );*/
}; 