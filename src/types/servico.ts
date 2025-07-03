export interface Servico {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  commission_type?: 'percentual' | 'fixo' | null;
  commission_value?: number | null;
  commission_extra_type?: 'percentual' | 'fixo' | null;
  commission_extra_value?: number | null;
  has_commission?: boolean;
} 