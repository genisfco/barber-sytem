import { DayOfWeek } from '../types/barberShop';

export interface HorarioFuncionamento {
  dia: DayOfWeek;
  horarios: string[];
  ativo: boolean;
}

// Lista de todos os horários possíveis (30 em 30 minutos)
export const horarios = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
] as const;

// Função auxiliar para gerar horários entre dois horários
export function gerarHorariosEntre(inicio: string, fim: string): string[] {
  const horariosDisponiveis = horarios.filter(horario => 
    horario >= inicio && horario <= fim
  );
  return horariosDisponiveis;
}

// Função para verificar se um horário está dentro do período de funcionamento
export function verificarHorarioFuncionamento(
  horario: string,
  horariosFuncionamento: HorarioFuncionamento[]
): boolean {
  const diaAtual = new Date().getDay() as DayOfWeek;
  const configuracaoDia = horariosFuncionamento.find(h => h.dia === diaAtual);
  
  if (!configuracaoDia || !configuracaoDia.ativo) {
    return false;
  }

  return configuracaoDia.horarios.includes(horario);
}
