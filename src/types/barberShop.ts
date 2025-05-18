export interface BarberShop {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BarberShopHours {
  id: string;
  barber_shop_id: string;
  day_of_week: number; // 0 = domingo, 1 = segunda, etc
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS_OF_WEEK = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado'
} as const; 