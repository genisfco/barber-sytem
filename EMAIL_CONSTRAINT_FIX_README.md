# Correção da Constraint de Email na Tabela Clients

## Problema Identificado

O sistema estava impedindo que clientes com o mesmo email fossem cadastrados em diferentes barbearias devido a uma constraint única global no campo `email` da tabela `clients`. Isso não faz sentido em um sistema multi-tenant onde cada barbearia deve ter seus próprios clientes.

## Solução Implementada

### 1. Migração do Banco de Dados

Criamos uma nova migração (`supabase/migrations/20240325000000_fix_clients_email_constraint.sql`) que:

- Remove a constraint única global do email (`clients_email_key`)
- Cria uma constraint única por barbearia (`idx_clients_unique_email_per_shop`)
- Garante que o campo `cpf` existe na tabela
- Adiciona constraint única para CPF por barbearia

### 2. Correções no Código

- Atualizamos o tipo `Cliente` no hook `useClientes` para incluir o campo `cpf`
- Corrigimos os tipos TypeScript para evitar erros de compilação

## Como Aplicar a Correção

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Fazer login no Supabase
npx supabase login

# Linkar o projeto (se necessário)
npx supabase link --project-ref axwtqezfybvpmppnevtd

# Aplicar as migrações
npx supabase db push
```

### Opção 2: Via SQL Editor do Supabase

1. Acesse o painel do Supabase
2. Vá para a seção "SQL Editor"
3. Execute o script `FIX_EMAIL_CONSTRAINT.sql`

## Estrutura das Constraints Após a Correção

### Antes (Problema)
```sql
-- Constraint global que impedia emails iguais em qualquer barbearia
ALTER TABLE clients ADD CONSTRAINT clients_email_key UNIQUE (email);
```

### Depois (Solução)
```sql
-- Constraint por barbearia que permite emails iguais em barbearias diferentes
CREATE UNIQUE INDEX idx_clients_unique_email_per_shop 
ON clients (barber_shop_id, LOWER(TRIM(email))) 
WHERE email IS NOT NULL AND active = true;

-- Constraint para CPF por barbearia
ALTER TABLE clients ADD CONSTRAINT unique_cpf_barber_shop UNIQUE (cpf, barber_shop_id);
```

## Benefícios da Correção

1. **Multi-tenancy adequado**: Cada barbearia pode ter seus próprios clientes
2. **Flexibilidade**: Um cliente pode se cadastrar em múltiplas barbearias
3. **Integridade local**: Ainda mantém a unicidade de email dentro da mesma barbearia
4. **Case-insensitive**: A comparação de email ignora maiúsculas/minúsculas
5. **Apenas ativos**: A constraint só se aplica a clientes ativos

## Validação

Após aplicar a correção, você pode testar:

1. Criar um cliente com email "teste@email.com" na Barbearia A
2. Criar outro cliente com email "teste@email.com" na Barbearia B
3. Tentar criar um terceiro cliente com email "teste@email.com" na Barbearia A (deve falhar)

## Arquivos Modificados

- `supabase/migrations/20240325000000_fix_clients_email_constraint.sql` (nova migração)
- `src/hooks/useClientes.ts` (correção de tipos)
- `FIX_EMAIL_CONSTRAINT.sql` (script manual)
- `EMAIL_CONSTRAINT_FIX_README.md` (este arquivo) 