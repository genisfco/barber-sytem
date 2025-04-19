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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { horarios } from "@/constants/horarios";

const formSchema = z.object({
  data: z.date({
    required_error: "Selecione a data",
  }),
  horarioInicial: z.string({
    required_error: "Selecione o horário inicial",
  }),
  horarioFinal: z.string({
    required_error: "Selecione o horário final",
  }),
  motivo: z.string().optional(),
}).refine((data) => {
  const [horaInicial, minutoInicial] = data.horarioInicial.split(':').map(Number);
  const [horaFinal, minutoFinal] = data.horarioFinal.split(':').map(Number);
  const minutosInicial = horaInicial * 60 + minutoInicial;
  const minutosFinal = horaFinal * 60 + minutoFinal;
  return minutosFinal > minutosInicial;
}, {
  message: "O horário final deve ser posterior ao horário inicial",
  path: ["horarioFinal"],
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
      horarioInicial: undefined,
      horarioFinal: undefined,
    },
  });

  const { 
    registrarIndisponibilidade, 
    removerIndisponibilidade, 
    verificarIndisponibilidade 
  } = useIndisponibilidades();

  const onSubmit = async (data: IndisponivelFormValues) => {
    try {
      if (estaIndisponivel) {
        await removerIndisponibilidade.mutateAsync({ 
          barbeiroId, 
          data: data.data,
          horarioInicial: data.horarioInicial,
          horarioFinal: data.horarioFinal
        });
      } else {
        await registrarIndisponibilidade.mutateAsync({
          barbeiroId,
          data: data.data,
          horarioInicial: data.horarioInicial,
          horarioFinal: data.horarioFinal,
          motivo: data.motivo
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao processar indisponibilidade:', error);
    }
  };

  const dataSelecionada = form.watch("data");
  const horarioInicial = form.watch("horarioInicial");
  const horarioFinal = form.watch("horarioFinal");
  const estaIndisponivel = dataSelecionada && horarioInicial && horarioFinal ? 
    verificarIndisponibilidade(barbeiroId, dataSelecionada, horarioInicial) : false;

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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="horarioInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário Inicial</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o horário inicial" />
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

          <FormField
            control={form.control}
            name="horarioFinal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário Final</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o horário final" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((horario) => (
                      <SelectItem 
                        key={horario} 
                        value={horario}
                        disabled={horarioInicial && horario <= horarioInicial}
                      >
                        {horario}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant={estaIndisponivel ? "destructive" : "default"}
          >
            {estaIndisponivel ? "Remover Indisponibilidade" : "Registrar Indisponibilidade"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 