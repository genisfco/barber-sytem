import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const formSchema = z.object({
  data: z.date({
    required_error: "Selecione a data",
  }),
  motivo: z.string().optional(),
});

type IndisponivelFormValues = z.infer<typeof formSchema>;

interface IndisponivelFormProps {
  barbeiroId: string;
  barbeiroName: string;
  onOpenChange: (open: boolean) => void;
}

export function IndisponivelForm({ barbeiroId, barbeiroName, onOpenChange }: IndisponivelFormProps) {
  const form = useForm<IndisponivelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: undefined,
    },
  });

  const { 
    registrarIndisponibilidade, 
    removerIndisponibilidade, 
    verificarIndisponibilidade 
  } = useIndisponibilidades();

  const onSubmit = async (data: IndisponivelFormValues) => {
    const estaIndisponivel = verificarIndisponibilidade(barbeiroId, data.data);
    
    if (estaIndisponivel) {
      await removerIndisponibilidade.mutateAsync({ 
        barbeiroId, 
        data: data.data 
      });
    } else {
      await registrarIndisponibilidade.mutateAsync({
        barbeiroId,
        data: data.data,
        motivo: data.motivo
      });
    }

    onOpenChange(false);
  };

  const dataSelecionada = form.watch("data");
  const estaIndisponivel = dataSelecionada ? verificarIndisponibilidade(barbeiroId, dataSelecionada) : false;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormItem className="flex flex-col">          
          <div className="text-lg font-semibold mb-4">{barbeiroName}</div>
        </FormItem>
          
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
                className="rounded-md border mx-auto"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">
            {estaIndisponivel ? "Remover Indisponibilidade" : "Registrar Indisponibilidade"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 