
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
  return (
    <>
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
              }}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="horario"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Horário</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {horarios.map((horario) => (
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
    </>
  );
}
