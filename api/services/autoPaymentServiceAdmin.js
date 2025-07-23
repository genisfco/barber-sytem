import { createClient } from '@supabase/supabase-js';

// Cliente para operações administrativas (bypassa RLS)
const supabaseUrl = process.env.SUPABASE_URL;
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
 * Verifica se uma data específica está em período gratuito
 * @param {string} barberShopId - ID da barbearia
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {Object} barberShop - Dados da barbearia
 * @returns {Promise<boolean>} - True se a data está em período gratuito
 */
async function checkFreeTrialForDate(barberShopId, date, barberShop) {
  const checkDate = new Date(date);
  
  // Verificar período gratuito padrão
  if (barberShop.free_trial_active && barberShop.free_trial_start_date && barberShop.free_trial_end_date) {
    const startDate = new Date(barberShop.free_trial_start_date);
    const endDate = new Date(barberShop.free_trial_end_date);
    
    if (checkDate >= startDate && checkDate <= endDate) {
      return true;
    }
  }

  // Verificar períodos gratuitos específicos
  const { data: freeTrialPeriods, error } = await supabaseAdmin
    .from('free_trial_periods')
    .select('start_date, end_date')
    .eq('barber_shop_id', barberShopId)
    .eq('active', true)
    .lte('start_date', date)    // Período inicia antes ou na data
    .gte('end_date', date);     // Período termina depois ou na data

  if (error) {
    console.error(`Erro ao buscar períodos gratuitos específicos para ${barberShopId}:`, error);
  }

  if (freeTrialPeriods && freeTrialPeriods.length > 0) {
    return true;
  }

  return false;
}

/**
 * Calcula quantos agendamentos devem ser cobrados, excluindo aqueles em período gratuito
 * @param {string} barberShopId - ID da barbearia
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @param {Object} barberShop - Dados da barbearia
 * @returns {Promise<{billableAppointments: number, freeAppointments: number, totalAppointments: number}>}
 */
async function calculateBillableAppointments(barberShopId, month, year, barberShop) {
  // Buscar todos os agendamentos atendidos do mês
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0); // Último dia do mês
  const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('appointments')
    .select('id, date')
    .eq('barber_shop_id', barberShopId)
    .eq('status', 'atendido')
    .gte('date', startDate)
    .lte('date', endDateStr);

  if (appointmentsError) {
    throw appointmentsError;
  }

  if (!appointments || appointments.length === 0) {
    return {
      billableAppointments: 0,
      freeAppointments: 0,
      totalAppointments: 0
    };
  }

  let billableCount = 0;
  let freeCount = 0;

  // Verificar cada agendamento individualmente
  for (const appointment of appointments) {
    const isInFreeTrial = await checkFreeTrialForDate(barberShopId, appointment.date, barberShop);
    
    if (isInFreeTrial) {
      freeCount++;
    } else {
      billableCount++;
    }
  }

  return {
    billableAppointments: billableCount,
    freeAppointments: freeCount,
    totalAppointments: appointments.length
  };
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

    // Calcular quantos agendamentos devem ser cobrados
    const { billableAppointments, freeAppointments, totalAppointments } = await calculateBillableAppointments(barberShopId, month, year, barberShop);

    // Calcular dados do pagamento
    const paymentData = {
      appointments_count: billableAppointments,
      platform_fee: barberShop.platform_fee,
      total_amount: billableAppointments * barberShop.platform_fee,
      is_free_trial: false // Sempre false para este novo cálculo
    };

    // Se não teve atendimentos cobráveis, não cria pagamento
    if (paymentData.appointments_count === 0) {
      let message;
      if (totalAppointments === 0) {
        message = `Nenhum atendimento no mês ${month}/${year} - não gera pagamento`;
      } else {
        message = `${totalAppointments} atendimentos no mês ${month}/${year}, mas todos em período gratuito - não gera pagamento`;
      }
      
      return {
        success: true,
        message,
        barberShopId,
        month,
        year,
        details: {
          totalAppointments,
          billableAppointments: paymentData.appointments_count,
          freeAppointments
        }
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
        notes: 'Pagamento criado automaticamente',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    let message = `Pagamento criado automaticamente para ${month}/${year}`;
    if (freeAppointments > 0) {
      message += ` - ${paymentData.appointments_count} atendimentos cobrados + ${freeAppointments} gratuitos = ${totalAppointments} total`;
    } else {
      message += ` - ${paymentData.appointments_count} atendimentos`;
    }
    
    return {
      success: true,
      message,
      barberShopId,
      month,
      year,
      paymentId: data.id,
      details: {
        totalAppointments,
        billableAppointments: paymentData.appointments_count,
        freeAppointments,
        totalAmount: paymentData.total_amount
      }
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