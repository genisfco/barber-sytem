export interface Cliente {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}
