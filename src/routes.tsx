import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useBarberShopContext } from "./contexts/BarberShopContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DebugInfo } from "./components/ui/debug-info";
import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import { useIsMobile } from "./hooks/use-mobile";
import { Menu } from "lucide-react";
import { Button } from "./components/ui/button";
import { useEffect, useState } from "react";
import { useFinancialBlock } from "./hooks/useFinancialBlock";
import { FinancialBlockModal } from "./components/FinancialBlockModal";

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
import Desempenho from "./pages/Desempenho";

const ProtectedRouteContent = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { selectedBarberShop } = useBarberShopContext();
  const { toggle } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Hook de bloqueio financeiro
  const { blocked, pendingMonths } = useFinancialBlock();
  
  // Não exibir modal de bloqueio na página financeiro
  const shouldShowBlockModal = blocked && location.pathname !== '/financeiro';

  // Timeout de segurança para evitar travamento infinito
  useEffect(() => {
    if (isAuthLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 12000); // 12 segundos

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isAuthLoading]);

  // Verifica se é uma URL de confirmação de email
  const isEmailConfirmation = location.search.includes('type=recovery') || 
                            location.search.includes('type=signup');

  // Se atingiu timeout ou está carregando há muito tempo, mostra erro
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Aguarde o Carregamento</h2>
          <p className="text-gray-300 mb-4">Estamos buscando os seus dados.</p>                 
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
          <p className="text-gray-500">Aguarde um momento.</p>
          <p className="text-gray-500">Estamos buscando os seus dados.</p>
        </div>
      </div>
    );
  }

  // Se for uma URL de confirmação de email, permite o acesso direto
  if (isEmailConfirmation) {
    return <>{children}</>;
  }

  // Se estiver na página de login, permite acesso direto
  if (location.pathname === '/auth') {
    return <>{children}</>;
  }

  // Se não houver sessão, redireciona para login
  if (!session) {
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
    return <Navigate to="/cadastro-barbearia" replace />;
  }

  // Se tiver sessão e estiver tentando acessar a página de login (já tratada acima, mas deixamos aqui por segurança)
   if (session && location.pathname === '/auth') {
      return <Navigate to="/" replace />; // Redireciona auth para / se logado
   }

  // Se chegou aqui, o usuário está logado, tem barbearia selecionada (ou está na página de config)
  // e não está tentando acessar /auth ou URL de confirmação.
  // Permite acesso à rota solicitada.
  return (
    <div className="flex min-h-screen w-full">
      {/* Modal de bloqueio financeiro */}
      <FinancialBlockModal open={shouldShowBlockModal} pendingMonths={pendingMonths} />
      
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header com botão de toggle para mobile */}
        <div className="border-b">
          <div className="flex h-16 items-center px-4 gap-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1" />
            <Header />
          </div>
        </div>
        <main className="flex-1">{children}</main>
      </div>
      <DebugInfo />
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <ProtectedRouteContent>{children}</ProtectedRouteContent>
    </SidebarProvider>
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
      <Route
        path="/desempenho"
        element={
          <ProtectedRoute>
            <Desempenho />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
} 