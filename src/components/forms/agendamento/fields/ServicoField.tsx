
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { servicos } from "../constants";

interface ServicoFieldProps {
  form: UseFormReturn<FormValues>;
}

export function ServicoField({ form }: ServicoFieldProps) {
  return (
    <FormField
      control={form.control}
      name="servico"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Serviço</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="truncate">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {servicos.map((servico) => (
                <SelectItem key={servico.id} value={servico.id}>
                  {servico.nome} - R$ {servico.valor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
