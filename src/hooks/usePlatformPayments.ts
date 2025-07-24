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
}

// Nova interface para resultado do cálculo com detalhes
interface CalculatePaymentResult {
  appointments_count: number;
  platform_fee: number;
  total_amount: number;
  is_free_trial: boolean;
  details: {
    totalAppointments: number;
    billableAppointments: number;
    freeAppointments: number;
  };
}

export function usePlatformPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  /**
   * Verifica se uma data específica está em período gratuito
   * NOVA FUNÇÃO - Replica a lógica corrigida do Cron
   */
  const checkFreeTrialForDate = async (date: string): Promise<boolean> => {
    if (!selectedBarberShop?.id) return false;
    
    const checkDate = new Date(date);
    
    // Verificar período gratuito padrão - APENAS por datas (ignorando campo active)
    if (selectedBarberShop.free_trial_start_date && selectedBarberShop.free_trial_end_date) {
      const startDate = new Date(selectedBarberShop.free_trial_start_date);
      const endDate = new Date(selectedBarberShop.free_trial_end_date);
      
      if (checkDate >= startDate && checkDate <= endDate) {
        return true;
      }
    }

    // Verificar períodos gratuitos específicos - APENAS por datas (ignorando campo active)
    const { data: freeTrialPeriods, error } = await supabase
      .from('free_trial_periods')
      .select('start_date, end_date')
      .eq('barber_shop_id', selectedBarberShop.id)
      .lte('start_date', date)    // Período inicia antes ou na data
      .gte('end_date', date);     // Período termina depois ou na data

    if (error) {
      console.error(`Erro ao buscar períodos gratuitos específicos:`, error);
      return false;
    }

    return freeTrialPeriods && freeTrialPeriods.length > 0;
  };

  /**
   * Calcula pagamentos considerando períodos gratuitos por agendamento individual
   * NOVA FUNÇÃO - Mesma lógica do Cron
   */
  const calculateBillableAppointments = async (month: number, year: number): Promise<CalculatePaymentResult> => {
    if (!selectedBarberShop?.id) {
      throw new Error('Barbearia não selecionada');
    }

    // Buscar todos os agendamentos atendidos do mês
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Último dia do mês
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, date')
      .eq('barber_shop_id', selectedBarberShop.id)
      .eq('status', 'atendido')
      .gte('date', startDate)
      .lte('date', endDateStr);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      return {
        appointments_count: 0,
        platform_fee: selectedBarberShop.platform_fee,
        total_amount: 0,
        is_free_trial: false,
        details: {
          totalAppointments: 0,
          billableAppointments: 0,
          freeAppointments: 0
        }
      };
    }

    let billableCount = 0;
    let freeCount = 0;

    // Verificar cada agendamento individualmente
    for (const appointment of appointments) {
      const isInFreeTrial = await checkFreeTrialForDate(appointment.date);
      
      if (isInFreeTrial) {
        freeCount++;
      } else {
        billableCount++;
      }
    }

    return {
      appointments_count: billableCount,
      platform_fee: selectedBarberShop.platform_fee,
      total_amount: billableCount * selectedBarberShop.platform_fee,
      is_free_trial: false, // Sempre false para este novo cálculo
      details: {
        totalAppointments: appointments.length,
        billableAppointments: billableCount,
        freeAppointments: freeCount
      }
    };
  };

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

  // SUBSTITUÍDO: Calcular pagamento usando a nova lógica por agendamento individual
  const calculatePayment = useMutation({
    mutationFn: async ({ month, year }: CalculatePaymentData) => {
      return await calculateBillableAppointments(month, year);
    },
    onSuccess: (data) => {
      if (data) {
        let message;
        if (data.details.freeAppointments > 0) {
          message = `${data.details.totalAppointments} agendamentos: ${data.appointments_count} cobrados + ${data.details.freeAppointments} gratuitos. Valor: R$ ${data.total_amount.toFixed(2)}`;
        } else if (data.appointments_count === 0) {
          message = data.details.totalAppointments === 0 
            ? "Nenhum agendamento encontrado no período"
            : `${data.details.totalAppointments} agendamentos, mas todos em período gratuito`;
        } else {
          message = `${data.appointments_count} agendamentos atendidos. Valor: R$ ${data.total_amount.toFixed(2)}`;
        }
        
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

  // ATUALIZADO: Criar novo pagamento usando a nova lógica de cálculo
  const createPayment = useMutation({
    mutationFn: async ({ month, year, payment_method }: CreatePaymentData) => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      // Usar a nova função de cálculo
      const paymentData = await calculateBillableAppointments(month, year);
      
      if (!paymentData || paymentData.appointments_count === 0) {
        throw new Error('Não há agendamentos cobráveis para este período');
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

  // ATUALIZADO: Verificar status do período gratuito - COM campos active para controle visual
  const getFreeTrialStatus = useQuery({
    queryKey: ['free-trial-status', selectedBarberShop?.id],
    queryFn: async (): Promise<FreeTrialInfo> => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      // Verificar período gratuito padrão - datas + campo active
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

      // Verificar períodos gratuitos específicos - datas + campo active
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

  // Buscar pagamento existente para mês/ano/barbearia
  async function getExistingPayment({ month, year }: { month: number, year: number }) {
    if (!selectedBarberShop?.id) {
      throw new Error('Barbearia não selecionada');
    }
    const { data, error } = await supabase
      .from('platform_payments')
      .select('*')
      .eq('barber_shop_id', selectedBarberShop.id)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logError(error, "Erro ao buscar pagamento existente:");
      throw error;
    }
    return data; // pode ser undefined/null se não existir
  }

  return {
    platformPayments,
    isLoading,
    calculatePayment,
    createPayment,
    updatePayment,
    deletePayment,
    freeTrialStatus: getFreeTrialStatus.data,
    isFreeTrialLoading: getFreeTrialStatus.isLoading,
    getExistingPayment,
  };
} 