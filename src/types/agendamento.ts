export interface Agendamento {
  id: string;
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber: string;
  total_duration?: number;
  total_price?: number;
  total_products_price?: number;
  final_price?: number;
  payment_method?: string;
  status: string;
  servicos?: ServicoAgendamento[];
  produtos?: ProdutoAgendamento[];
  created_at?: string;
  updated_at?: string;
} 


export interface ServicoAgendamento {
  id: string;
  appointment_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  created_at: string;
  updated_at: string;
}

export interface ProdutoAgendamento {
  id: string;
  appointment_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

