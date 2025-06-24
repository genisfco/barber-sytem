import { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { converterHorariosFuncionamento } from "@/constants/horarios";
import { supabase } from '@/integrations/supabase/client';
import { DayOfWeek, DAYS_OF_WEEK } from '@/types/barberShop';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../../agendamento/schema";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useBarbers } from "@/hooks/useBarbers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataHorarioFieldsProps {
  form: UseFormReturn<FormValues>;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  agendamentos: any[];
  barberShopId: string;
  agendamentoParaEditar?: any;
}

export function DataHorarioFields({
  form,
  date,
  setDate,
  agendamentos,
  barberShopId,
  agendamentoParaEditar,
}: DataHorarioFieldsProps) {
  const { verificarDisponibilidadeBarbeiro } = useAgendamentos();
  const { barbers } = useBarbers();
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<any[]>([]);

  const convertToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  useEffect(() => {
    const carregarHorariosFuncionamento = async () => {
      const { data: horarios, error } = await supabase
        .from('barber_shop_hours')
        .select('*')
        .eq('barber_shop_id', barberShopId)
        .order('day_of_week');

      if (error) {
        return;
      }

      if (horarios) {
        setHorariosFuncionamento(horarios);
      }
    };

    carregarHorariosFuncionamento();
  }, [barberShopId]);

  useEffect(() => {
    if (date) {
      const diaSemana = date.getDay() as DayOfWeek;
      const horariosConvertidos = converterHorariosFuncionamento(horariosFuncionamento);
      const horariosDoDia = horariosConvertidos
        .find(h => h.dia === diaSemana && h.ativo)?.horarios || [];
      setHorariosDisponiveis(horariosDoDia);
    } else {
      setHorariosDisponiveis([]);
    }
  }, [date, horariosFuncionamento]);

  const dataFormatada = date ? format(date, "yyyy-MM-dd") : '';

  const isHorarioPassado = (horario: string) => {
    if (!date) return true;

    const [hora, minuto] = horario.split(":").map(Number);
    const hoje = new Date();
    const dataSelecionada = new Date(date);

    if (dataSelecionada < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
      return true;
    }

    if (dataSelecionada > new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
      return false;
    }

    if (hora < hoje.getHours()) return true;
    if (hora === hoje.getHours() && minuto <= hoje.getMinutes()) return true;

    return false;
  };

  // Função para verificar se o barbeiro está disponível na data selecionada
  const isBarbeiroDisponivelNaData = (barbeiroId: string) => {
    if (!date || !barbers) return true;
    
    const barbeiro = barbers.find(b => b.id === barbeiroId);
    if (!barbeiro) return true;
    
    const diaSemana = date.getDay() as DayOfWeek;
    
    // Se o barbeiro não tem dias disponíveis definidos, considera disponível
    if (!barbeiro.available_days || barbeiro.available_days.length === 0) {
      return true;
    }
    
    // Verifica se o dia da semana está na lista de dias disponíveis do barbeiro
    return barbeiro.available_days.includes(diaSemana);
  };

  const isHorarioIndisponivel = (barbeiroId: string, horario: string) => {
    if (!date || !barbeiroId) return true;

    // Verifica se o barbeiro está disponível na data selecionada
    const barbeiroDisponivelNaData = isBarbeiroDisponivelNaData(barbeiroId);
    if (!barbeiroDisponivelNaData) {
      return true;
    }

    const barbeiroBloqueadoNoHorario = !verificarDisponibilidadeBarbeiro(barbeiroId, dataFormatada, horario);
    if (barbeiroBloqueadoNoHorario) {
      return true;
    }

    const horarioPassado = isHorarioPassado(horario);
    if (horarioPassado) {
      return true;
    }

    const horarioOcupado = (agendamentos ?? []).some(
      (agendamentoItem) => {
        if (
          agendamentoItem.barber_id === barbeiroId &&
          agendamentoItem.date === dataFormatada &&
          agendamentoItem.status !== 'cancelado' &&
          (agendamentoParaEditar ? agendamentoItem.id !== agendamentoParaEditar.id : true)
        ) {
          const slotMinutesStart = convertToMinutes(horario);
          const slotMinutesEnd = slotMinutesStart + 30;

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
      }
    );

    return horarioOcupado || false;
  };

  const getMotivoIndisponibilidade = (barbeiroId: string, horario: string) => {
    // Verifica se o barbeiro está disponível na data selecionada
    const barbeiroDisponivelNaData = isBarbeiroDisponivelNaData(barbeiroId);
    if (!barbeiroDisponivelNaData) {
      const diaSemana = date?.getDay() as DayOfWeek;
      const nomeDia = DAYS_OF_WEEK[diaSemana];
      
      // Sábado (6) e Domingo (0) usam "no", outros dias usam "na"
      const preposicao = diaSemana === 0 || diaSemana === 6 ? "no" : "na";
      
      return `Barbeiro não disponível ${preposicao} ${nomeDia}`;
    }

    if (isHorarioPassado(horario)) {
      return "Horário expirado";
    }

    const barbeiroBloqueadoNoHorario = !verificarDisponibilidadeBarbeiro(barbeiroId, dataFormatada, horario);
    if (barbeiroBloqueadoNoHorario) {
      return "Barbeiro indisponível no horário";
    }

    const agendamentoExistente = (agendamentos ?? []).find(
      (agendamentoItem) => {
        if (
          agendamentoItem.barber_id === barbeiroId &&
          agendamentoItem.date === dataFormatada &&
          agendamentoItem.status !== 'cancelado' &&
          (agendamentoParaEditar ? agendamentoItem.id !== agendamentoParaEditar.id : true)
        ) {
          const slotMinutesStart = convertToMinutes(horario);
          const slotMinutesEnd = slotMinutesStart + 30;

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
      }
    );

    if (agendamentoExistente) {
      return "Horário já agendado";
    }

    return "Horário disponível";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="data"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <Label htmlFor="data">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    setDate(date);
                    form.setValue('horario', '');
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <FormMessage className="text-red-500 text-sm" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="horario"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <Label htmlFor="horario">Horário</Label>
            <div className="grid grid-cols-4 gap-2">
              {horariosDisponiveis.length === 0 && (
                <p className="text-sm text-red-600 font-medium text-center col-span-4">
                  {date
                    ? "Agendamentos indisponíveis para a data selecionada. Barbearia sem horário definido de funcionamento. Selecione outra data."
                    : "Selecione uma data para ver os horários disponíveis."}
                </p>
              )}
              {horariosDisponiveis.map((horario) => {
                const barbeiroId = form.watch('barbeiroId');
                const isUnavailable = isHorarioIndisponivel(barbeiroId, horario);
                const motivo = getMotivoIndisponibilidade(barbeiroId, horario);

                return (
                  <TooltipProvider key={horario}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          className={cn(
                            "py-2 px-1 rounded-md text-center font-medium transition-colors",
                            isUnavailable
                              ? "bg-red-100 text-red-700 cursor-not-allowed opacity-75"
                              : field.value === horario
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer border border-emerald-200"
                          )}
                          onClick={() => {
                            if (!isUnavailable) {
                              field.onChange(horario);
                            }
                          }}
                          disabled={isUnavailable}
                        >
                          {horario}
                        </Button>
                      </TooltipTrigger>
                      {isUnavailable && (
                        <TooltipContent>
                          <p>{motivo}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            <FormMessage className="text-red-500 text-sm" />
          </FormItem>
        )}
      />
    </div>
  );
}
