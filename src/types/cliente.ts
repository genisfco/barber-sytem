export interface Cliente {
  id: string;
  name: string;    
  email: string;
  phone: string;
  notes?: string | null;
  active: boolean;
  cpf?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  app_user_id?: string | null;
}