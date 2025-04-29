import { Agendamento } from "./agendamento";

export interface Comissao {
  id: string;
  barber_id: string;
  appointment_id: string;
  total_price: number;
  total_commission: number;
  status: "pendente" | "pago" | "cancelado";
  created_at?: string;
  updated_at?: string;
  appointment?: Agendamento;
} 