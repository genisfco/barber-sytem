import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { horarios } from "../../../../constants/horarios";
import { Dispatch, SetStateAction } from "react";

interface DataHorarioFieldsProps {
  form: UseFormReturn<FormValues>;
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
  agendamentos: any[]; // Assuming the type for agendamentos
}

export function DataHorarioFields({ form, date, setDate, agendamentos }: DataHorarioFieldsProps) {
  // Função para verificar se um horário está disponível para agendamento
  const isHorarioDisponivel = (horario: string) => {
    // Se não houver data selecionada, não está disponível
    if (!date) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionada = new Date(date);
    dataSelecionada.setHours(0, 0, 0, 0);

    // Se for hoje, só permite horários futuros 
    const [horaAgendamento, minutoAgendamento] = horario.split(':').map(Number);
    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();

    if (horaAgendamento < horaAtual) return false;
    if (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual) return false;

    // Verifica se o horário já está agendado para o barbeiro selecionado
    const horarioJaAgendado = agendamentos?.some(agendamento => {
      const dataAgendamento = new Date(agendamento.date);
      dataAgendamento.setHours(0, 0, 0, 0);
      
      return (
        dataAgendamento.getTime() === dataSelecionada.getTime() &&
        agendamento.time === horario &&
        agendamento.barber_id === form.getValues('barbeiroId') &&
        agendamento.status !== 'cancelado'
      );
    });

    if (horarioJaAgendado) return false;

    // Verifica se o cliente já tem um agendamento para o mesmo horário
    const clienteJaAgendado = agendamentos?.some(agendamento => {
      const dataAgendamento = new Date(agendamento.date);
      dataAgendamento.setHours(0, 0, 0, 0);
      
      return (
        dataAgendamento.getTime() === dataSelecionada.getTime() &&
        agendamento.time === horario &&
        agendamento.client_id === form.getValues('clienteId') &&
        agendamento.status !== 'cancelado'
      );
    });

    if (clienteJaAgendado) return false;

    return true;
  };

  // Função para desabilitar datas anteriores ao dia atual
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
                // Limpa o horário selecionado se a data for alterada
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
          <FormItem className="flex flex-col h-full">
            <FormLabel>Horário</FormLabel>
            <div className="flex-1 flex items-center">
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {horarios.map((horario) => (
                    <SelectItem 
                      key={horario} 
                      value={horario}
                      disabled={!isHorarioDisponivel(horario)}
                    >
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
