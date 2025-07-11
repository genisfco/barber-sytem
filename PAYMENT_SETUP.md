# Configuração do Sistema de Pagamentos da Plataforma

Este documento explica como configurar o sistema de pagamentos da plataforma para barbearias.

## Funcionalidades Implementadas

### 1. Cálculo Automático de Pagamentos
- Conta automaticamente os agendamentos atendidos por mês
- Aplica a taxa configurada por agendamento
- Calcula o valor total a ser pago

### 2. Gestão de Pagamentos
- Criação de pagamentos por período (mês/ano)
- Controle de status (pendente, pago, vencido)
- Histórico completo de pagamentos

### 3. Integração PIX
- Geração de QR Codes PIX
- Códigos PIX copiáveis
- Download de QR Codes
- Contador regressivo de validade

## Configuração do Banco de Dados

### 1. Executar Migração
```sql
-- A migração já foi criada em: supabase/migrations/20240321000000_platform_payments.sql
-- Execute a migração no seu banco Supabase
```

### 2. Estrutura Criada
- **Campo `platform_fee`** na tabela `barber_shops` (taxa por agendamento)
- **Tabela `platform_payments`** para controlar os pagamentos
- **Função `calculate_platform_payment`** para cálculo automático

## Configuração do MercadoPago

### 1. Criar Conta no MercadoPago
1. Acesse [mercadopago.com.br](https://mercadopago.com.br)
2. Crie uma conta de desenvolvedor
3. Acesse o [Dashboard de Desenvolvedores](https://www.mercadopago.com.br/developers)

### 2. Obter Credenciais
1. No dashboard, vá em "Suas integrações"
2. Copie o **Access Token** (teste ou produção)
3. Configure as credenciais PIX

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
# MercadoPago
REACT_APP_MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Para produção, use o token de produção
# REACT_APP_MERCADOPAGO_ACCESS_TOKEN=APP-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 4. Configurar PIX
1. No dashboard do MercadoPago, vá em "Configurações"
2. Configure sua chave PIX (CPF, CNPJ, email, telefone)
3. Ative o recebimento via PIX

## Configuração da Taxa da Plataforma

### 1. Definir Taxa por Barbearia
```sql
-- Atualizar a taxa de uma barbearia específica
UPDATE barber_shops 
SET platform_fee = 1.35
WHERE id = 'uuid-da-barbearia';

-- Taxa padrão é R$ 1,35 por agendamento atendido
```

### 2. Taxa Personalizada
Você pode definir taxas diferentes para cada barbearia:
- Barbearias pequenas: R$ 3,00
- Barbearias médias: R$ 5,00  
- Barbearias grandes: R$ 8,00

## Sistema de Período Gratuito

### 1. Período Gratuito Padrão
```sql
-- Ativar período gratuito padrão (30 dias)
SELECT activate_default_free_trial('uuid-da-barbearia', 30);

-- Ou atualizar manualmente
UPDATE barber_shops 
SET 
  free_trial_start_date = CURRENT_DATE,
  free_trial_end_date = CURRENT_DATE + INTERVAL '30 days',
  free_trial_active = true,
  free_trial_days = 30
WHERE id = 'uuid-da-barbearia';
```

### 2. Períodos Gratuitos Específicos
```sql
-- Criar período gratuito específico
INSERT INTO free_trial_periods (
  barber_shop_id, 
  start_date, 
  end_date, 
  reason
) VALUES (
  'uuid-da-barbearia',
  '2024-01-01',
  '2024-02-01',
  'Promoção de lançamento'
);
```

### 3. Verificar Status do Período Gratuito
```sql
-- Verificar se uma barbearia está em período gratuito
SELECT is_barber_shop_in_free_trial('uuid-da-barbearia', CURRENT_DATE);

-- Ver períodos gratuitos ativos
SELECT * FROM free_trial_periods 
WHERE active = true 
AND CURRENT_DATE BETWEEN start_date AND end_date;
```

### 4. Configurar Controle de Acesso
```sql
-- 1. Encontrar seu user_id (execute no Supabase SQL Editor)
SELECT auth.uid();

-- 2. Atualizar a função is_system_owner() com seu user_id
-- Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
UPDATE pg_proc SET prosrc = 'RETURN auth.uid() = ''SEU_USER_ID_AQUI'';'
WHERE proname = 'is_system_owner';

-- 3. Verificar se está funcionando
SELECT is_system_owner();
```

### 5. Controle de Períodos Gratuitos
- 🔐 **Apenas você (desenvolvedor/proprietário)** pode gerenciar períodos gratuitos
- 👥 **Administradores das barbearias** apenas visualizam se estão em período gratuito
- 🛡️ **Segurança**: Políticas RLS garantem que clientes não podem modificar seus períodos
- 📊 **Estratégia**: Você controla a estratégia de conversão e promoções

### 5. Benefícios do Período Gratuito
- ✅ **Teste sem compromisso**: Barbearias podem testar o sistema gratuitamente
- ✅ **Conversão**: Aumenta a chance de conversão de clientes
- ✅ **Flexibilidade**: Períodos personalizados por barbearia
- ✅ **Controle total**: Você define quando e como oferecer períodos gratuitos

## Como Usar o Sistema

### 1. Criar Pagamento
1. Acesse a página "Financeiro"
2. Clique em "Pagamento Plataforma"
3. Selecione o mês e ano
4. O sistema calcula automaticamente:
   - Número de agendamentos atendidos
   - Taxa aplicada
   - Valor total
5. Escolha o método de pagamento (PIX recomendado)
6. Clique em "Criar Pagamento"

### 2. Gerar QR Code PIX
1. Após criar o pagamento, clique em "Gerar QR Code"
2. O sistema integra com o MercadoPago
3. Um QR Code válido é gerado
4. Clique no ícone de olho para visualizar

### 3. Realizar Pagamento
1. Abra o app do seu banco
2. Escolha a opção PIX
3. Escaneie o QR Code ou cole o código
4. Confirme o pagamento

### 4. Acompanhar Status
- **Pendente**: Pagamento criado, aguardando confirmação
- **Pago**: Pagamento confirmado pelo MercadoPago
- **Vencido**: QR Code expirado (30 minutos)

## Monitoramento e Relatórios

### 1. Lista de Pagamentos
- Visualize todos os pagamentos na página Financeiro
- Filtre por status, período, etc.
- Acompanhe valores e taxas

### 2. Relatórios
- Total de agendamentos por mês
- Valor total de taxas
- Status dos pagamentos
- Histórico completo

## Webhooks (Opcional)

Para atualização automática do status dos pagamentos:

### 1. Configurar Webhook no MercadoPago
```javascript
// Exemplo de webhook
app.post('/webhook/mercadopago', (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'payment') {
    const paymentId = data.id;
    // Atualizar status no banco
    updatePaymentStatus(paymentId);
  }
  
  res.status(200).send('OK');
});
```

### 2. URL do Webhook
```
https://seu-dominio.com/webhook/mercadopago
```

## Troubleshooting

### 1. QR Code não gera
- Verifique as credenciais do MercadoPago
- Confirme se a conta PIX está ativa
- Verifique os logs de erro

### 2. Pagamento não confirma
- QR Code pode ter expirado (30 minutos)
- Gere um novo QR Code
- Verifique se o pagamento foi realizado

### 3. Erro de cálculo
- Verifique se há agendamentos com status 'atendido'
- Confirme a taxa configurada na barbearia
- Verifique a função `calculate_platform_payment`

## Segurança

### 1. Tokens
- Nunca exponha tokens de produção no código
- Use variáveis de ambiente
- Rotacione tokens regularmente

### 2. Validações
- Sempre valide dados de entrada
- Verifique permissões de usuário
- Implemente rate limiting

### 3. Logs
- Mantenha logs de todas as transações
- Monitore tentativas de fraude
- Backup regular dos dados

## Próximos Passos

### 1. Melhorias Sugeridas
- [ ] Webhook para atualização automática
- [ ] Relatórios detalhados
- [ ] Notificações por email
- [ ] Integração com outros gateways
- [ ] Dashboard administrativo

### 2. Funcionalidades Avançadas
- [ ] Pagamentos recorrentes
- [ ] Diferentes planos de taxa
- [ ] Descontos por volume
- [ ] Integração com contabilidade

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Consulte a documentação do MercadoPago
3. Entre em contato com o suporte técnico

---

**Nota**: Este sistema está configurado para funcionar em ambiente de desenvolvimento com dados simulados. Para produção, configure as credenciais reais do MercadoPago. 