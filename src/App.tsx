import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { BarberShopProvider } from './contexts/BarberShopContext';
import { AppRoutes } from './routes';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner
        toastOptions={{
          classNames: {
            success: 'bg-green-600 text-white border-green-700',
            error: 'bg-red-600 text-white border-red-700',
          },
        }}
      />
      <BrowserRouter>
        <BarberShopProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BarberShopProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
