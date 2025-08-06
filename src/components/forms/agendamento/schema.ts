import { z } from "zod";
import { useServicos } from "@/hooks/useServicos";

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
  servicosSelecionados?: string[];
  data?: Date;
  horario?: string;
}

export const createFormSchema = (agendamentos: Agendamento[] = [], servicos: any[] = []) => z.object({
  id: z.string().optional(),
  clienteId: z.string({
    required_error: "Selecione o cliente",
  }),
  barbeiroId: z.string({
    required_error: "Selecione o barbeiro",
  }),
  servicosSelecionados: z.array(z.string()).min(1, {
    message: "Selecione pelo menos um serviço",
  }),
  data: z.date({
    required_error: "Selecione a data",
  }),
  horario: z.string({
    required_error: "Selecione o horário",
  }),
}).refine((data) => {
  return isHorarioDisponivel(data, agendamentos, servicos);
}, {
  message: "Este horário não está disponível",
  path: ["horario"]
});

function isHorarioDisponivel(data: FormData, agendamentos: Agendamento[], servicos: any[]): boolean {
  const dataFormatada = data.data?.toISOString().split('T')[0];
  
  // Encontra os serviços selecionados para obter a duração total
  const servicosSelecionados = servicos?.filter(s => data.servicosSelecionados?.includes(s.id));
  const duracaoTotal = servicosSelecionados?.reduce((sum, s) => sum + s.duration, 0) || 0;
  const slotsNecessarios = Math.ceil(duracaoTotal / 15);
  const horariosParaVerificar = [data.horario];

  // Adiciona os próximos horários se forem necessários
  for (let i = 1; i < slotsNecessarios; i++) {
    const [hora, minuto] = data.horario?.split(':').map(Number) || [0, 0];
    const proximoHorario = new Date();
    proximoHorario.setHours(hora, minuto + (i * 15), 0, 0);
    const proximoHorarioFormatado = `${proximoHorario.getHours().toString().padStart(2, '0')}:${proximoHorario.getMinutes().toString().padStart(2, '0')}`;
    horariosParaVerificar.push(proximoHorarioFormatado);
  }

  // Verifica disponibilidade para todos os horários necessários
  for (const horario of horariosParaVerificar) {
    // Verifica se o horário já está agendado para o barbeiro
    const barbeiroAgendado = agendamentos.some(agendamento => 
      agendamento.date === dataFormatada &&
      agendamento.time === horario &&
      agendamento.barber_id === data.barbeiroId &&
      ['confirmado', 'pendente'].includes(agendamento.status)
    );

    if (barbeiroAgendado) return false;

    // Verifica se o cliente já tem um agendamento para o mesmo horário
    const clienteAgendado = agendamentos.some(agendamento =>
      agendamento.date === dataFormatada &&
      agendamento.time === horario &&
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
      const [horaAgendamento, minutoAgendamento] = horario.split(':').map(Number);
      const horaAtual = hoje.getHours();
      const minutoAtual = hoje.getMinutes();

      // Verifica se o horário já passou
      if (horaAgendamento < horaAtual) return false;
      if (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual) return false;

      // Verifica se o horário está dentro do horário de funcionamento (8h às 22h)
      //if (horaAgendamento < 8 || horaAgendamento > 22) return false;
    }

    // Verifica se a data é anterior ao dia atual
    if (dataSelecionada.getTime() < hoje.getTime()) return false;
  }

  return true;
}

export type FormValues = z.infer<ReturnType<typeof createFormSchema>>;
