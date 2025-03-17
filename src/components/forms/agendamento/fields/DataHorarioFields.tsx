
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { horarios } from "../constants";
import { Dispatch, SetStateAction } from "react";

interface DataHorarioFieldsProps {
  form: UseFormReturn<FormValues>;
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
}

export function DataHorarioFields({ form, date, setDate }: DataHorarioFieldsProps) {
  // Função para verificar se um horário está disponível para agendamento
  const isHorarioDisponivel = (horario: string) => {
    if (!date) return true;

    const hoje = new Date();
    const dataAgendamento = new Date(date);
    
    // Se for uma data futura, todos os horários estão disponíveis
    if (dataAgendamento.getDate() !== hoje.getDate() || 
        dataAgendamento.getMonth() !== hoje.getMonth() || 
        dataAgendamento.getFullYear() !== hoje.getFullYear()) {
      return true;
    }

    // Se for hoje, verifica o horário atual + 30 minutos
    const [horaAgendamento, minutoAgendamento] = horario.split(':').map(Number);
    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();

    // Calcula o horário atual + 30 minutos
    let horaComparacao = horaAtual;
    let minutoComparacao = minutoAtual + 30;
    
    // Ajusta caso os minutos ultrapassem 60
    if (minutoComparacao >= 60) {
      horaComparacao += 1;
      minutoComparacao -= 60;
    }

    // Compara os horários
    if (horaAgendamento < horaComparacao) return false;
    if (horaAgendamento === horaComparacao && minutoAgendamento < minutoComparacao) return false;

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
