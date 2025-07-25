-- Corrigir constraint de email na tabela clients
-- Remover a constraint única global e criar uma constraint única por barbearia

-- 1. Remover a constraint única global do email (se existir)
DO $$
BEGIN
    -- Verificar se a constraint existe antes de tentar removê-la
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_email_key' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT clients_email_key;
    END IF;
END $$;

-- 2. Criar uma constraint única para email por barbearia
-- Isso permite que o mesmo email seja usado em diferentes barbearias
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_email_per_shop 
ON clients (barber_shop_id, LOWER(TRIM(email))) 
WHERE email IS NOT NULL AND active = true;

-- 3. Adicionar comentário explicativo
COMMENT ON INDEX idx_clients_unique_email_per_shop IS 
'Garante que não existam clientes com o mesmo email (case-insensitive) na mesma barbearia quando ativos';

-- 4. Verificar se a constraint de CPF por barbearia já existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_cpf_barber_shop' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients
        ADD CONSTRAINT unique_cpf_barber_shop UNIQUE (cpf, barber_shop_id);
    END IF;
END $$;

-- 5. Adicionar comentário para a constraint de CPF
COMMENT ON CONSTRAINT unique_cpf_barber_shop ON clients IS 
'Garante que não existam clientes com o mesmo CPF na mesma barbearia'; 