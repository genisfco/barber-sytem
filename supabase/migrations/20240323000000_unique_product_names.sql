-- Adicionar constraint única para nomes de produtos por barbearia
-- Isso garante que não possam existir produtos com o mesmo nome na mesma barbearia

-- Primeiro, vamos criar um índice único para a combinação de barber_shop_id e name
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_name_per_shop 
ON products (barber_shop_id, LOWER(TRIM(name))) 
WHERE active = true;

-- Adicionar uma constraint de verificação para garantir que o nome não esteja vazio
ALTER TABLE products 
ADD CONSTRAINT check_product_name_not_empty 
CHECK (LENGTH(TRIM(name)) >= 2);

-- Comentário explicativo
COMMENT ON INDEX idx_products_unique_name_per_shop IS 
'Garante que não existam produtos com o mesmo nome (case-insensitive) na mesma barbearia quando ativos';

COMMENT ON CONSTRAINT check_product_name_not_empty ON products IS 
'Garante que o nome do produto tenha pelo menos 2 caracteres'; 