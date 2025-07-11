import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { logError } from '@/utils/logger';
import { useBarberShopContext } from '@/contexts/BarberShopContext';
// Removido: import { paymentService } from '@/services/paymentService';

type PlatformPayment = Database['public']['Tables']['platform_payments']['Row'];
type PlatformPaymentInsert = Database['public']['Tables']['platform_payments']['Insert'];
type PlatformPaymentUpdate = Database['public']['Tables']['platform_payments']['Update'];

interface CalculatePaymentData {
  month: number;
  year: number;
}

interface FreeTrialInfo {
  isFreeTrial: boolean;
  startDate?: string;
  endDate?: string;
  daysLeft?: number;
  reason?: string;
}

interface CreatePaymentData {
  month: number;
  year: number;
  payment_method?: string;
  notes?: string;
}

export function usePlatformPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  // Buscar pagamentos da plataforma
  const { data: platformPayments, isLoading } = useQuery({
    queryKey: ['platform-payments', selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      const { data, error } = await supabase
        .from('platform_payments')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        logError(error, "Erro ao buscar pagamentos da plataforma:");
        throw error;
      }

      return data || [];
    },
    enabled: !!selectedBarberShop?.id,
  });

  // Calcular pagamento para um mês/ano específico
  const calculatePayment = useMutation({
    mutationFn: async ({ month, year }: CalculatePaymentData) => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      const { data, error } = await supabase
        .rpc('calculate_platform_payment', {
          p_barber_shop_id: selectedBarberShop.id,
          p_month: month,
          p_year: year
        });

      if (error) {
        logError(error, "Erro ao calcular pagamento da plataforma:");
        throw error;
      }

      return data?.[0] || null;
    },
    onSuccess: (data) => {
      if (data) {
        const message = data.is_free_trial 
          ? `${data.appointments_count} agendamentos atendidos. Período gratuito ativo!`
          : `${data.appointments_count} agendamentos atendidos. Valor: R$ ${data.total_amount.toFixed(2)}`;
        
        toast({
          title: "Cálculo realizado",
          description: message,
        });
      }
    },
    onError: (error) => {
      logError(error, "Erro ao calcular pagamento:");
      toast({
        title: "Erro",
        description: "Erro ao calcular pagamento da plataforma",
        variant: "destructive",
      });
    },
  });

  // Criar novo pagamento
  const createPayment = useMutation({
    mutationFn: async ({ month, year, payment_method, notes }: CreatePaymentData) => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      // Primeiro calcular o valor
      const calculation = await supabase
        .rpc('calculate_platform_payment', {
          p_barber_shop_id: selectedBarberShop.id,
          p_month: month,
          p_year: year
        });

      if (calculation.error) {
        throw calculation.error;
      }

      const paymentData = calculation.data?.[0];
      if (!paymentData) {
        throw new Error('Não foi possível calcular o pagamento');
      }

      // Criar o pagamento
      const { data, error } = await supabase
        .from('platform_payments')
        .insert({
          barber_shop_id: selectedBarberShop.id,
          month,
          year,
          appointments_count: Number(paymentData.appointments_count),
          platform_fee: paymentData.platform_fee,
          total_amount: paymentData.total_amount,
          payment_method,
          notes,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logError(error, "Erro ao criar pagamento da plataforma:");
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
      toast({
        title: "Pagamento criado",
        description: "Pagamento da plataforma criado com sucesso",
      });
    },
    onError: (error) => {
      logError(error, "Erro ao criar pagamento:");
      toast({
        title: "Erro",
        description: "Erro ao criar pagamento da plataforma",
        variant: "destructive",
      });
    },
  });

  // Atualizar pagamento
  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PlatformPaymentUpdate>) => {
      const { data, error } = await supabase
        .from('platform_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logError(error, "Erro ao atualizar pagamento da plataforma:");
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
      toast({
        title: "Pagamento atualizado",
        description: "Pagamento da plataforma atualizado com sucesso",
      });
    },
    onError: (error) => {
      logError(error, "Erro ao atualizar pagamento:");
      toast({
        title: "Erro",
        description: "Erro ao atualizar pagamento da plataforma",
        variant: "destructive",
      });
    },
  });

  // Excluir pagamento
  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_payments')
        .delete()
        .eq('id', id);

      if (error) {
        logError(error, "Erro ao excluir pagamento da plataforma:");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
      toast({
        title: "Pagamento excluído",
        description: "Pagamento da plataforma excluído com sucesso",
      });
    },
    onError: (error) => {
      logError(error, "Erro ao excluir pagamento:");
      toast({
        title: "Erro",
        description: "Erro ao excluir pagamento da plataforma",
        variant: "destructive",
      });
    },
  });

  // Removido: generatePixQRCode

  // Verificar status do período gratuito
  const getFreeTrialStatus = useQuery({
    queryKey: ['free-trial-status', selectedBarberShop?.id],
    queryFn: async (): Promise<FreeTrialInfo> => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      // Verificar período gratuito padrão
      if (selectedBarberShop.free_trial_active && selectedBarberShop.free_trial_start_date && selectedBarberShop.free_trial_end_date) {
        const today = new Date();
        const startDate = new Date(selectedBarberShop.free_trial_start_date);
        const endDate = new Date(selectedBarberShop.free_trial_end_date);
        
        if (today >= startDate && today <= endDate) {
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            isFreeTrial: true,
            startDate: selectedBarberShop.free_trial_start_date,
            endDate: selectedBarberShop.free_trial_end_date,
            daysLeft,
            reason: `Período gratuito padrão (${selectedBarberShop.free_trial_days} dias)`
          };
        }
      }

      // Verificar períodos gratuitos específicos
      const { data: freeTrialPeriods, error } = await supabase
        .from('free_trial_periods')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .eq('active', true)
        .order('end_date', { ascending: true });

      if (error) {
        logError(error, "Erro ao verificar períodos gratuitos:");
        throw error;
      }

      if (freeTrialPeriods && freeTrialPeriods.length > 0) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const vigente = freeTrialPeriods.find(period => {
          return todayStr >= period.start_date && todayStr <= period.end_date;
        });
        if (vigente) {
          // Calcular dias restantes considerando só a data
          const endDate = new Date(vigente.end_date);
          const endDateStr = vigente.end_date;
          const diffTime = new Date(endDateStr).getTime() - new Date(todayStr).getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            isFreeTrial: true,
            startDate: vigente.start_date,
            endDate: vigente.end_date,
            daysLeft,
            reason: vigente.reason || 'Período gratuito especial'
          };
        }
      }

      return { isFreeTrial: false };
    },
    enabled: !!selectedBarberShop?.id,
  });

  return {
    platformPayments,
    isLoading,
    calculatePayment,
    createPayment,
    updatePayment,
    deletePayment,
    // generatePixQRCode removido
    freeTrialStatus: getFreeTrialStatus.data,
    isFreeTrialLoading: getFreeTrialStatus.isLoading,
  };
} 