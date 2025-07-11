import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Parâmetro id obrigatório' });
  }

  const { data, error } = await supabase
    .from('platform_payments')
    .select('payment_status')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Erro ao buscar pagamento', details: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Pagamento não encontrado' });
  }

  return res.status(200).json({ payment_status: data.payment_status });
} 