const { runAutomaticPaymentCreationAdmin } = require('../services/autoPaymentServiceAdmin');

export default async function handler(req, res) {
  // Verificar se é POST (segurança básica)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar se tem a chave de autorização (segurança adicional)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 Iniciando criação automática de pagamentos...');
    console.log('🔧 Verificando variáveis de ambiente...');
    
    // Verificar se as variáveis estão disponíveis
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada');
    }
    
    const results = await runAutomaticPaymentCreationAdmin();
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    const createdCount = results.filter(r => r.paymentId).length;
    
    console.log(`✅ Processamento concluído: ${successCount} sucessos, ${errorCount} erros, ${createdCount} pagamentos criados`);
    
    return res.status(200).json({
      success: true,
      message: `Processamento concluído: ${createdCount} pagamentos criados`,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        created: createdCount
      },
      results: results
    });
    
  } catch (error) {
    console.error('❌ Erro na execução automática:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
} 