export interface Subscription {
  id: string;
  client_id: string;
  subscription_plan_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'ativa' | 'cancelada' | 'suspensa' | 'expirada' | 'inadimplente';
  created_at?: string | null;
  updated_at?: string | null;
}