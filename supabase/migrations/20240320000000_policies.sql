-- Habilitar RLS para todas as tabelas
ALTER TABLE barber_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_shop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Função para verificar se o usuário é admin de uma barbearia
CREATE OR REPLACE FUNCTION auth.is_barber_shop_admin(barber_shop_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.barber_shops
    WHERE id = barber_shop_id
    AND admin_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para barber_shops
CREATE POLICY "Usuários podem ver suas próprias barbearias" ON barber_shops
  FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Admins podem atualizar suas próprias barbearias" ON barber_shops
  FOR UPDATE USING (admin_id = auth.uid());

-- Políticas para barber_shop_hours
CREATE POLICY "Ver horários da própria barbearia" ON barber_shop_hours
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar horários da própria barbearia" ON barber_shop_hours
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para barbeiros
CREATE POLICY "Ver barbeiros da própria barbearia" ON barbers
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar barbeiros da própria barbearia" ON barbers
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para clientes
CREATE POLICY "Ver clientes da própria barbearia" ON clients
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar clientes da própria barbearia" ON clients
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para serviços
CREATE POLICY "Ver serviços da própria barbearia" ON services
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar serviços da própria barbearia" ON services
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para produtos
CREATE POLICY "Ver produtos da própria barbearia" ON products
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar produtos da própria barbearia" ON products
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para planos de assinatura
CREATE POLICY "Ver planos da própria barbearia" ON subscription_plans
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar planos da própria barbearia" ON subscription_plans
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para assinaturas de clientes
CREATE POLICY "Ver assinaturas de clientes da própria barbearia" ON client_subscriptions
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gerenciar assinaturas de clientes da própria barbearia" ON client_subscriptions
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

-- Políticas para pagamentos de assinaturas
CREATE POLICY "Ver pagamentos de assinaturas da própria barbearia" ON subscription_payments
  FOR SELECT USING (
    client_subscription_id IN (
      SELECT id FROM client_subscriptions WHERE client_id IN (
        SELECT id FROM clients WHERE barber_shop_id IN (
          SELECT id FROM barber_shops WHERE admin_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Gerenciar pagamentos de assinaturas da própria barbearia" ON subscription_payments
  FOR ALL USING (
    client_subscription_id IN (
      SELECT id FROM client_subscriptions WHERE client_id IN (
        SELECT id FROM clients WHERE barber_shop_id IN (
          SELECT id FROM barber_shops WHERE admin_id = auth.uid()
        )
      )
    )
  );

-- Políticas para agendamentos
CREATE POLICY "Ver agendamentos da própria barbearia" ON appointments
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar agendamentos da própria barbearia" ON appointments
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

-- Políticas para serviços do agendamento
CREATE POLICY "Ver serviços dos agendamentos da própria barbearia" ON appointment_services
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gerenciar serviços dos agendamentos da própria barbearia" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

-- Políticas para produtos do agendamento
CREATE POLICY "Ver produtos dos agendamentos da própria barbearia" ON appointment_products
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gerenciar produtos dos agendamentos da própria barbearia" ON appointment_products
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

-- Políticas para indisponibilidades dos barbeiros
CREATE POLICY "Ver indisponibilidades dos barbeiros da própria barbearia" ON barber_unavailability
  FOR SELECT USING (
    barber_id IN (
      SELECT id FROM barbers WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gerenciar indisponibilidades dos barbeiros da própria barbearia" ON barber_unavailability
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM barbers WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

-- Políticas para comissões dos barbeiros
CREATE POLICY "Ver comissões dos barbeiros da própria barbearia" ON barber_commissions
  FOR SELECT USING (
    barber_id IN (
      SELECT id FROM barbers WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gerenciar comissões dos barbeiros da própria barbearia" ON barber_commissions
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM barbers WHERE barber_shop_id IN (
        SELECT id FROM barber_shops WHERE admin_id = auth.uid()
      )
    )
  );

-- Políticas para transações
CREATE POLICY "Ver transações da própria barbearia" ON transactions
  FOR SELECT USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Gerenciar transações da própria barbearia" ON transactions
  FOR ALL USING (
    barber_shop_id IN (
      SELECT id FROM barber_shops WHERE admin_id = auth.uid()
    )
  ); 