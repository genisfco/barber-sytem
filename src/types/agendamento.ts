export interface Agendamento {
  id: string;
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber_name: string;
  barber_shop_id: string;
  total_duration: number;
  total_price: number;
  total_products_price: number;
  final_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_app_user?: boolean;
  app_user_id?: string;
  servicos: Array<{
    service_id: string;
    service_name: string;
    service_price: number;
    service_duration: number;
  }>;
  produtos: Array<{
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
  }>;
}

export interface ServicoAgendamento {
  id: string;
  appointment_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  is_gratuito?: boolean; // Flag para identificar serviços gratuitos
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
  is_gratuito?: boolean; // Flag para identificar produtos gratuitos
  created_at: string;
  updated_at: string;  
}

