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
      // Primeiro, verifica se a barbearia já está no contexto
      if (selectedBarberShop && selectedBarberShop.admin_id === user.id) {
         return; // Barbearia já carregada, não precisa buscar novamente
      }

      // Timeout para a consulta da barbearia
      const barberShopPromise = supabase
        .from('barber_shops')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na busca da barbearia')), 10000)
      );

      const { data: barberShop, error } = await Promise.race([
        barberShopPromise,
        timeoutPromise
      ]) as any;

      if (error && error.code !== 'PGRST116') {
         throw error; // Propaga o erro para ser tratado
      }

      if (barberShop) {
        setSelectedBarberShop(barberShop);
        // Só redireciona para / se não estiver em uma página de autenticação E não for um fluxo de auth
        if (!location.pathname.includes('/auth') && !isAuthFlow) {
             navigate("/");
        }
      } else {
        setSelectedBarberShop(null);
        // Redireciona para configuração APENAS se não estiver já na página de configuração E não for um fluxo de auth
         if (location.pathname !== '/cadastro-barbearia' && !isAuthFlow) {
             navigate("/cadastro-barbearia");
         }
      }
    } catch (error: any) {
      setSelectedBarberShop(null);
       // Redireciona para configuração em caso de erro APENAS se não estiver já na página de configuração E não for um fluxo de auth
        if (location.pathname !== '/cadastro-barbearia' && !isAuthFlow) {
             navigate("/cadastro-barbearia");
        }
      throw error; // Re-lança o erro após logar e tratar
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSelectedBarberShop(null);
      setSession(null);
      navigate("/auth", { state: { loggedOut: true }, replace: true });
    } catch (error) {
      // Considerar exibir uma mensagem de erro para o usuário, mas não travar
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Email ou senha incorretos.");
      }

      // Verificar se o usuário tem o tipo correto para acessar o sistema
      const userType = data.session.user.user_metadata?.type_user;
      if (userType !== 'system_barberpro') {
        // Fazer logout do usuário inválido
        await supabase.auth.signOut();
        throw new Error("Ops! Usuário sem permissão para acessar o sistema. Se você é cliente, por favor, acesse o aplicativo BarberPro.");
      }

      setSession(data.session);
      
      // Buscar e setar barbearia APENAS após login bem sucedido, marcando como fluxo de auth
      await setUserBarberShop(data.session.user, true); // Passa true para isAuthFlow
      
    } catch (error: any) {
      setSelectedBarberShop(null); // Garante que a barbearia selecionada seja limpa em caso de erro no login
      // Propaga o erro para o componente de login tratar e exibir para o usuário
      throw new Error(error.message || "Erro ao fazer login. Tente novamente.");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Verifica se o email é válido
      if (!email || !email.includes('@')) {
        throw new Error("Email inválido");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/verify-code`,
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      throw new Error(error.message || "Erro ao atualizar a senha. Tente novamente.");
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      // Verifica se o email é válido
      if (!email || !email.includes('@')) {
        throw new Error("Email inválido");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/verify-code`,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
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
      // Verifica o código OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (verifyError) {
        throw verifyError;
      }

      // Se o código for válido, atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      throw new Error(error.message || "Erro ao verificar código ou redefinir a senha. Tente novamente.");
    }
  };

  useEffect(() => {
    let ignore = false;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        
        setSession(session);
        
        if (session?.user) {
          try {
            await setUserBarberShop(session.user, true);
          } catch (barberShopError) {
            // Não deixa o erro da barbearia travar o carregamento
          }
        }
      } catch (error) {
        // Garante que isLoading seja false mesmo com erro
        if (!ignore) {
          setIsLoading(false);
          setSession(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    // Timeout de segurança para evitar travamento infinito
    const timeout = setTimeout(() => {
      if (!ignore) {
        setIsLoading(false);
      }
    }, 15000);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!ignore) {
        setSession(session);

        if (session) {
          if (session.user) {
            try {
              await setUserBarberShop(session.user, true);
            } catch (barberShopError) {
              // Não deixa o erro da barbearia travar o processo
            }
          }
        } else {
          // Se a sessão foi removida E não estamos em uma página de autenticação NEM na página de reset de senha, redirecionar para login
           if (!location.pathname.includes('/auth') && location.pathname !== '/reset-password' && location.pathname !== '/cadastro-usuario') {
               navigate("/auth", { state: { sessionExpired: true, from: location.pathname }, replace: true });
           }
        }
      }
    });

    return () => {
      ignore = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
