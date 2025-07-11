import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new Payment(client);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const paymentId = req.body.data && req.body.data.id ? req.body.data.id : req.query.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento não encontrado' });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const result = await payment.get({ id: paymentId });

    if (!result || !result.id) {
      return res.status(404).json({ error: 'Pagamento não encontrado no Mercado Pago' });
    }

    // Verifica se o pagamento foi aprovado
    if (result.status === 'approved') {
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

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro no webhook do Mercado Pago:', err);
    return res.status(500).json({ error: 'Erro interno no webhook', details: err.message });
  }
}