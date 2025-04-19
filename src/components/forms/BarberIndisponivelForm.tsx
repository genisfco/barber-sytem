import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  todosHorarios: z.boolean().default(false),
}).refine((data) => {
  if (data.todosHorarios) return true;
  
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
      todosHorarios: false,
    },
  });

  const { 
    registrarIndisponibilidade, 
    removerIndisponibilidade, 
    verificarIndisponibilidade,
    indisponibilidades 
  } = useIndisponibilidades();

  // Função para buscar indisponibilidade existente
  const buscarIndisponibilidadeExistente = (data: Date) => {
    if (!indisponibilidades || !data) return null;
    
    const formattedDate = format(data, "yyyy-MM-dd");
    return indisponibilidades.find(
      (indisponibilidade) => 
        indisponibilidade.barber_id === barbeiroId && 
        indisponibilidade.date === formattedDate
    );
  };

  // Efeito para atualizar o formulário quando a data é selecionada
  useEffect(() => {
    const data = form.getValues("data");
    if (!data) return;

    const indisponibilidade = buscarIndisponibilidadeExistente(data);
    if (indisponibilidade) {
      // Se existe indisponibilidade, preenche os campos
      if (!indisponibilidade.start_time && !indisponibilidade.end_time) {
        // Se não tem horário específico, é para o dia todo
        form.setValue("todosHorarios", true);
        form.setValue("horarioInicial", horarios[0]);
        form.setValue("horarioFinal", horarios[horarios.length - 1]);
      } else {
        // Se tem horário específico, preenche os campos
        form.setValue("todosHorarios", false);
        form.setValue("horarioInicial", indisponibilidade.start_time);
        form.setValue("horarioFinal", indisponibilidade.end_time);
      }
    } else {
      // Se não existe indisponibilidade, limpa os campos
      form.setValue("todosHorarios", false);
      form.setValue("horarioInicial", undefined);
      form.setValue("horarioFinal", undefined);
    }
  }, [form.watch("data")]);

  const onSubmit = async (data: IndisponivelFormValues) => {
    try {
      const indisponibilidade = buscarIndisponibilidadeExistente(data.data);
      
      if (indisponibilidade) {
        // Se já existe indisponibilidade, remove
        await removerIndisponibilidade.mutateAsync({ 
          barbeiroId, 
          data: data.data
        });
      } else {
        // Se não existe, registra nova indisponibilidade
        await registrarIndisponibilidade.mutateAsync({
          barbeiroId,
          data: data.data,
          horarioInicial: data.todosHorarios ? horarios[0] : data.horarioInicial,
          horarioFinal: data.todosHorarios ? horarios[horarios.length - 1] : data.horarioFinal,
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
  const todosHorarios = form.watch("todosHorarios");
  
  // Verifica se existe indisponibilidade para a data selecionada
  const indisponibilidadeExistente = dataSelecionada ? buscarIndisponibilidadeExistente(dataSelecionada) : null;
  const estaIndisponivel = !!indisponibilidadeExistente;

  // Função para verificar se um horário está dentro do período selecionado
  const isHorarioSelecionado = (horario: string) => {
    if (!dataSelecionada) return false;
    
    if (indisponibilidadeExistente) {
      if (!indisponibilidadeExistente.start_time && !indisponibilidadeExistente.end_time) {
        return true; // Se não tem horário específico, todos estão selecionados
      }
      
      const [hora, minuto] = horario.split(':').map(Number);
      const [horaInicial, minutoInicial] = indisponibilidadeExistente.start_time.split(':').map(Number);
      const [horaFinal, minutoFinal] = indisponibilidadeExistente.end_time.split(':').map(Number);
      
      const minutosHorario = hora * 60 + minuto;
      const minutosInicial = horaInicial * 60 + minutoInicial;
      const minutosFinal = horaFinal * 60 + minutoFinal;
      
      return minutosHorario >= minutosInicial && minutosHorario <= minutosFinal;
    }

    if (!horarioInicial || !horarioFinal) return todosHorarios;

    const [hora, minuto] = horario.split(':').map(Number);
    const [horaIni, minutoIni] = horarioInicial.split(':').map(Number);
    const [horaFim, minutoFim] = horarioFinal.split(':').map(Number);

    const minutosHorario = hora * 60 + minuto;
    const minutosInicial = horaIni * 60 + minutoIni;
    const minutosFinal = horaFim * 60 + minutoFim;

    return minutosHorario >= minutosInicial && minutosHorario <= minutosFinal;
  };

  // Handler para alternar entre todos os horários
  const handleTodosHorariosChange = (checked: boolean) => {
    form.setValue('todosHorarios', checked);
    if (checked) {
      form.setValue('horarioInicial', horarios[0]);
      form.setValue('horarioFinal', horarios[horarios.length - 1]);
    } else {
      form.setValue('horarioInicial', undefined);
      form.setValue('horarioFinal', undefined);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormItem className="flex flex-col">          
          <div className="text-lg font-semibold mb-4">{barbeiroName}</div>
        </FormItem>

        <div className="grid grid-cols-2 gap-3">
          {/* Coluna da Esquerda - Calendário */}
          <div>
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
                    className="rounded-md border"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Coluna da Direita - Horários */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="todosHorarios"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Todos Horários
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleTodosHorariosChange}
                        disabled={estaIndisponivel}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {!todosHorarios && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horarioInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário Inicial</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={estaIndisponivel}
                      >
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={estaIndisponivel}
                      >
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
                              disabled={estaIndisponivel || (horarioInicial && horario <= horarioInicial)}
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
            )}

            <div className="grid grid-cols-4 gap-1">
              {horarios.map((horario) => (
                <div
                  key={horario}
                  className={cn(
                    "py-2 px-1 rounded-md text-center font-medium transition-colors",
                    isHorarioSelecionado(horario)
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {horario}
                </div>
              ))}
            </div>
          </div>
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