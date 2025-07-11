-- Adicionar campos para controle de período gratuito na tabela barber_shops
ALTER TABLE barber_shops 
ADD COLUMN free_trial_start_date DATE,
ADD COLUMN free_trial_end_date DATE,
ADD COLUMN free_trial_active BOOLEAN DEFAULT false,
ADD COLUMN free_trial_days INTEGER DEFAULT 30;

-- Criar tabela para controlar períodos gratuitos específicos
CREATE TABLE free_trial_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_shop_id UUID NOT NULL REFERENCES barber_shops(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255), -- Motivo do período gratuito (ex: "Teste inicial", "Promoção especial", etc.)
  created_by UUID, -- Quem criou o período gratuito (admin do sistema)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não há sobreposição de períodos gratuitos para a mesma barbearia
  CONSTRAINT no_overlapping_free_trials UNIQUE (barber_shop_id, start_date, end_date)
);

-- Criar índices para melhor performance
CREATE INDEX idx_free_trial_periods_barber_shop ON free_trial_periods(barber_shop_id);
CREATE INDEX idx_free_trial_periods_active ON free_trial_periods(active);
CREATE INDEX idx_free_trial_periods_dates ON free_trial_periods(start_date, end_date);

-- Habilitar RLS
ALTER TABLE free_trial_periods ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança serão criadas na migração seguinte
-- para evitar conflitos e garantir controle correto

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_free_trial_periods_updated_at 
    BEFORE UPDATE ON free_trial_periods 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar se uma barbearia está em período gratuito
CREATE OR REPLACE FUNCTION is_barber_shop_in_free_trial(p_barber_shop_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se a barbearia tem período gratuito ativo
  IF EXISTS (
    SELECT 1 FROM barber_shops 
    WHERE id = p_barber_shop_id 
    AND free_trial_active = true
    AND p_date BETWEEN free_trial_start_date AND free_trial_end_date
  ) THEN
    RETURN true;
  END IF;
  
  -- Verificar se há períodos gratuitos específicos ativos
  IF EXISTS (
    SELECT 1 FROM free_trial_periods 
    WHERE barber_shop_id = p_barber_shop_id 
    AND active = true
    AND p_date BETWEEN start_date AND end_date
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Função atualizada para calcular pagamento da plataforma (considerando período gratuito)
CREATE OR REPLACE FUNCTION calculate_platform_payment(
  p_barber_shop_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS TABLE(
  appointments_count BIGINT,
  platform_fee DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  is_free_trial BOOLEAN
) AS $$
DECLARE
  v_is_free_trial BOOLEAN;
  v_check_date DATE;
BEGIN
  -- Data para verificar se está em período gratuito (primeiro dia do mês)
  v_check_date := make_date(p_year, p_month, 1);
  
  -- Verificar se está em período gratuito
  v_is_free_trial := is_barber_shop_in_free_trial(p_barber_shop_id, v_check_date);
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as appointments_count,
    bs.platform_fee,
    CASE 
      WHEN v_is_free_trial THEN 0.00
      ELSE (COUNT(*) * bs.platform_fee)::DECIMAL(10,2)
    END as total_amount,
    v_is_free_trial as is_free_trial
  FROM appointments a
  JOIN barber_shops bs ON bs.id = a.barber_shop_id
  WHERE a.barber_shop_id = p_barber_shop_id
    AND EXTRACT(MONTH FROM a.date::DATE) = p_month
    AND EXTRACT(YEAR FROM a.date::DATE) = p_year
    AND a.status = 'atendido';
END;
$$ LANGUAGE plpgsql;

-- Função para ativar período gratuito padrão para uma barbearia
CREATE OR REPLACE FUNCTION activate_default_free_trial(p_barber_shop_id UUID, p_days INTEGER DEFAULT 30)
RETURNS VOID AS $$
BEGIN
  UPDATE barber_shops 
  SET 
    free_trial_start_date = CURRENT_DATE,
    free_trial_end_date = CURRENT_DATE + INTERVAL '1 day' * p_days,
    free_trial_active = true,
    free_trial_days = p_days
  WHERE id = p_barber_shop_id;
END;
$$ LANGUAGE plpgsql;

-- Função para desativar período gratuito
CREATE OR REPLACE FUNCTION deactivate_free_trial(p_barber_shop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE barber_shops 
  SET free_trial_active = false
  WHERE id = p_barber_shop_id;
  
  -- Desativar também períodos específicos
  UPDATE free_trial_periods 
  SET active = false
  WHERE barber_shop_id = p_barber_shop_id;
END;
$$ LANGUAGE plpgsql; 