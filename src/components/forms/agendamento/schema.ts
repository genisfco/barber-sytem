import { z } from "zod";

interface Agendamento {
  date: string;
  time: string;
  barber_id: string;
  client_id: string;
  status: string;
}

interface FormData {
  clienteId?: string;
  barbeiroId?: string;
  servicoId?: string;
  data?: Date;
  horario?: string;
}

export const createFormSchema = (agendamentos: Agendamento[] = []) => z.object({
  clienteId: z.string({
    required_error: "Selecione o cliente",
  }),
  barbeiroId: z.string({
    required_error: "Selecione o barbeiro",
  }),
  servicoId: z.string({
    required_error: "Selecione o serviço",
  }),
  data: z.date({
    required_error: "Selecione a data",
  }),
  horario: z.string({
    required_error: "Selecione o horário",
  }),
}).refine((data) => {
  return isHorarioDisponivel(data, agendamentos);
}, {
  message: "Este horário não está disponível",
  path: ["horario"]
});

function isHorarioDisponivel(data: FormData, agendamentos: Agendamento[]): boolean {
  const dataFormatada = data.data?.toISOString().split('T')[0];
  
  // Verifica se o horário já está agendado para o barbeiro
  const barbeiroAgendado = agendamentos.some(agendamento => 
    agendamento.date === dataFormatada &&
    agendamento.time === data.horario &&
    agendamento.barber_id === data.barbeiroId &&
    ['confirmado', 'pendente'].includes(agendamento.status)
  );

  if (barbeiroAgendado) return false;

  // Verifica se o cliente já tem um agendamento para o mesmo horário
  const clienteAgendado = agendamentos.some(agendamento =>
    agendamento.date === dataFormatada &&
    agendamento.time === data.horario &&
    agendamento.client_id === data.clienteId &&
    ['confirmado', 'pendente'].includes(agendamento.status)
  );

  if (clienteAgendado) return false;

  // Verifica se o horário é válido para o dia atual
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataSelecionada = new Date(data.data || new Date());
  dataSelecionada.setHours(0, 0, 0, 0);

  // Se for o dia atual, verifica se o horário já passou
  if (dataSelecionada.getTime() === hoje.getTime()) {
    const [horaAgendamento, minutoAgendamento] = data.horario?.split(':').map(Number) || [0, 0];
    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();

    // Verifica se o horário já passou
    if (horaAgendamento < horaAtual) return false;
    if (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual) return false;

    // Verifica se o horário está dentro do horário de funcionamento (8h às 20h)
    if (horaAgendamento < 8 || horaAgendamento >= 20) return false;
  }

  // Verifica se a data é anterior ao dia atual
  if (dataSelecionada.getTime() < hoje.getTime()) return false;

  return true;
}

export type FormValues = z.infer<ReturnType<typeof createFormSchema>>;
