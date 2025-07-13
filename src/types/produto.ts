export interface Produto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  bonus_type: string | null;
  bonus_value: number | null;
  has_commission: boolean;
  barber_shop_id: string;
  created_at: string;
  updated_at: string;
} 