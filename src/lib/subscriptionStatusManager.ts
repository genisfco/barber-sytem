import { supabase } from "@/integrations/supabase/client";
import { addDays, isAfter, parseISO, subDays } from "date-fns";

/**
 * Atualiza o status de uma assinatura conforme os pagamentos e regras de negócio.
 * @param assinatura A assinatura a ser avaliada
 * @param pagamentos Todos os pagamentos dessa assinatura
 */
export async function atualizarStatusAssinatura(assinatura, pagamentos, plano) {
  if (!assinatura || !plano) return;
  const hoje = new Date();
  const start = parseISO(assinatura.start_date);
  const end = assinatura.end_date ? parseISO(assinatura.end_date) : null;
  const duration = Number(plano.duration_months);

  // 1. Se status for 'suspensa' ou 'cancelada' manualmente, não altera automaticamente
  if (assinatura.status === 'suspensa' || assinatura.status === 'cancelada') return;

  // 2. Se já passou da data final
  if (end && isAfter(hoje, end)) {
    // Se passaram mais de 15 dias, status = cancelada
    if (isAfter(hoje, addDays(end, 15))) {
      if (assinatura.status !== 'cancelada') {
        await supabase.from('client_subscriptions').update({ status: 'cancelada' }).eq('id', assinatura.id);
      }
      return;
    }
    // Se passaram mais de 14 dias, status = expirada
    if (isAfter(hoje, addDays(end, 14))) {
      if (assinatura.status !== 'expirada') {
        await supabase.from('client_subscriptions').update({ status: 'expirada' }).eq('id', assinatura.id);
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

  // Pagamento do ciclo atual
  const pagamentoCiclo = pagamentos.find(p => {
    if (!p.payment_date) return false;
    const dataPgto = parseISO(p.payment_date);
    return (
      (isAfter(dataPgto, cicloInicio) || dataPgto.getTime() === cicloInicio.getTime()) &&
      (isAfter(cicloFim, dataPgto) || dataPgto.getTime() === cicloFim.getTime()) &&
      p.status === "pago"
    );
  });

  // 4. Status conforme pagamento
  if (pagamentoCiclo) {
    if (assinatura.status !== 'ativa') {
      await supabase.from('client_subscriptions').update({ status: 'ativa' }).eq('id', assinatura.id);
    }
    return;
  } else {
    // Se não tem pagamento do ciclo atual
    if (assinatura.status !== 'inadimplente') {
      await supabase.from('client_subscriptions').update({ status: 'inadimplente' }).eq('id', assinatura.id);
    }
    return;
  }
} 