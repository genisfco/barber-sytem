import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { horarios } from "../../../../constants/horarios";
import { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";

interface DataHorarioFieldsProps {
  form: UseFormReturn<FormValues>;
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
  agendamentos: any[];
}

export function DataHorarioFields({ form, date, setDate, agendamentos }: DataHorarioFieldsProps) {
  const isHorarioDisponivel = (horario: string) => {
    if (!date) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionada = new Date(date);
    dataSelecionada.setHours(0, 0, 0, 0);

    const [horaAgendamento, minutoAgendamento] = horario.split(':').map(Number);
    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();

    if (horaAgendamento < horaAtual) return false;
    if (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual) return false;

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
                
                return (
                  <button
                    key={horario}
                    type="button"
                    onClick={() => {
                      if (disponivel) {
                        field.onChange(horario);
                      }
                    }}
                    className={cn(
                      "p-2 rounded-md text-sm transition-colors",
                      !disponivel && "opacity-50 cursor-not-allowed",
                      selecionado && "bg-primary text-primary-foreground",
                      disponivel && !selecionado && "hover:bg-primary/10"
                    )}
                    disabled={!disponivel}
                  >
                    {horario}
                  </button>
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
