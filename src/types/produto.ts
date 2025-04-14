export interface Produto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
} 