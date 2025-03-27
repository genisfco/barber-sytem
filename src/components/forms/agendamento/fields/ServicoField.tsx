import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { useServicos } from "@/hooks/useServicos";

interface ServicoFieldProps {
  form: UseFormReturn<FormValues>;
}

export function ServicoField({ form }: ServicoFieldProps) {
  const { servicos, isLoading } = useServicos();

  return (
    <FormField
      control={form.control}
      name="servicoId"
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
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Carregando serviços...
                </SelectItem>
              ) : servicos?.length === 0 ? (
                <SelectItem value="empty" disabled>
                  Nenhum serviço cadastrado
                </SelectItem>
              ) : (
                servicos?.map((servico) => (
                  <SelectItem key={servico.id} value={servico.id}>
                    {servico.name} - R$ {servico.price.toFixed(2)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
