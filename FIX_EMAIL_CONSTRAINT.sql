-- Script para corrigir a constraint de email na tabela clients
-- Execute este script no SQL Editor do Supabase

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
        RAISE NOTICE 'Constraint clients_email_key removida com sucesso';
    ELSE
        RAISE NOTICE 'Constraint clients_email_key não encontrada';
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
        RAISE NOTICE 'Constraint unique_cpf_barber_shop criada com sucesso';
    ELSE
        RAISE NOTICE 'Constraint unique_cpf_barber_shop já existe';
    END IF;
END $$;

-- 5. Adicionar comentário para a constraint de CPF
COMMENT ON CONSTRAINT unique_cpf_barber_shop ON clients IS 
'Garante que não existam clientes com o mesmo CPF na mesma barbearia';

-- 6. Verificar se o campo cpf existe na tabela, se não, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'cpf'
    ) THEN
        ALTER TABLE clients ADD COLUMN cpf VARCHAR(14);
        RAISE NOTICE 'Coluna cpf adicionada à tabela clients';
    ELSE
        RAISE NOTICE 'Coluna cpf já existe na tabela clients';
    END IF;
END $$;

-- 7. Verificar as constraints atuais
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'clients'
ORDER BY tc.constraint_name;

-- 8. Verificar os índices atuais
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'clients'
ORDER BY indexname; 