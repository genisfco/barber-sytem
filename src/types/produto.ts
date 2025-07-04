export interface Produto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  bonus_type?: 'percentual' | 'fixo' | null;
  bonus_value?: number | null;
  has_commission?: boolean;
} 