import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useBarberShopContext } from "./contexts/BarberShopContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";

// Páginas
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Agendamentos from "./pages/Agendamentos";
import Clientes from "./pages/Clientes";
import Barbeiros from "./pages/Barbeiros";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Financeiro from "./pages/Financeiro";
import RelatorioMensal from "./pages/RelatorioMensal";
import RelatorioAnual from "./pages/RelatorioAnual";
import NotFound from "./pages/NotFound";
import Assinaturas from "./pages/Assinaturas";
import CadastroBarbearia from "./pages/CadastroBarbearia";
//import PrivateLayout from "./pages/PrivateLayout";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { selectedBarberShop } = useBarberShopContext();
  const location = useLocation();

  // Log para depuração
  console.log('ProtectedRoute', {
    session,
    selectedBarberShop,
    pathname: location.pathname
  });

  if (isAuthLoading) {
    return <div>Carregando...</div>;
  }

  // Não redireciona se estiver na página de cadastro
  if (location.pathname === '/cadastro-barbearia') {
    return <>{children}</>;
  }

  if (!session) {
    return (
      <Navigate
        to="/auth"
        state={{ sessionExpired: true, from: location.pathname }}
        replace
      />
    );
  }

  // Se não tiver barbearia, redireciona para o cadastro de barbearia
  if (!selectedBarberShop) {
    return <Navigate to="/cadastro-barbearia" />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/cadastro-barbearia" element={<CadastroBarbearia />} />

      {/* Rotas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agendamentos"
        element={
          <ProtectedRoute>
            <Agendamentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <Clientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barbeiros"
        element={
          <ProtectedRoute>
            <Barbeiros />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servicos"
        element={
          <ProtectedRoute>
            <Servicos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro"
        element={
          <ProtectedRoute>
            <Financeiro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorio-mensal"
        element={
          <ProtectedRoute>
            <RelatorioMensal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorio-anual"
        element={
          <ProtectedRoute>
            <RelatorioAnual />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <Produtos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assinaturas"
        element={
          <ProtectedRoute>
            <Assinaturas />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
} 