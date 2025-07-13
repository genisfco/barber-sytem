# Validação de Nomes Duplicados para Produtos e Serviços

## Implementação

Esta funcionalidade foi implementada com uma abordagem em duas camadas para garantir a integridade dos dados e uma boa experiência do usuário, tanto para **Produtos** quanto para **Serviços**:

### 1. Validação no Frontend (UX)

**Localização**: 
- `src/pages/Produtos.tsx` e `src/hooks/useProdutosAdmin.ts` (Produtos)
- `src/pages/Servicos.tsx` e `src/hooks/useServicosAdmin.ts` (Serviços)

**Funcionalidades**:
- **Validação em tempo real**: Conforme o usuário digita o nome, o sistema verifica se já existe um produto/serviço com o mesmo nome na barbearia
- **Debounce de 500ms**: Evita muitas requisições durante a digitação
- **Feedback visual**: Mostra erro em vermelho e desabilita o botão de salvar
- **Indicador de carregamento**: Spinner durante a validação
- **Validação na edição**: Exclui o item atual da verificação para permitir salvar sem alterações

**Benefícios**:
- Usuário recebe feedback imediato
- Evita tentativas de criação com nomes duplicados
- Melhora a experiência do usuário

### 2. Constraint no Banco de Dados (Segurança)

**Localização**: 
- `supabase/migrations/20240323000000_unique_product_names.sql` (Produtos)
- `supabase/migrations/20240323000001_unique_service_names.sql` (Serviços)

**Funcionalidades**:
- **Índice único**: Garante que não existam itens ativos com o mesmo nome na mesma barbearia
- **Case-insensitive**: A comparação ignora maiúsculas/minúsculas
- **Trim**: Remove espaços em branco antes da comparação
- **Constraint de tamanho**: Garante que o nome tenha pelo menos 2 caracteres

**Benefícios**:
- Garante integridade dos dados mesmo se o frontend falhar
- Protege contra inserções diretas no banco
- Performance otimizada com índice

## Como Funciona

### Criação de Produto/Serviço
1. Usuário digita o nome
2. Sistema valida em tempo real (frontend)
3. Se válido, permite salvar
4. Backend verifica novamente antes de inserir
5. Se duplicado, retorna erro

### Edição de Produto/Serviço
1. Usuário altera o nome
2. Sistema valida excluindo o item atual
3. Se válido, permite salvar
4. Backend verifica novamente antes de atualizar

### Regras de Validação
- Nome deve ter pelo menos 2 caracteres
- Não pode existir item ativo com o mesmo nome na mesma barbearia
- Validação é case-insensitive
- Espaços em branco são ignorados

## Arquivos Modificados

### Produtos
1. **`src/hooks/useProdutosAdmin.ts`**
   - Adicionada função `checkProductNameExists`
   - Validação antes de criar/atualizar produtos

2. **`src/pages/Produtos.tsx`**
   - Validação em tempo real com useEffect
   - Feedback visual de erro
   - Desabilitação do botão quando há erro

3. **`supabase/migrations/20240323000000_unique_product_names.sql`**
   - Constraint única no banco de dados
   - Índice para performance

### Serviços
1. **`src/hooks/useServicosAdmin.ts`**
   - Adicionada função `checkServiceNameExists`
   - Validação antes de criar/atualizar serviços

2. **`src/pages/Servicos.tsx`**
   - Validação em tempo real com useEffect
   - Feedback visual de erro
   - Desabilitação do botão quando há erro

3. **`supabase/migrations/20240323000001_unique_service_names.sql`**
   - Constraint única no banco de dados
   - Índice para performance

## Execução das Migrations

Para aplicar as constraints no banco de dados:

```bash
# Se usando Supabase CLI
supabase db push

# Ou executar manualmente no SQL Editor do Supabase
```

## Considerações

- As constraints só se aplicam a itens **ativos** (`WHERE active = true`)
- Itens inativos podem ter nomes duplicados
- A validação é por barbearia, permitindo nomes iguais em barbearias diferentes
- O sistema é resiliente a falhas do frontend graças às constraints do banco
- A implementação é idêntica para produtos e serviços, garantindo consistência

## Índices Criados

### Produtos
```sql
CREATE UNIQUE INDEX idx_products_unique_name_per_shop 
ON products (barber_shop_id, LOWER(TRIM(name))) 
WHERE active = true;
```

### Serviços
```sql
CREATE UNIQUE INDEX idx_services_unique_name_per_shop 
ON services (barber_shop_id, LOWER(TRIM(name))) 
WHERE active = true;
```

## Constraints de Validação

### Produtos
```sql
ALTER TABLE products 
ADD CONSTRAINT check_product_name_not_empty 
CHECK (LENGTH(TRIM(name)) >= 2);
```

### Serviços
```sql
ALTER TABLE services 
ADD CONSTRAINT check_service_name_not_empty 
CHECK (LENGTH(TRIM(name)) >= 2);
``` 