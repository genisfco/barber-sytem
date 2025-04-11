import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { useServicos } from "@/hooks/useServicos";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando serviços...</div>
              ) : servicos?.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum serviço cadastrado</div>
              ) : (
                servicos?.map((servico) => (
                  <div key={servico.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={servico.id}
                      checked={field.value === servico.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange(servico.id);
                        } else {
                          field.onChange("");
                        }
                      }}
                    />
                    <label
                      htmlFor={servico.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {servico.name} - R$ {servico.price.toFixed(2)}
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
