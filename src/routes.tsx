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
import ConfiguracaoBarbearia from "./pages/ConfiguracaoBarbearia";
import { RequestResetPassword } from "./pages/auth/RequestResetPassword";
import { VerifyCodeAndReset } from "./pages/auth/VerifyCodeAndReset";
//import PrivateLayout from "./pages/PrivateLayout";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { selectedBarberShop } = useBarberShopContext();
  const location = useLocation();

  console.log("ProtectedRoute:", {
    pathname: location.pathname,
    session: !!session, // Convert to boolean for cleaner log
    selectedBarberShop: !!selectedBarberShop, // Convert to boolean
    isAuthLoading
  });

  // Verifica se é uma URL de confirmação de email
  const isEmailConfirmation = location.search.includes('type=recovery') || 
                            location.search.includes('type=signup');

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Se for uma URL de confirmação de email, permite o acesso direto
  if (isEmailConfirmation) {
    console.log("ProtectedRoute: É URL de confirmação de email, permitindo acesso.");
    return <>{children}</>;
  }

  // Se estiver na página de login, permite acesso direto
  if (location.pathname === '/auth') {
     console.log("ProtectedRoute: Está na página de login, permitindo acesso.");
    return <>{children}</>;
  }

  // Se não houver sessão, redireciona para login
  if (!session) {
     console.log("ProtectedRoute: Sem sessão, redirecionando para /auth.");
    return (
      <Navigate
        to="/auth"
        state={{ sessionExpired: true, from: location.pathname }}
        replace
      />
    );
  }

  // Se tiver sessão mas não tiver barbearia selecionada E NÃO ESTIVER NA PÁGINA DE CONFIGURAÇÃO
  if (session && !selectedBarberShop && location.pathname !== '/configuracao-barbearia') {
     console.log("ProtectedRoute: Usuário logado sem barbearia, redirecionando para /configuracao-barbearia.");
    return <Navigate to="/configuracao-barbearia" replace />;
  }

  // Se tiver sessão e estiver tentando acessar a página de login (já tratada acima, mas deixamos aqui por segurança)
   if (session && location.pathname === '/auth') {
      console.log("ProtectedRoute: Usuário logado tentando acessar /auth, redirecionando para /.");
      return <Navigate to="/" replace />; // Redireciona auth para / se logado
   }

  // Se chegou aqui, o usuário está logado, tem barbearia selecionada (ou está na página de config)
  // e não está tentando acessar /auth ou URL de confirmação.
  // Permite acesso à rota solicitada.
   console.log("ProtectedRoute: Usuário logado com barbearia, permitindo acesso a", location.pathname);
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
      <Route path="/auth/request-reset" element={<RequestResetPassword />} />
      <Route path="/auth/verify-code" element={<VerifyCodeAndReset />} />
      <Route path="/cadastro-barbearia" element={<CadastroBarbearia />} />

      {/* Rotas protegidas */}
      <Route
        path="/configuracao-barbearia"
        element={
          <ProtectedRoute>
            <ConfiguracaoBarbearia />
          </ProtectedRoute>
        }
      />
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