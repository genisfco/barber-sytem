-- Adicionar categoria 'sistemas' na constraint da tabela transactions
-- Primeiro, remover a constraint existente
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_category;

-- Recriar a constraint com a nova categoria
ALTER TABLE transactions ADD CONSTRAINT check_category 
CHECK (category IN ('servicos', 'produtos', 'assinaturas', 'comissoes', 'despesas_fixas', 'sistemas', 'outros')); 