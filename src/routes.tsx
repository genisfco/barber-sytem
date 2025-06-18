import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useBarberShopContext } from "./contexts/BarberShopContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DebugInfo } from "./components/ui/debug-info";
import { useEffect, useState } from "react";

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
import CadastroUser from "./pages/CadastroUser.tsx";
import CadastroBarbearia from "./pages/CadastroBarbearia.tsx";
import ConfiguracoesBarbearia from "./pages/ConfiguracoesBarbearia.tsx";
import { RequestResetPassword } from "./pages/auth/RequestResetPassword";
import { VerifyCodeAndReset } from "./pages/auth/VerifyCodeAndReset";


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { selectedBarberShop } = useBarberShopContext();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout de segurança para evitar travamento infinito
  useEffect(() => {
    if (isAuthLoading) {
      const timeout = setTimeout(() => {
        console.warn("ProtectedRoute: Timeout de carregamento atingido (10s)");
        setLoadingTimeout(true);
      }, 10000); // 10 segundos

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isAuthLoading]);

  console.log("ProtectedRoute:", {
    pathname: location.pathname,
    session: !!session,
    selectedBarberShop: !!selectedBarberShop,
    isAuthLoading,
    loadingTimeout
  });

  // Verifica se é uma URL de confirmação de email
  const isEmailConfirmation = location.search.includes('type=recovery') || 
                            location.search.includes('type=signup');

  // Se atingiu timeout ou está carregando há muito tempo, mostra erro
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Erro de Carregamento</h2>
          <p className="text-gray-500 mb-4">O carregamento está demorando mais que o esperado</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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

  // Se tiver sessão mas não tiver barbearia  E NÃO ESTIVER NA PÁGINA DE CADASTRO DE BARBEARIA
  if (session && !selectedBarberShop && location.pathname !== '/cadastro-barbearia') {
     console.log("ProtectedRoute: Usuário logado sem barbearia, redirecionando para /cadastro-barbearia.");
    return <Navigate to="/cadastro-barbearia" replace />;
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
      <DebugInfo />
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
      <Route path="/cadastro-usuario" element={<CadastroUser />} />

      {/* Rotas protegidas */}
      <Route
        path="/cadastro-barbearia"
        element={
          <ProtectedRoute>
            <CadastroBarbearia />
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
      <Route
        path="/configuracoes-barbearia"
        element={
          <ProtectedRoute>
            <ConfiguracoesBarbearia />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
} 