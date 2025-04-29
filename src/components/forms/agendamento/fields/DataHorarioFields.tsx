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
      console.log(`Horário ${horario} está no passado`);
      return false;
    }

    // Verifica se o barbeiro está indisponível para o horário
    const barbeiroId = form.getValues('barbeiroId');
    if (!barbeiroId) {
      console.log('Barbeiro não selecionado');
      return false;
    }

    const dataFormatada = format(date, "yyyy-MM-dd");
    const barbeiroIndisponivel = verificarIndisponibilidade(barbeiroId, date, horario);
    if (barbeiroIndisponivel) {
      console.log(`Barbeiro ${barbeiroId} indisponível para ${horario}`);
      return false;
    }

    // Verifica se o cliente já tem um agendamento para o mesmo horário
    const clienteId = form.getValues('clienteId');
    if (!clienteId) {
      console.log('Cliente não selecionado');
      return false;
    }

    const clienteJaAgendado = agendamentos?.some((agendamento) => {
      // Se estiver editando, ignora o próprio agendamento
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
      
      const conflito = (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status.toLowerCase())
      );

      if (conflito) {
        console.log('Conflito de cliente encontrado:', {
          agendamentoId: agendamento.id,
          horario: agendamento.time,
          clienteId,
          status: agendamento.status
        });
      }

      return conflito;
    });

    if (clienteJaAgendado) {
      console.log(`Cliente ${clienteId} já tem agendamento para ${horario}`);
      return false;
    }

    // Verifica se o horário está ocupado por algum agendamento do barbeiro
    const horarioOcupado = agendamentos?.some((agendamento) => {
      // Se estiver editando, ignora o próprio agendamento
      if (agendamentoParaEditar?.id && agendamento.id === agendamentoParaEditar.id) {
        console.log('Ignorando agendamento atual:', {
          agendamentoId: agendamento.id,
          horario: agendamento.time,
          status: agendamento.status
        });
        return false;
      }

      // Verifica se é o mesmo barbeiro e a mesma data
      if (agendamento.barber_id !== barbeiroId || agendamento.date !== dataFormatada) {
        return false;
      }

      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
      const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
      
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosVerificar = horaVerificar * 60 + minutoVerificar;
      
      const conflito = (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status.toLowerCase())
      );

      if (conflito) {
        console.log('Conflito encontrado:', {
          agendamentoId: agendamento.id,
          horario: agendamento.time,
          minutosVerificar,
          minutosAgendamento,
          duracao: agendamento.total_duration,
          status: agendamento.status
        });
      }

      return conflito;
    });

    if (horarioOcupado) {
      console.log(`Horário ${horario} está ocupado`);
      return false;
    }

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
