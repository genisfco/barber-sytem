import { MercadoPago } from "mercadopago";
import { createClient } from '@supabase/supabase-js';

// Configurações do Mercado Pago e Supabase
const mercadopago = new MercadoPago(process.env.MERCADOPAGO_ACCESS_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Handler padrão para Express ou Next.js API Route
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Mercado Pago envia notificações com query param 'id' e 'topic' ou 'type'
    const paymentId = req.body.data && req.body.data.id ? req.body.data.id : req.query.id;
    const topic = req.body.type || req.query.topic || req.query.type;

    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento não encontrado' });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const payment = await mercadopago.payment.findById(paymentId);
    if (!payment || !payment.body) {
      return res.status(404).json({ error: 'Pagamento não encontrado no Mercado Pago' });
    }

    // Verifica se o pagamento foi aprovado
    if (payment.body.status === 'approved') {
      // Atualiza o status no Supabase
      const { error } = await supabase
        .from('platform_payments')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('external_payment_id', paymentId);

      if (error) {
        console.error('Erro ao atualizar pagamento no Supabase:', error);
        return res.status(500).json({ error: 'Erro ao atualizar pagamento no banco de dados' });
      }
    }

    // Retorna sucesso mesmo se não for aprovado (para evitar retries desnecessários)
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro no webhook do Mercado Pago:', err);
    return res.status(500).json({ error: 'Erro interno no webhook' });
  }
}