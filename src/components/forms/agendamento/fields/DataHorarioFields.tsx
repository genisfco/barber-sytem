import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { horarios } from "@/constants/horarios";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useIndisponibilidades } from "@/hooks/useIndisponibilidades";
import { format } from "date-fns";

interface Agendamento {
  id: string;
  date: string;
  time: string;
  barber_id: string;
  client_id: string;
  client_name: string;
  status: string;
  total_duration: number;
  servicos: Array<{
    service_id: string;
    service_name: string;
  }>;
}

interface DataHorarioFieldsProps {
  form: UseFormReturn<FormValues>;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  agendamentos: Agendamento[] | undefined;
  agendamentoParaEditar?: Agendamento;
}

export function DataHorarioFields({ form, date, setDate, agendamentos, agendamentoParaEditar }: DataHorarioFieldsProps) {
  const { verificarIndisponibilidade } = useIndisponibilidades();

  // Log inicial dos props com tipagem melhorada
  console.log('DataHorarioFields - Props:', {
    date,
    agendamentoParaEditar: agendamentoParaEditar?.id,
    totalAgendamentos: agendamentos?.length,
    agendamentos: agendamentos?.map(a => ({
      id: a.id,
      date: a.date,
      time: a.time,
      barber_id: a.barber_id,
      client_id: a.client_id,
      status: a.status,
      total_duration: a.total_duration
    }))
  });

  const isHorarioPassado = (horario: string) => {
    if (!date) return false;
    
    const [hora, minuto] = horario.split(":").map(Number);
    const hoje = new Date();
    const dataSelecionada = new Date(date);
    
    dataSelecionada.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    
    // Se a data selecionada for anterior a hoje, todos os horários são considerados passados
    if (dataSelecionada < hoje) {
      return true;
    }
    
    // Se a data selecionada for posterior a hoje, nenhum horário é considerado passado
    if (dataSelecionada > hoje) {
      return false;
    }
    
    // Se for hoje, verifica se o horário já passou
    const agora = new Date();
    if (hora < agora.getHours()) return true;
    if (hora === agora.getHours() && minuto <= agora.getMinutes()) return true;
    
    return false;
  };

  const isHorarioDisponivel = (horario: string) => {
    if (!date) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionada = new Date(date);
    dataSelecionada.setHours(0, 0, 0, 0);

    // Verifica se o horário já passou
    const horarioPassado = isHorarioPassado(horario);
    if (horarioPassado) {
      console.log(`[DISPONIBILIDADE] Horário ${horario} está no passado.`);
      return false;
    }

    // Verifica se o barbeiro está indisponível para o horário
    const barbeiroId = form.getValues('barbeiroId');
    if (!barbeiroId) {
      console.log(`[DISPONIBILIDADE] Barbeiro não selecionado para horário ${horario}`);
      return false;
    }

    const dataFormatada = format(date, "yyyy-MM-dd");
    const barbeiroIndisponivel = verificarIndisponibilidade(barbeiroId, date, horario);
    if (barbeiroIndisponivel) {
      console.log(`[DISPONIBILIDADE] Barbeiro ${barbeiroId} indisponível para ${horario}`);
      return false;
    }

    // --- NOVA LÓGICA DE CONFLITO PARA EDIÇÃO ---
    // Duração total do serviço selecionado
    let duracaoTotal = 0;
    try {
      const servicosSelecionados = form.getValues('servicosSelecionados');
      const servicos = agendamentos?.[0]?.servicos ? agendamentos[0].servicos : [];
      if (servicosSelecionados && servicosSelecionados.length > 0 && servicos.length > 0) {
        duracaoTotal = servicos
          .filter((s: any) => servicosSelecionados.includes(s.service_id))
          .reduce((sum: number, s: any) => sum + (s.service_duration || 0), 0);
      } else if (agendamentoParaEditar && agendamentoParaEditar.servicos) {
        duracaoTotal = agendamentoParaEditar.servicos.reduce((sum: number, s: any) => sum + (s.service_duration || 0), 0);
      }
    } catch (e) {
      duracaoTotal = 30; // fallback
    }
    if (!duracaoTotal) duracaoTotal = 30; // fallback padrão

    // Calcula início e fim do novo agendamento
    const [horaVerificar, minutoVerificar] = horario.split(":").map(Number);
    const minutosVerificar = horaVerificar * 60 + minutoVerificar;
    const minutosVerificarFim = minutosVerificar + duracaoTotal;

    // Filtra agendamentos do barbeiro, na data, status válido, exceto o próprio
    const agendamentosBarbeiro = agendamentos?.filter((agendamento) => {
      if (agendamentoParaEditar?.id && agendamento.id === agendamentoParaEditar.id) return false;
      return (
        agendamento.barber_id === barbeiroId &&
        agendamento.date === dataFormatada &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status.toLowerCase())
      );
    }) || [];

    // Verifica se o horário está ocupado por algum agendamento do barbeiro
    const conflito = agendamentosBarbeiro.some((agendamento) => {
      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(":").map(Number);
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosAgendamentoFim = minutosAgendamento + (agendamento.total_duration || 30);
      const sobreposicao = (minutosVerificar < minutosAgendamentoFim && minutosVerificarFim > minutosAgendamento);
      if (sobreposicao) {
        console.log(`[DISPONIBILIDADE] CONFLITO: Horário ${horario} (${minutosVerificar}-${minutosVerificarFim}) conflita com agendamento ${agendamento.id} (${minutosAgendamento}-${minutosAgendamentoFim}) | Barbeiro: ${agendamento.barber_id}`);
      }
      return sobreposicao;
    });
    if (conflito) {
      console.log(`[DISPONIBILIDADE] Horário ${horario} está INDISPONÍVEL por conflito de barbeiro.`);
      return false;
    }
    console.log(`[DISPONIBILIDADE] Horário ${horario} está DISPONÍVEL.`);
    return true;
  };

  const getMotivoIndisponibilidade = (horario: string) => {
    if (!date) return "Selecione uma data";
    
    if (isHorarioPassado(horario)) {
      return "Horário expirado";
    }

    const barbeiroId = form.getValues('barbeiroId');
    if (!barbeiroId) {
      return "Selecione um barbeiro";
    }

    const clienteId = form.getValues('clienteId');
    if (!clienteId) {
      return "Selecione um cliente";
    }

    const dataFormatada = format(date, "yyyy-MM-dd");
    
    // Verifica indisponibilidade do barbeiro
    const barbeiroIndisponivel = verificarIndisponibilidade(barbeiroId, date, horario);
    if (barbeiroIndisponivel) {
      return "Barbeiro indisponível no horário";
    }

    // Verifica agendamentos do barbeiro
    const agendamentoBarbeiro = agendamentos?.find((agendamento) => {
      if (agendamentoParaEditar?.id && agendamento.id === agendamentoParaEditar.id) {
        return false;
      }

      if (agendamento.barber_id !== barbeiroId || agendamento.date !== dataFormatada) {
        return false;
      }

      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
      const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
      
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosVerificar = horaVerificar * 60 + minutoVerificar;
      
      return (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status.toLowerCase())
      );
    });

    if (agendamentoBarbeiro) {
      const servicos = agendamentoBarbeiro.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado';
      return `Agendado para ${agendamentoBarbeiro.client_name} (${servicos})`;
    }

    // Verifica agendamentos do cliente
    const agendamentoCliente = agendamentos?.find((agendamento) => {
      if (agendamentoParaEditar?.id && agendamento.id === agendamentoParaEditar.id) {
        return false;
      }

      if (agendamento.client_id !== clienteId || agendamento.date !== dataFormatada) {
        return false;
      }

      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
      const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
      
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosVerificar = horaVerificar * 60 + minutoVerificar;
      
      return (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status.toLowerCase())
      );
    });

    if (agendamentoCliente) {
      return "Cliente selecionado já agendado neste horário";
    }

    return "";
  };

  const isDateDisabled = (date: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < hoje;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="data"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data</FormLabel>
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={(date) => {
                setDate(date);
                field.onChange(date);
                if (date) {
                  form.setValue('horario', '');
                }
              }}
              disabled={isDateDisabled}
              className="rounded-md border w-full max-w-[300px] mx-auto md:mx-0"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="horario"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Horário</FormLabel>
            <div className="grid grid-cols-4 gap-2">
              {horarios.map((horario) => {
                const disponivel = isHorarioDisponivel(horario);
                const selecionado = field.value === horario;
                const horarioPassado = isHorarioPassado(horario);
                const motivoIndisponibilidade = getMotivoIndisponibilidade(horario);
                
                return (
                  <TooltipProvider key={horario}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            if (disponivel) {
                              field.onChange(horario);
                            }
                          }}
                          className={cn(
                            "py-2 px-1 rounded-md text-center font-medium transition-colors",
                            !disponivel && "bg-red-100 text-red-700 cursor-not-allowed opacity-75",
                            disponivel && !selecionado && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                            selecionado && "bg-primary text-primary-foreground"
                          )}
                          disabled={!disponivel}
                        >
                          {horario}
                        </button>
                      </TooltipTrigger>
                      {!disponivel && (
                        <TooltipContent>
                          <p>{motivoIndisponibilidade}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
