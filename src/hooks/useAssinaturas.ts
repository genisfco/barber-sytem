import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

interface AssinaturaCliente {
  id: string;
  client_id: string;
  subscription_plan_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'ativa' | 'cancelada' | 'suspensa' | 'expirada' | 'inadimplente';
  created_at?: string | null;
  updated_at?: string | null;
  subscription_plans: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_months: number;
    active: boolean;
    barber_shop_id: string;
    max_benefits_per_month: number;
    available_days: number[];
    subscription_plan_benefits: Array<{
      id: string;
      subscription_plan_id: string;
      benefit_type_id: string;
      service_id?: string;
      product_id?: string;
      discount_percentage?: number;
      is_unlimited: boolean;
      benefit_types: {
        id: string;
        name: string;
      };
    }>;
  };
}

export function useAssinaturaCliente(clientId: string) {
  const { selectedBarberShop } = useBarberShopContext();

  return useQuery<AssinaturaCliente | null>({
    queryKey: ["assinatura-cliente", clientId, selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop || !clientId) {
        return null;
      }

      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          subscription_plans!inner(
            *,
            subscription_plan_benefits(
              *,
              benefit_types(*)
            )
          )
        `)
        .eq('client_id', clientId)
        .eq('subscription_plans.barber_shop_id', selectedBarberShop.id)
        .in('status', ['ativa', 'inadimplente'])
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Não encontrado
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!selectedBarberShop && !!clientId
  });
}

export function useAssinaturasAtivas() {
  const { selectedBarberShop } = useBarberShopContext();

  return useQuery<AssinaturaCliente[]>({
    queryKey: ["assinaturas-ativas", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          subscription_plans!inner(
            *,
            subscription_plan_benefits(
              *,
              benefit_types(*)
            )
          )
        `)
        .eq('subscription_plans.barber_shop_id', selectedBarberShop.id)
        .in('status', ['ativa', 'inadimplente'])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberShop
  });
}

export function useBeneficiosRestantesCliente(clientSubscriptionId: string | null, maxBenefitsPerMonth: number | null) {
  return useQuery<{ usados: number; max: number } | null>({
    queryKey: ["beneficios-restantes", clientSubscriptionId, maxBenefitsPerMonth, new Date().getMonth(), new Date().getFullYear()],
    queryFn: async () => {
      if (!clientSubscriptionId || !maxBenefitsPerMonth) return null;
      const now = new Date();
      const ano = now.getFullYear();
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      function getUltimoDiaDoMes(ano: number, mes: number) {
        return new Date(ano, mes, 0).getDate();
      }
      const ultimoDia = getUltimoDiaDoMes(ano, Number(mes));
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('subscription_benefits_usage')
        .select('id')
        .eq('client_subscription_id', clientSubscriptionId)
        .gte('created_at', inicioMes)
        .lte('created_at', fimMes);
      if (error) throw error;
      return { usados: data.length, max: maxBenefitsPerMonth };
    },
    enabled: !!clientSubscriptionId && !!maxBenefitsPerMonth
  });
} 