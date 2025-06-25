import { supabase } from "@/integrations/supabase/client";
import { addDays, isAfter, parseISO, subDays, addMonths } from "date-fns";

/**
 * Atualiza o status de uma assinatura conforme os pagamentos e regras de negócio.
 * @param assinatura A assinatura a ser avaliada
 * @param pagamentos Todos os pagamentos dessa assinatura
 * @param plano O plano da assinatura
 * @param barberShopId ID da barbearia
 */
export async function atualizarStatusAssinatura(assinatura, pagamentos, plano, barberShopId) {
  if (!assinatura || !plano || !barberShopId) return;
  // Verificar se a assinatura realmente pertence a esta barbearia
  if (assinatura.subscription_plans.barber_shop_id !== barberShopId) {
    return;
  }
  const hoje = new Date();
  const start = parseISO(assinatura.start_date);
  const end = assinatura.end_date ? parseISO(assinatura.end_date) : null;
  const duration = Number(plano.duration_months);

  // 1. Se status for 'suspensa' ou 'cancelada' manualmente, não altera automaticamente o status da assinatura para ativa, mas atualiza pagamentos normalmente
  const podeAlterarStatusAssinatura = !(assinatura.status === 'suspensa' || assinatura.status === 'cancelada');

  // 2. Se já passou da data final
  if (end && isAfter(hoje, end)) {
    // Se passaram mais de 45 dias, status = cancelada
    if (isAfter(hoje, addDays(end, 45))) {
      if (assinatura.status !== 'cancelada') {
        await supabase.from('client_subscriptions')
          .update({ status: 'cancelada' })
          .eq('id', assinatura.id);
      }
      return;
    }
    // Se passaram mais de 30 dias, status = expirada
    if (isAfter(hoje, addDays(end, 30))) {
      if (assinatura.status !== 'expirada') {
        await supabase.from('client_subscriptions')
          .update({ status: 'expirada' })
          .eq('id', assinatura.id);
      }
      return;
    }
  }

  // 3. Verificar ciclo atual
  let cicloInicio = start;
  let cicloFim = addDays(addDays(start, duration * 30), -1); // Aproximação: 1 mês = 30 dias
  while (isAfter(hoje, cicloFim)) {
    cicloInicio = cicloFim;
    cicloFim = addDays(cicloInicio, duration * 30);
  }

  // Pagamentos do ciclo atual
  const pagamentosCiclo = pagamentos.filter(p => {
    // Se o pagamento tem um campo de ciclo explícito, use-o; caso contrário, considere todos os pagamentos da assinatura
    // Aqui, assumimos que todos os pagamentos da assinatura são para o ciclo vigente
    return true;
  });
  const somaPagamentosCiclo = pagamentosCiclo.reduce((acc, p) => acc + Number(p.amount), 0);

  // Atualizar status dos pagamentos do ciclo
  // Agora cada pagamento individual é considerado 'pago' se foi processado com sucesso
  if (pagamentosCiclo.length > 0) {
    for (const pagamento of pagamentosCiclo) {
      // Se o pagamento não está marcado como 'falhou', consideramos como 'pago'
      // pois representa um pagamento individual bem-sucedido
      if (pagamento.status !== 'pago' && pagamento.status !== 'falhou') {
        await supabase.from('subscription_payments')
          .update({ status: 'pago' })
          .eq('id', pagamento.id);
      }
    }
  }

  // 4. Status da assinatura conforme soma dos pagamentos
  if (somaPagamentosCiclo >= Number(plano.price)) {
    if (podeAlterarStatusAssinatura && assinatura.status !== 'ativa') {
      await supabase.from('client_subscriptions')
        .update({ status: 'ativa' })
        .eq('id', assinatura.id);
    }
    // Chamar renovação de ciclos imediatamente após quitação
    await renovarCiclosAssinaturas(barberShopId);
    return;
  } else {
    // Se não atingiu o valor do ciclo
    if (podeAlterarStatusAssinatura && assinatura.status !== 'inadimplente') {
      await supabase.from('client_subscriptions')
        .update({ status: 'inadimplente' })
        .eq('id', assinatura.id);
    }
    return;
  }
}

/**
 * Renova automaticamente os ciclos de assinaturas ativas cujo ciclo terminou.
 * Atualiza datas e gera pagamento pendente para o novo ciclo.
 * @param barberShopId ID da barbearia
 */
export async function renovarCiclosAssinaturas(barberShopId) {
  if (!barberShopId) return;

  // Buscar todas as assinaturas ativas da barbearia
  const { data: assinaturas } = await supabase
    .from('client_subscriptions')
    .select('*, subscription_plans!inner(barber_shop_id)')
    .eq('status', 'ativa')
    .eq('subscription_plans.barber_shop_id', barberShopId);
  if (!assinaturas) return;

  // Buscar todos os planos da barbearia
  const { data: planos } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('barber_shop_id', barberShopId);
  if (!planos) return;

  // Buscar todos os pagamentos de todas as assinaturas ativas de uma vez
  const assinaturaIds = assinaturas.map(a => a.id);
  const { data: todosPagamentos } = await supabase
    .from('subscription_payments')
    .select('*')
    .in('client_subscription_id', assinaturaIds)
    .order('payment_date', { ascending: false });
  if (!todosPagamentos) return;

  // Processar renovações em lote
  const updates = [];
  for (const assinatura of assinaturas) {
    const plano = planos.find(p => p.id === assinatura.subscription_plan_id);
    if (!plano) continue;
    const pagamentos = todosPagamentos.filter(p => p.client_subscription_id === assinatura.id);

    // Descobrir o último ciclo (data de início e término)
    const duration = Number(plano.duration_months);
    let cicloInicio = parseISO(assinatura.start_date);
    let cicloFim = assinatura.end_date ? parseISO(assinatura.end_date) : null;
    if (!cicloFim) {
      cicloFim = addDays(cicloInicio, duration * 30 - 1);
    }
    const hoje = new Date();
    // Se o ciclo já terminou (hoje > cicloFim)
    if (cicloFim && isAfter(hoje, cicloFim)) {
      // Soma dos pagamentos do ciclo atual: considerar todos os pagamentos da assinatura para o ciclo vigente
      const somaPagamentosCiclo = pagamentos.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      // Só renova se o ciclo anterior estiver quitado
      if (somaPagamentosCiclo >= Number(plano.price)) {
        // Atualiza as datas do ciclo na assinatura
        const proximoCicloInicio = addDays(cicloFim, 1);
        const proximoCicloFim = subDays(addMonths(proximoCicloInicio, duration), 1);
        await supabase.from('client_subscriptions')
          .update({
            start_date: proximoCicloInicio.toISOString().slice(0, 10),
            end_date: proximoCicloFim.toISOString().slice(0, 10)
          })
          .eq('id', assinatura.id);
      }
      // Se não quitou, não renova, permitindo que a assinatura fique para trás
    }
  }
  // Atualizar todas as assinaturas que precisam ser renovadas em lote
  for (const up of updates) {
    await supabase.from('client_subscriptions').update({
      start_date: up.start_date,
      end_date: up.end_date
    }).eq('id', up.id);
  }
} 