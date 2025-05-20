import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "./BarberShopContext";
import { useBarberShops } from "@/hooks/useBarberShops";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signOut: async () => {},
  signIn: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { setSelectedBarberShop } = useBarberShopContext();
  const { barberShops, getBarberShopById } = useBarberShops();

  // Função auxiliar para buscar e setar a barbearia do usuário
  const setUserBarberShop = async (user: any) => {
    let barberShopId = user?.user_metadata?.barberShopId;
    
    if (!barberShopId && user?.id) {
      const found = barberShops?.find((shop) => shop.admin_id === user.id);
      if (found) barberShopId = found.id;
    }
    
    if (barberShopId) {
      try {
        const barberShop = await getBarberShopById(barberShopId);
        setSelectedBarberShop(barberShop);
      } catch (e) {
        setSelectedBarberShop(null);
        navigate("/cadastro-barbearia");
      }
    } else {
      setSelectedBarberShop(null);
      navigate("/cadastro-barbearia");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSelectedBarberShop(null);
    navigate("/auth", { state: { loggedOut: true }, replace: true });
  };

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    console.log("Retorno do Supabase:", { error, data });
    if (error) throw error;
    if (!data.session) {
      throw new Error("Email ou senha incorretos.");
    }
    await setUserBarberShop(data.session.user);
    navigate("/");
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (session) {
        await setUserBarberShop(session.user);
      } else {
        setSelectedBarberShop(null);
        if (window.location.pathname !== '/cadastro-barbearia') {
          navigate("/auth", { state: { sessionExpired: true, from: window.location.pathname }, replace: true });
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        setSelectedBarberShop(null);
        if (window.location.pathname !== '/cadastro-barbearia') {
          navigate("/auth", { state: { sessionExpired: true, from: window.location.pathname }, replace: true });
        }
      } else {
        await setUserBarberShop(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, setSelectedBarberShop]);

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut, signIn }}>
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
