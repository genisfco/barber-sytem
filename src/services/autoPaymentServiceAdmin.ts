import { supabaseAdmin } from '@/lib/supabaseService';

interface AutoPaymentResult {
  success: boolean;
  message: string;
  barberShopId?: string;
  month?: number;
  year?: number;
  paymentId?: string;
}

/**
 * Verifica se já existe um pagamento para o mês/ano
 */
async function checkExistingPayment(barberShopId: string, month: number, year: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('platform_payments')
    .select('id')
    .eq('barber_shop_id', barberShopId)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error;
  }

  return !!data; // Retorna true se encontrou um pagamento
}

/**
 * Processa uma barbearia específica para criação automática de pagamento
 */
async function processBarberShop(barberShopId: string): Promise<AutoPaymentResult> {
  try {
    // Calcular mês e ano anterior
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const month = lastMonth.getMonth() + 1;
    const year = lastMonth.getFullYear();

    // 1. Verificar se já existe pagamento para o mês
    const existsPayment = await checkExistingPayment(barberShopId, month, year);
    if (existsPayment) {
      return {
        success: true,
        message: `Pagamento já existe para ${month}/${year}`,
        barberShopId,
        month,
        year
      };
    }

    // 2. Buscar dados da barbearia e contar atendimentos diretamente
    const { data: barberShop, error: barberShopError } = await supabaseAdmin
      .from('barber_shops')
      .select('platform_fee, free_trial_active, free_trial_start_date, free_trial_end_date')
      .eq('id', barberShopId)
      .single();

    if (barberShopError) {
      throw barberShopError;
    }

    // 3. Verificar período gratuito padrão
    let isFreeTrial = false;
    const checkDate = new Date(year, month - 1, 1); // Primeiro dia do mês
    
    if (barberShop.free_trial_active && barberShop.free_trial_start_date && barberShop.free_trial_end_date) {
      const startDate = new Date(barberShop.free_trial_start_date);
      const endDate = new Date(barberShop.free_trial_end_date);
      isFreeTrial = checkDate >= startDate && checkDate <= endDate;
    }

    // 4. Verificar períodos gratuitos específicos se não estiver no padrão
    if (!isFreeTrial) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      const { data: freeTrialPeriods } = await supabaseAdmin
        .from('free_trial_periods')
        .select('start_date, end_date')
        .eq('barber_shop_id', barberShopId)
        .eq('active', true)
        .lte('start_date', checkDateStr)
        .gte('end_date', checkDateStr);

      isFreeTrial = freeTrialPeriods && freeTrialPeriods.length > 0;
    }

    // 5. Contar atendimentos do mês
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('barber_shop_id', barberShopId)
      .eq('status', 'atendido')
      .gte('date', startDate)
      .lte('date', endDateStr);

    if (appointmentsError) {
      throw appointmentsError;
    }

    const appointmentsCount = appointments?.length || 0;

    // 6. Preparar dados do pagamento
    const paymentData = {
      appointments_count: appointmentsCount,
      platform_fee: barberShop.platform_fee,
      total_amount: isFreeTrial ? 0 : appointmentsCount * barberShop.platform_fee,
      is_free_trial: isFreeTrial
    };

    // 7. Verificar se está em período gratuito
    if (paymentData.is_free_trial) {
      return {
        success: true,
        message: `Barbearia em período gratuito - não gera pagamento automático`,
        barberShopId,
        month,
        year
      };
    }

    // 8. Verificar se teve atendimentos
    if (paymentData.appointments_count === 0) {
      return {
        success: true,
        message: `Nenhum atendimento no mês ${month}/${year} - não gera pagamento`,
        barberShopId,
        month,
        year
      };
    }

    // 9. Criar pagamento automático
    const { data, error } = await supabaseAdmin
      .from('platform_payments')
      .insert({
        barber_shop_id: barberShopId,
        month,
        year,
        appointments_count: Number(paymentData.appointments_count),
        platform_fee: paymentData.platform_fee,
        total_amount: paymentData.total_amount,
        payment_method: 'pix',
        notes: 'Pagamento criado automaticamente pelo sistema',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Pagamento criado automaticamente para ${month}/${year} (${paymentData.appointments_count} atendimentos)`,
      barberShopId,
      month,
      year,
      paymentId: data.id
    };

  } catch (error) {
    console.error(`Erro ao processar barbearia ${barberShopId}:`, error);
    return {
      success: false,
      message: `Erro: ${(error as Error).message}`,
      barberShopId
    };
  }
}

/**
 * Função principal que executa a criação automática de pagamentos
 * Deve ser executada a partir do dia 5 de cada mês
 */
export async function runAutomaticPaymentCreationAdmin(): Promise<AutoPaymentResult[]> {
  try {
    // Verificar se hoje é dia 5 ou posterior
    const today = new Date();
    const currentDay = today.getDate();
    
    if (currentDay < 5) {
      return [{
        success: false,
        message: `Ainda não é dia de executar - aguardar até dia 5 (hoje: dia ${currentDay})`
      }];
    }

    // Buscar todas as barbearias ativas
    const { data: barberShops, error } = await supabaseAdmin
      .from('barber_shops')
      .select('id, name')
      .eq('active', true);

    if (error) {
      throw error;
    }

    if (!barberShops || barberShops.length === 0) {
      return [{
        success: true,
        message: 'Nenhuma barbearia ativa encontrada'
      }];
    }

    // Processar cada barbearia
    const results: AutoPaymentResult[] = [];
    for (const barberShop of barberShops) {
      const result = await processBarberShop(barberShop.id);
      results.push(result);
    }

    return results;

  } catch (error) {
    console.error('Erro na execução automática de pagamentos:', error);
    return [{
      success: false,
      message: `Erro geral: ${(error as Error).message}`
    }];
  }
} 