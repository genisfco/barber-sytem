import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { supabase } from '@/integrations/supabase/client';
import { DayOfWeek } from '@/types/barberShop';
import { converterHorariosFuncionamento, gerarHorariosDisponiveis } from "@/constants/horarios";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useIndisponibilidades } from "@/hooks/useIndisponibilidades";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAgendamentos } from '@/hooks/useAgendamentos';

const formSchema = z.object({
  data: z.date({
    required_error: "Selecione a data",
  }),
  horarioInicial: z.string({
    required_error: "Selecione o horário inicial",
  }),
  horarioFinal: z.string({
    required_error: "Selecione o horário final",
  }),
  motivo: z.string().optional(),
  todosHorarios: z.boolean().default(false),
}).refine((data) => {
  if (data.todosHorarios) return true;
  
  const [horaInicial, minutoInicial] = data.horarioInicial.split(':').map(Number);
  const [horaFinal, minutoFinal] = data.horarioFinal.split(':').map(Number);
  const minutosInicial = horaInicial * 60 + minutoInicial;
  const minutosFinal = horaFinal * 60 + minutoFinal;
  return minutosFinal > minutosInicial;
}, {
  message: "O horário final deve ser posterior ao horário inicial",
  path: ["horarioFinal"],
});

type IndisponivelFormValues = z.infer<typeof formSchema>;

interface IndisponivelFormProps {
  barbeiroId: string;
  barbeiroName: string;
  onOpenChange: (open: boolean) => void;
}

export function IndisponivelForm({ barbeiroId, barbeiroName, onOpenChange }: IndisponivelFormProps) {
  const { selectedBarberShop } = useBarberShopContext();
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<any[]>([]);
  const [diaSemanaSemHorario, setDiaSemanaSemHorario] = useState(false);

  const convertToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const form = useForm<IndisponivelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: undefined,
      horarioInicial: undefined,
      horarioFinal: undefined,
      todosHorarios: false,
    },
  });

  const { 
    registrarIndisponibilidade, 
    removerIndisponibilidade, 
    verificarIndisponibilidade,
    indisponibilidades 
  } = useIndisponibilidades();

  const { agendamentos } = useAgendamentos(form.watch('data'), barbeiroId);
  const { toast } = useToast();

  // Carregar horários de funcionamento da barbearia
  useEffect(() => {
    const carregarHorariosFuncionamento = async () => {
      const { data: horarios, error } = await supabase
        .from('barber_shop_hours')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('day_of_week');

      if (error) {
        return;
      }

      if (horarios) {
        setHorariosFuncionamento(horarios);
      }
    };

    carregarHorariosFuncionamento();
  }, [selectedBarberShop.id]);

  // Atualizar horários disponíveis quando a data é alterada
  useEffect(() => {
    const data = form.watch("data");
    if (!data) return;

    const diaSemana = data.getDay() as DayOfWeek;
    const horariosConvertidos = converterHorariosFuncionamento(horariosFuncionamento);
    const configuracaoDia = horariosConvertidos.find(h => h.dia === diaSemana);
    
    // Verifica se o dia tem horário de funcionamento
    if (!configuracaoDia || !configuracaoDia.ativo) {
      setDiaSemanaSemHorario(true);
      setHorariosDisponiveis([]);
      form.setValue("todosHorarios", false);
      form.setValue("horarioInicial", undefined);
      form.setValue("horarioFinal", undefined);
      return;
    }

    setDiaSemanaSemHorario(false);
    setHorariosDisponiveis(configuracaoDia.horarios);

    // Se existe indisponibilidade, preenche os campos
    const indisponibilidade = buscarIndisponibilidadeExistente(data);
    if (indisponibilidade) {
      if (!indisponibilidade.start_time && !indisponibilidade.end_time) {
        form.setValue("todosHorarios", true);
        form.setValue("horarioInicial", configuracaoDia.horarios[0]);
        form.setValue("horarioFinal", configuracaoDia.horarios[configuracaoDia.horarios.length - 1]);
      } else {
        form.setValue("todosHorarios", false);
        form.setValue("horarioInicial", indisponibilidade.start_time);
        form.setValue("horarioFinal", indisponibilidade.end_time);
      }
    } else {
      form.setValue("todosHorarios", false);
      form.setValue("horarioInicial", undefined);
      form.setValue("horarioFinal", undefined);
    }
  }, [form.watch("data"), horariosFuncionamento]);

  // Função para buscar indisponibilidade existente
  const buscarIndisponibilidadeExistente = (data: Date) => {
    if (!indisponibilidades || !data) return null;
    
    const formattedDate = format(data, "yyyy-MM-dd");
    return indisponibilidades.find(
      (indisponibilidade) => 
        indisponibilidade.barber_id === barbeiroId && 
        indisponibilidade.date === formattedDate
    );
  };

  const onSubmit = async (data: IndisponivelFormValues) => {
    try {
      const indisponibilidade = buscarIndisponibilidadeExistente(data.data);
      
      // Verifica se há agendamentos para a data e horário selecionados
      const agendamentosExistentes = agendamentos?.some(agendamento => {
        const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
        const [horaInicial, minutoInicial] = data.horarioInicial.split(':').map(Number);
        const [horaFinal, minutoFinal] = data.horarioFinal.split(':').map(Number);

        const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
        const minutosInicial = horaInicial * 60 + minutoInicial;
        const minutosFinal = horaFinal * 60 + minutoFinal;

        return minutosAgendamento >= minutosInicial && minutosAgendamento <= minutosFinal;
      });

      if (agendamentosExistentes) {
        toast({
          variant: 'destructive',
          title: 'Conflito de Agendamento',
          description: 'O barbeiro possui agendamentos para a data e período selecionado, verifique a agenda ou selecione outra data e período.'
        });
        return;
      }

      if (indisponibilidade) {
        // Se já existe indisponibilidade, remove
        await removerIndisponibilidade.mutateAsync({ 
          barbeiroId, 
          data: data.data
        });
      } else {
        // Se não existe, registra nova indisponibilidade
        await registrarIndisponibilidade.mutateAsync({
          barbeiroId,
          data: data.data,
          horarioInicial: data.todosHorarios ? horariosDisponiveis[0] : data.horarioInicial,
          horarioFinal: data.todosHorarios ? horariosDisponiveis[horariosDisponiveis.length - 1] : data.horarioFinal,
          motivo: data.motivo
        });
      }

      onOpenChange(false);
    } catch (error) {
      logError(error, 'Erro ao processar indisponibilidade:');
    }
  };

  const dataSelecionada = form.watch("data");
  const horarioInicial = form.watch("horarioInicial");
  const horarioFinal = form.watch("horarioFinal");
  const todosHorarios = form.watch("todosHorarios");
  
  // Verifica se existe indisponibilidade para a data selecionada
  const indisponibilidadeExistente = dataSelecionada ? buscarIndisponibilidadeExistente(dataSelecionada) : null;
  const estaIndisponivel = !!indisponibilidadeExistente;
  
  // Verifica se a indisponibilidade é por "Loja Fechada"
  const isLojaFechada = indisponibilidadeExistente?.reason === "Loja Fechada";

  // Função para verificar se um horário está dentro do período selecionado
  const isHorarioSelecionado = (horario: string) => {
    if (!dataSelecionada) return false;
    
    if (indisponibilidadeExistente) {
      if (!indisponibilidadeExistente.start_time && !indisponibilidadeExistente.end_time) {
        return true; // Se não tem horário específico, todos estão selecionados
      }
      
      const [hora, minuto] = horario.split(':').map(Number);
      const [horaInicial, minutoInicial] = indisponibilidadeExistente.start_time.split(':').map(Number);
      const [horaFinal, minutoFinal] = indisponibilidadeExistente.end_time.split(':').map(Number);
      
      const minutosHorario = hora * 60 + minuto;
      const minutosInicial = horaInicial * 60 + minutoInicial;
      const minutosFinal = horaFinal * 60 + minutoFinal;
      
      return minutosHorario >= minutosInicial && minutosHorario <= minutosFinal;
    }

    if (!horarioInicial || !horarioFinal) return todosHorarios;

    const [hora, minuto] = horario.split(':').map(Number);
    const [horaIni, minutoIni] = horarioInicial.split(':').map(Number);
    const [horaFim, minutoFim] = horarioFinal.split(':').map(Number);

    const minutosHorario = hora * 60 + minuto;
    const minutosInicial = horaIni * 60 + minutoIni;
    const minutosFinal = horaFim * 60 + minutoFim;

    return minutosHorario >= minutosInicial && minutosHorario <= minutosFinal;
  };

  const isHorarioOcupadoPorAgendamento = (horario: string) => {
    if (!dataSelecionada || !agendamentos || !barbeiroId) return false;

    const selectedBarbeiroId = barbeiroId;
    const formattedDate = format(dataSelecionada, "yyyy-MM-dd");

    return agendamentos.some(agendamentoItem => {
      if (
        agendamentoItem.barber_id === selectedBarbeiroId &&
        agendamentoItem.date === formattedDate &&
        agendamentoItem.status !== 'cancelado'
      ) {
        const slotMinutesStart = convertToMinutes(horario);
        const slotMinutesEnd = slotMinutesStart + 30; // Assuming 30-minute slots

        const apptMinutesStart = convertToMinutes(agendamentoItem.time);
        const apptMinutesEnd = apptMinutesStart + (agendamentoItem.total_duration || 0);

        const hasOverlap = (
          (slotMinutesStart >= apptMinutesStart && slotMinutesStart < apptMinutesEnd) ||
          (slotMinutesEnd > apptMinutesStart && slotMinutesEnd <= apptMinutesEnd) ||
          (apptMinutesStart >= slotMinutesStart && apptMinutesStart < slotMinutesEnd)
        );
        return hasOverlap;
      }
      return false;
    });
  };

  // Handler para alternar entre todos os horários
  const handleTodosHorariosChange = (checked: boolean) => {
    form.setValue('todosHorarios', checked);
    if (checked) {
      form.setValue('horarioInicial', horariosDisponiveis[0]);
      form.setValue('horarioFinal', horariosDisponiveis[horariosDisponiveis.length - 1]);
    } else {
      form.setValue('horarioInicial', undefined);
      form.setValue('horarioFinal', undefined);
    }
  };

  // Handler para o clique do botão quando é loja fechada
  const handleLojaFechadaClick = () => {
    toast({
      variant: 'destructive',
      title: 'Loja Fechada',
      description: 'Não é possível remover o registro.',
    });
  };

  // Handler para o submit do formulário
  const handleSubmit = (data: IndisponivelFormValues) => {
    // Se é loja fechada, não permite remover
    if (isLojaFechada) {
      handleLojaFechadaClick();
      return;
    }
    
    // Chama o onSubmit original
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormItem className="flex flex-col">          
          <div className="text-lg font-semibold mb-4">{barbeiroName}</div>
        </FormItem>

        <div className="grid grid-cols-2 gap-3">
          {/* Coluna da Esquerda - Calendário */}
          <div>
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Selecione a Data</FormLabel>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => {
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      return date < hoje;
                    }}
                    className="rounded-md border"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Coluna da Direita - Horários */}
          <div className="space-y-4">
            {dataSelecionada && (
              <>
                {diaSemanaSemHorario ? (
                  <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-900 text-sm">
                      Barbearia sem horário definido de funcionamento para o dia selecionado. <br/>
                      Não precisa registrar indisponibilidade.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="todosHorarios"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Todos Horários
                              </FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={handleTodosHorariosChange}
                                disabled={estaIndisponivel}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {!todosHorarios && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="horarioInicial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário Inicial</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                disabled={estaIndisponivel}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o horário inicial" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {horariosDisponiveis.map((horario) => (
                                    <SelectItem key={horario} value={horario}>
                                      {horario}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="horarioFinal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário Final</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                disabled={estaIndisponivel}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o horário final" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {horariosDisponiveis.map((horario) => (
                                    <SelectItem 
                                      key={horario} 
                                      value={horario}
                                      disabled={estaIndisponivel || (horarioInicial && horario <= horarioInicial)}
                                    >
                                      {horario}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-1">
                      {horariosDisponiveis.map((horario) => {
                        const isOccupiedByAppointment = isHorarioOcupadoPorAgendamento(horario);
                        const isSelectedForIndisponibility = isHorarioSelecionado(horario);

                        return (
                          <div
                            key={horario}
                            className={cn(
                              "py-2 px-1 rounded-md text-center font-medium transition-colors",
                              isOccupiedByAppointment
                                ? "bg-red-500 text-white cursor-not-allowed opacity-75"
                                : isSelectedForIndisponibility
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                            )}
                            onClick={() => {
                              if (!isOccupiedByAppointment) {
                                // Lógica para selecionar/desselecionar horários para indisponibilidade
                                // Esta parte precisaria ser refinada para permitir seleção de múltiplos horários
                                // ou um range, dependendo da UX desejada.
                                // Por enquanto, apenas desabilita o clique se estiver ocupado.
                              }
                            }}
                            title={isOccupiedByAppointment ? "Horário já agendado" : ""}
                          >
                            {horario}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant={estaIndisponivel ? "destructive" : "default"}
            disabled={diaSemanaSemHorario}
          >
            {isLojaFechada ? "Loja Fechada" : estaIndisponivel ? "Remover Indisponibilidade" : "Registrar Indisponibilidade"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 