-- Criar políticas de segurança para períodos gratuitos
-- (Removendo políticas conflitantes se existirem)
DROP POLICY IF EXISTS "Ver períodos gratuitos da própria barbearia" ON free_trial_periods;
DROP POLICY IF EXISTS "Gerenciar períodos gratuitos da própria barbearia" ON free_trial_periods;

-- Criar políticas que permitem apenas ao desenvolvedor/proprietário gerenciar
-- Para isso, vamos usar uma função que verifica se o usuário é o proprietário do sistema

-- Função para verificar se o usuário é o proprietário do sistema
CREATE OR REPLACE FUNCTION is_system_owner()
RETURNS BOOLEAN AS $$
BEGIN
  -- Aqui você deve substituir pelo seu user_id
  -- Você pode encontrar seu user_id executando: SELECT auth.uid();
  RETURN auth.uid() = 'SEU_USER_ID_AQUI';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para visualizar períodos gratuitos (apenas proprietário)
CREATE POLICY "Apenas proprietário pode ver períodos gratuitos" ON free_trial_periods
  FOR SELECT USING (is_system_owner());

-- Política para gerenciar períodos gratuitos (apenas proprietário)
CREATE POLICY "Apenas proprietário pode gerenciar períodos gratuitos" ON free_trial_periods
  FOR ALL USING (is_system_owner());

-- Política alternativa: Permitir que administradores vejam apenas seus próprios períodos (somente leitura)
-- CREATE POLICY "Administradores podem ver seus próprios períodos gratuitos" ON free_trial_periods
--   FOR SELECT USING (
--     barber_shop_id IN (
--       SELECT id FROM barber_shops WHERE admin_id = auth.uid()
--     )
--   );

-- Comentário: Descomente a política acima se quiser que administradores vejam seus períodos gratuitos
-- Mas mantenha apenas SELECT, sem INSERT/UPDATE/DELETE 