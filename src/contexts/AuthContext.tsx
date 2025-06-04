import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "./BarberShopContext";
import { useBarberShops } from "@/hooks/useBarberShops";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyAndResetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signOut: async () => {},
  signIn: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  requestPasswordReset: async () => {},
  verifyAndResetPassword: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBarberShop, setSelectedBarberShop } = useBarberShopContext();
  const { barberShops, getBarberShopById } = useBarberShops();

  // Função auxiliar para buscar e setar a barbearia do usuário
  const setUserBarberShop = async (user: any, isAuthFlow = false) => {
    if (!user?.id) {
      setSelectedBarberShop(null);
      return;
    }

    try {
      console.log("AuthContext: Buscando barbearia para o usuário:", user.id);
      // Primeiro, verifica se a barbearia já está no contexto
      if (selectedBarberShop && selectedBarberShop.admin_id === user.id) {
         console.log("AuthContext: Barbearia já no contexto.", selectedBarberShop.id);
         return; // Barbearia já carregada, não precisa buscar novamente
      }

      const { data: barberShop, error } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
         console.error("AuthContext: Erro ao buscar barbearia:", error);
         throw error; // Propaga o erro para ser tratado
      }

      if (barberShop) {
        console.log("AuthContext: Barbearia encontrada:", barberShop.id);
        setSelectedBarberShop(barberShop);
        // Só redireciona para / se não estiver em uma página de autenticação E não for um fluxo de auth
        if (!location.pathname.includes('/auth') && !isAuthFlow) {
             navigate("/");
        }
      } else {
        console.log("AuthContext: Nenhuma barbearia encontrada para este usuário.");
        setSelectedBarberShop(null);
        // Redireciona para configuração APENAS se não estiver já na página de configuração E não for um fluxo de auth
         if (location.pathname !== '/configuracao-barbearia' && !isAuthFlow) {
             navigate("/configuracao-barbearia");
         }
      }
    } catch (error: any) {
      console.error("AuthContext: Erro no setUserBarberShop:", error);
      setSelectedBarberShop(null);
       // Redireciona para configuração em caso de erro APENAS se não estiver já na página de configuração E não for um fluxo de auth
        if (location.pathname !== '/configuracao-barbearia' && !isAuthFlow) {
             navigate("/configuracao-barbearia");
        }
      throw error; // Re-lança o erro após logar e tratar
    }
  };

  const signOut = async () => {
    try {
      console.log("AuthContext: Iniciando logout...");
      await supabase.auth.signOut();
      setSelectedBarberShop(null);
      setSession(null);
      console.log("AuthContext: Logout bem sucedido, redirecionando para /auth");
      navigate("/auth", { state: { loggedOut: true }, replace: true });
    } catch (error) {
      console.error("AuthContext: Erro ao fazer logout:", error);
      // Considerar exibir uma mensagem de erro para o usuário, mas não travar
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      console.log("AuthContext: Iniciando login para", email);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("AuthContext: Erro no login:", error);
        throw error;
      }

      if (!data.session) {
        console.error("AuthContext: Nenhuma sessão retornada após login");
        throw new Error("Email ou senha incorretos.");
      }

      console.log("AuthContext: Login bem sucedido, session data:", data.session);
      setSession(data.session);
      
      // Buscar e setar barbearia APENAS após login bem sucedido, marcando como fluxo de auth
      await setUserBarberShop(data.session.user, true); // Passa true para isAuthFlow
      
      console.log("AuthContext: Login processado. Redirecionamento será tratado por setUserBarberShop ou ProtectedRoute.");
      // Não redirecionar aqui, deixar o setUserBarberShop ou o ProtectedRoute lidar com isso

    } catch (error: any) {
      console.error("AuthContext: Erro durante o login:", error);
      // Propaga o erro para o componente de login tratar e exibir para o usuário
      throw new Error(error.message || "Erro ao fazer login. Tente novamente.");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log("AuthContext: Iniciando recuperação de senha para", email);
      
      // Verifica se o email é válido
      if (!email || !email.includes('@')) {
        throw new Error("Email inválido");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/verify-code`,
      });
      
      if (error) {
        console.error("AuthContext: Erro detalhado na recuperação de senha:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }
      
      console.log("AuthContext: Email de recuperação enviado com sucesso");
    } catch (error: any) {
      console.error("AuthContext: Erro durante a recuperação de senha:", {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('Email not found')) {
        throw new Error("Este email não está cadastrado no sistema.");
      } else if (error.message?.includes('rate limit')) {
        throw new Error("Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.");
      } else if (error.message?.includes('invalid email')) {
        throw new Error("Email inválido. Por favor, verifique o endereço de email.");
      }
      
      throw new Error(error.message || "Erro ao enviar email de recuperação. Tente novamente.");
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log("AuthContext: Iniciando atualização de senha");
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("AuthContext: Erro ao atualizar senha:", error);
        throw error;
      }

      console.log("AuthContext: Senha atualizada com sucesso");
    } catch (error: any) {
      console.error("AuthContext: Erro durante a atualização de senha:", error);
      throw new Error(error.message || "Erro ao atualizar a senha. Tente novamente.");
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      console.log("AuthContext: Iniciando solicitação de reset de senha para", email);

      // Verifica se o email é válido
      if (!email || !email.includes('@')) {
        throw new Error("Email inválido");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/verify-code`,
      });

      if (error) {
        console.error("AuthContext: Erro detalhado na solicitação de reset de senha:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log("AuthContext: Email de solicitação de reset enviado com sucesso");
    } catch (error: any) {
      console.error("AuthContext: Erro durante a solicitação de reset de senha:", {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });

      // Mensagens de erro mais específicas
      if (error.message?.includes('Email not found')) {
        throw new Error("Este email não está cadastrado no sistema.");
      } else if (error.message?.includes('rate limit')) {
        throw new Error("Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.");
      } else if (error.message?.includes('invalid email')) {
        throw new Error("Email inválido. Por favor, verifique o endereço de email.");
      }

      throw new Error(error.message || "Erro ao enviar email de solicitação de reset. Tente novamente.");
    }
  };

  const verifyAndResetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      console.log("AuthContext: Iniciando verificação de OTP e atualização de senha");

      // Verifica o código OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (verifyError) {
        console.error("AuthContext: Erro ao verificar OTP:", verifyError);
        throw verifyError;
      }

      // Se o código for válido, atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("AuthContext: Erro ao atualizar senha após OTP verificado:", updateError);
        throw updateError;
      }

      console.log("AuthContext: OTP verificado e senha atualizada com sucesso");
    } catch (error: any) {
      console.error("AuthContext: Erro durante a verificação de OTP ou atualização de senha:", error);
      throw new Error(error.message || "Erro ao verificar código ou redefinir a senha. Tente novamente.");
    }
  };

  useEffect(() => {
    let ignore = false;

    const initializeAuth = async () => {
      console.log("AuthContext: useEffect - Inicializando autenticação...");
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!ignore) {
          setSession(currentSession);
          
          if (currentSession) {
            console.log("AuthContext: useEffect - Sessão encontrada, buscando barbearia...");
             // Buscar e setar barbearia, mas não redirecionar automaticamente do useEffect de inicialização
            await setUserBarberShop(currentSession.user, true); // Passa true para isAuthFlow
          } else {
            console.log("AuthContext: useEffect - Nenhuma sessão encontrada.");
            setSelectedBarberShop(null);
            // Se não há sessão E não estamos em uma página de autenticação, redirecionar para login
             if (!location.pathname.includes('/auth') && location.pathname !== '/cadastro-barbearia') {
                 console.log("AuthContext: useEffect - Sem sessão e fora de páginas de auth, redirecionando para /auth");
                 navigate("/auth", { state: { sessionExpired: true, from: location.pathname }, replace: true });
             }
          }
        }
      } catch (error) {
        console.error("AuthContext: useEffect - Erro ao inicializar autenticação:", error);
        if (!ignore) setIsLoading(false);
      } finally {
        if (!ignore) setIsLoading(false);
        console.log("AuthContext: useEffect - Inicialização finalizada.");
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext: onAuthStateChange - Mudança no estado de autenticação detectada", _event);
      if (!ignore) {
        setSession(session);

        if (session) {
          console.log("AuthContext: onAuthStateChange - Nova sessão ou refresh, buscando barbearia...");
           // Buscar e setar barbearia no estado de mudança, marcando como fluxo de auth
          await setUserBarberShop(session.user, true); // Passa true para isAuthFlow
        } else {
          console.log("AuthContext: onAuthStateChange - Sessão removida.");
          setSelectedBarberShop(null);
          // Se a sessão foi removida E não estamos em uma página de autenticação NEM na página de reset de senha, redirecionar para login
           if (!location.pathname.includes('/auth') && location.pathname !== '/cadastro-barbearia' && location.pathname !== '/reset-password') {
               console.log("AuthContext: onAuthStateChange - Sem sessão e fora de páginas de auth/reset, redirecionando para /auth");
               navigate("/auth", { state: { sessionExpired: true, from: location.pathname }, replace: true });
           }
        }
      }
    });

    return () => {
      ignore = true;
      console.log("AuthContext: useEffect cleanup - Cancelando inscrição de auth state change.");
      subscription.unsubscribe();
    };
     // Adicionar location.pathname como dependência pode ser necessário para reavaliar redirecionamentos ao mudar de rota
  }, [navigate, setSelectedBarberShop, location.pathname]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        signOut,
        signIn,
        resetPassword,
        updatePassword,
        requestPasswordReset,
        verifyAndResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
