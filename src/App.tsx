
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import Index from "./pages/Index";
import Agendamentos from "./pages/Agendamentos";
import Clientes from "./pages/Clientes";
import Barbeiros from "./pages/Barbeiros";
import Financeiro from "./pages/Financeiro";
import RelatorioMensal from "./pages/RelatorioMensal";
import RelatorioAnual from "./pages/RelatorioAnual";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <div className="flex-1">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/barbeiros" element={<Barbeiros />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/relatorio-mensal" element={<RelatorioMensal />} />
                <Route path="/relatorio-anual" element={<RelatorioAnual />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
