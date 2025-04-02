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
import { useAgendamentos } from "@/hooks/useAgendamentos";

const formSchema = z.object({
  data: z.date({
    required_error: "Selecione a data",
  }),
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
      data: new Date(),
    },
  });

  const { registrarIndisponibilidade, removerIndisponibilidade } = useIndisponibilidades();
  const { agendamentos } = useAgendamentos();

  const onSubmit = async (data: IndisponivelFormValues) => {
    const formattedDate = format(data.data, "yyyy-MM-dd");
    
    // Verifica se já existe indisponibilidade para esta data
    const jaIndisponivel = agendamentos?.some(
      (agendamento) =>
        agendamento.barber_id === barbeiroId &&
        agendamento.date === formattedDate &&
        agendamento.status === "indisponivel"
    );

    if (jaIndisponivel) {
      // Se já existe, remove a indisponibilidade
      await removerIndisponibilidade.mutateAsync({ barbeiroId, data: data.data });
    } else {
      // Se não existe, registra a indisponibilidade
      await registrarIndisponibilidade.mutateAsync({
        barbeiroId,
        barbeiroName,
        data: data.data,
      });
    }

    onOpenChange(false);
  };

  const dataSelecionada = form.watch("data");
  const formattedDate = dataSelecionada ? format(dataSelecionada, "yyyy-MM-dd") : "";
  const jaIndisponivel = agendamentos?.some(
    (agendamento) =>
      agendamento.barber_id === barbeiroId &&
      agendamento.date === formattedDate &&
      agendamento.status === "indisponivel"
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">
            {jaIndisponivel ? "Remover Indisponibilidade" : "Registrar Indisponibilidade"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 