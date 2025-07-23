import { createClient } from '@supabase/supabase-js';

// Cliente para operações administrativas (bypassa RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Verifica se já existe um pagamento para o mês/ano
 */
async function checkExistingPayment(barberShopId, month, year) {
  const { data, error } = await supabaseAdmin
    .from('platform_payments')
    .select('id')
    .eq('barber_shop_id', barberShopId)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return !!data;
}

/**
 * Processa uma barbearia específica
 */
async function processBarberShop(barberShopId) {
  try {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const month = lastMonth.getMonth() + 1;
    const year = lastMonth.getFullYear();

    // Verificar se já existe um pagamento para este mês
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

    // Buscar informações da barbearia
    const { data: barberShop, error: barberShopError } = await supabaseAdmin
      .from('barber_shops')
      .select('platform_fee, free_trial_active, free_trial_start_date, free_trial_end_date')
      .eq('id', barberShopId)
      .single();

    if (barberShopError) {
      throw barberShopError;
    }

    // Verificar se está em período gratuito
    let isFreeTrial = false;
    const checkDate = new Date(year, month - 1, 1); // Primeiro dia do mês a verificar

    // Verificar período gratuito padrão
    if (barberShop.free_trial_active && barberShop.free_trial_start_date && barberShop.free_trial_end_date) {
      const startDate = new Date(barberShop.free_trial_start_date);
      const endDate = new Date(barberShop.free_trial_end_date);
      
      if (checkDate >= startDate && checkDate <= endDate) {
        isFreeTrial = true;
      }
    }

    // Verificar períodos gratuitos especiais
    if (!isFreeTrial) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      const { data: freeTrialPeriods } = await supabaseAdmin
        .from('free_trial_periods')
        .select('start_date, end_date')
        .eq('barber_shop_id', barberShopId)
        .eq('active', true)
        .lte('start_date', checkDateStr)
        .gte('end_date', checkDateStr);

      if (freeTrialPeriods && freeTrialPeriods.length > 0) {
        isFreeTrial = true;
      }
    }

    // Contar agendamentos atendidos do mês anterior
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Último dia do mês
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

    // Calcular dados do pagamento
    const paymentData = {
      appointments_count: appointmentsCount,
      platform_fee: barberShop.platform_fee,
      total_amount: isFreeTrial ? 0 : appointmentsCount * barberShop.platform_fee,
      is_free_trial: isFreeTrial
    };

    // Se está em período gratuito, não cria pagamento
    if (paymentData.is_free_trial) {
      return {
        success: true,
        message: `Barbearia em período gratuito - não gera pagamento automático`,
        barberShopId,
        month,
        year
      };
    }

    // Se não teve atendimentos, não cria pagamento
    if (paymentData.appointments_count === 0) {
      return {
        success: true,
        message: `Nenhum atendimento no mês ${month}/${year} - não gera pagamento`,
        barberShopId,
        month,
        year
      };
    }

    // Criar o pagamento automaticamente
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
      message: `Erro: ${error.message}`,
      barberShopId
    };
  }
}

/**
 * Executa a criação automática de pagamentos para todas as barbearias
 */
export async function runAutomaticPaymentCreationAdmin() {
  try {
    const today = new Date();
    const currentDay = today.getDate();

    // Só executa a partir do dia 5
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
    const results = [];
    for (const barberShop of barberShops) {
      const result = await processBarberShop(barberShop.id);
      results.push(result);
    }

    return results;

  } catch (error) {
    console.error('Erro na execução automática de pagamentos:', error);
    return [{
      success: false,
      message: `Erro geral: ${error.message}`
    }];
  }
} 