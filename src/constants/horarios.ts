import { DayOfWeek } from '../types/barberShop';

export interface HorarioFuncionamento {
  dia: DayOfWeek;
  horarios: string[];
  ativo: boolean;
}

// Lista de todos os horários possíveis (15 em 15 minutos)
export const horarios = [
  "00:00",
  "00:15",
  "00:30",
  "00:45",
  "01:00",
  "01:15",
  "01:30",
  "01:45",
  "02:00",
  "02:15",
  "02:30",
  "02:45",
  "03:00",
  "03:15",
  "03:30",
  "03:45",
  "04:00",
  "04:15",
  "04:30",
  "04:45",
  "05:00",
  "05:15",
  "05:30",
  "05:45",
  "06:00",
  "06:15",
  "06:30",
  "06:45",
  "07:00",
  "07:15",
  "07:30",
  "07:45",
  "08:00",
  "08:15",
  "08:30",
  "08:45",
  "09:00",
  "09:15",
  "09:30",
  "09:45",
  "10:00",
  "10:15",
  "10:30",
  "10:45",
  "11:00",
  "11:15",
  "11:30",
  "11:45",
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
  "14:45",
  "15:00",
  "15:15",
  "15:30",
  "15:45",
  "16:00",
  "16:15",
  "16:30",
  "16:45",
  "17:00",
  "17:15",
  "17:30",
  "17:45",
  "18:00",
  "18:15",
  "18:30",
  "18:45",
  "19:00",
  "19:15",
  "19:30",
  "19:45",
  "20:00",  
  "20:15",
  "20:30",
  "20:45",
  "21:00",
  "21:15",
  "21:30",
  "21:45",
  "22:00",
  "22:15",
  "22:30",
  "22:45",
  "23:00",
  "23:15",
  "23:30",
  "23:45",
  "24:00",
] as const;

// Função auxiliar para gerar horários entre dois horários
export function gerarHorariosEntre(inicio: string, fim: string): string[] {
  const horariosDisponiveis = horarios.filter(horario => 
    horario >= inicio && horario < fim
  );
  return horariosDisponiveis;
}

// Função para gerar horários dinamicamente a partir do horário de abertura
export function gerarHorariosDinamicamente(inicio: string, fim: string): string[] {
  const horariosGerados: string[] = [];
  
  // Converter horários para minutos para facilitar cálculos
  const [inicioHora, inicioMinuto] = inicio.split(':').map(Number);
  const [fimHora, fimMinuto] = fim.split(':').map(Number);
  
  let minutosInicio = inicioHora * 60 + inicioMinuto;
  let minutosFim = fimHora * 60 + fimMinuto;
  
  // Gerar horários a cada 15 minutos, começando exatamente no horário de abertura
  for (let minutos = minutosInicio; minutos < minutosFim; minutos += 15) {
    const hora = Math.floor(minutos / 60);
    const minuto = minutos % 60;
    const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    horariosGerados.push(horario);
  }
  
  return horariosGerados;
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

// Nova função para gerar horários disponíveis baseado nos horários de funcionamento da barbearia
export function gerarHorariosDisponiveis(
  horariosFuncionamento: HorarioFuncionamento[],
  dia: DayOfWeek
): string[] {
  const configuracaoDia = horariosFuncionamento.find(h => h.dia === dia);
  
  if (!configuracaoDia || !configuracaoDia.ativo) {
    return [];
  }

  return configuracaoDia.horarios;
}

// Nova função para converter horários de funcionamento do banco para o formato da interface
export function converterHorariosFuncionamento(
  horariosBanco: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): HorarioFuncionamento[] {
  return horariosBanco.map(h => ({
    dia: h.day_of_week as DayOfWeek,
    horarios: gerarHorariosDinamicamente(h.start_time, h.end_time),
    ativo: h.is_active
  }));
}
