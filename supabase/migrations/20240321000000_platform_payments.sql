-- Adicionar campo de taxa da plataforma na tabela barber_shops
ALTER TABLE barber_shops 
ADD COLUMN platform_fee DECIMAL(10,2) DEFAULT 5.00;

-- Criar tabela para controlar pagamentos da plataforma
CREATE TABLE platform_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_shop_id UUID NOT NULL REFERENCES barber_shops(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  appointments_count INTEGER NOT NULL DEFAULT 0,
  platform_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  pix_qr_code TEXT,
  pix_qr_code_expires_at TIMESTAMP WITH TIME ZONE,
  external_payment_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que só existe um pagamento por barbearia por mês/ano
  UNIQUE(barber_shop_id, month, year)
);

-- Criar índices para melhor performance
CREATE INDEX idx_platform_payments_barber_shop ON platform_payments(barber_shop_id);
CREATE INDEX idx_platform_payments_status ON platform_payments(payment_status);
CREATE INDEX idx_platform_payments_month_year ON platform_payments(month, year);

-- Habilitar RLS
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para platform_payments
CREATE POLICY "Ver pagamentos da plataforma da própria barbearia" ON platform_payments
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar pagamentos da plataforma da própria barbearia" ON platform_payments
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_platform_payments_updated_at 
    BEFORE UPDATE ON platform_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular pagamento da plataforma para um mês/ano
CREATE OR REPLACE FUNCTION calculate_platform_payment(
  p_barber_shop_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS TABLE(
  appointments_count BIGINT,
  platform_fee DECIMAL(10,2),
  total_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as appointments_count,
    bs.platform_fee,
    (COUNT(*) * bs.platform_fee)::DECIMAL(10,2) as total_amount
  FROM appointments a
  JOIN barber_shops bs ON bs.id = a.barber_shop_id
  WHERE a.barber_shop_id = p_barber_shop_id
    AND EXTRACT(MONTH FROM a.date::DATE) = p_month
    AND EXTRACT(YEAR FROM a.date::DATE) = p_year
    AND a.status = 'atendido';
END;
$$ LANGUAGE plpgsql; 