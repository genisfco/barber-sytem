import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientes } from "@/hooks/useClientes";
import { useBarbers } from "@/hooks/useBarbers";
import { useServicos } from "@/hooks/useServicos";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { FormValues, createFormSchema } from "./agendamento/schema";
import { ClienteField } from "./agendamento/fields/ClienteField";
import { BarbeiroField } from "./agendamento/fields/BarbeiroField";
import { ServicoField } from "./agendamento/fields/ServicoField";
import { DataHorarioFields } from "./agendamento/fields/DataHorarioFields";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Agendamento {
  id: string;
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber: string;
  service_id: string;
  service: string;
  servicos: Array<{
    service_id: string;
    service_name: string;
    service_price: number;
    service_duration: number;
  }>;
}

interface AgendamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoParaEditar?: any;
  horarioInicial?: string;
  barbeiroInicial?: string;
  dataInicial?: Date;
}

export function AgendamentoForm({
  open,
  onOpenChange,
  agendamentoParaEditar,
  horarioInicial,
  barbeiroInicial,
  dataInicial,
}: AgendamentoFormProps) {
  const { toast } = useToast();
  const { selectedBarberShop } = useBarberShopContext();
  
  // Estado para a data selecionada
  const [dataSelecionada, setDataSelecionada] = useState<Date>(dataInicial || new Date());

  // Hook de agendamentos agora depende da data selecionada
  const { createAgendamento, updateAgendamento, agendamentos, verificarDisponibilidadeBarbeiro, verificarAgendamentoCliente } = useAgendamentos(dataSelecionada);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { clientes } = useClientes();
  const { barbers } = useBarbers();
  const { servicos } = useServicos();

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(agendamentos, servicos)),
    defaultValues: {
      id: agendamentoParaEditar?.id,
      clienteId: "",
      barbeiroId: barbeiroInicial || "",
      servicosSelecionados: [],
      data: dataInicial || new Date(),
      horario: horarioInicial || "",
    },
  });

  // Função para focar no primeiro campo com erro
  const focusFirstError = (errors: any) => {
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        (element as HTMLElement).focus();
      }
    }
  };

  // Adiciona o listener para erros do formulário
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        form.clearErrors(name);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Preenche o formulário quando recebe um agendamento para editar
  useEffect(() => {
    if (agendamentoParaEditar) {
      form.reset({
        id: agendamentoParaEditar.id,
        clienteId: agendamentoParaEditar.client_id,
        barbeiroId: agendamentoParaEditar.barber_id,
        servicosSelecionados: agendamentoParaEditar.servicos?.map(s => s.service_id) || [],
        data: new Date(agendamentoParaEditar.date + 'T00:00:00'),
        horario: agendamentoParaEditar.time,
      });
    }
  }, [agendamentoParaEditar, form]);

  // Atualiza os valores do formulário quando as props iniciais mudam
  useEffect(() => {
    if (!agendamentoParaEditar) {
      form.setValue('barbeiroId', barbeiroInicial || '');
      form.setValue('horario', horarioInicial || '');
      if (dataInicial) {
        form.setValue('data', dataInicial);
        setDataSelecionada(dataInicial);
      }
    }
  }, [horarioInicial, barbeiroInicial, dataInicial, agendamentoParaEditar, form]);

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  async function onSubmit(values: FormValues) {
    try {
      if (!selectedBarberShop?.id) {
        toast({
          title: "Erro ao agendar",
          description: "Barbearia não selecionada. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      
      // Se for um agendamento criado pelo app, garantir que o cliente não foi alterado
      if (agendamentoParaEditar?.created_by_app_user === true) {
        if (values.clienteId !== agendamentoParaEditar.client_id) {
          toast({
            title: "Erro ao editar",
            description: "Não é possível alterar o cliente de um agendamento criado pelo aplicativo.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Valida todos os campos
      const isValid = await form.trigger();
      
      if (!isValid) {
        const firstError = Object.keys(form.formState.errors)[0];
        if (firstError) {
          const element = document.querySelector(`[name="${firstError}"]`);
          if (element) {
            (element as HTMLElement).focus();
          }
          toast({
            title: "Campos obrigatórios",
            description: "Por favor, preencha todos os campos obrigatórios.",
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
        return;
      }

      const cliente = clientes?.find((c) => c.id === values.clienteId);
      const barbeiro = barbers?.find((b) => b.id === values.barbeiroId);
      const servicosSelecionados = servicos?.filter((s) => values.servicosSelecionados.includes(s.id));

      if (!cliente || !barbeiro || !servicosSelecionados?.length) {
        toast({
          title: "Erro no agendamento",
          description: "Dados inválidos. Por favor, verifique se todos os campos foram preenchidos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Verificar se o cliente já tem agendamento no mesmo dia
      const clienteJaAgendado = verificarAgendamentoCliente(cliente.id, format(values.data, "yyyy-MM-dd"), agendamentoParaEditar?.id);
      
      if (clienteJaAgendado) {
        toast({
          title: "Cliente já possui agendamento",
          description: "Este cliente já possui um agendamento para o dia selecionado. Por gentileza verifique a lista de agendamentos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Calcula o horário final do serviço
      const [horaInicial, minutoInicial] = values.horario.split(':').map(Number);
      const horarioInicial = new Date();
      horarioInicial.setHours(horaInicial, minutoInicial, 0, 0);
      
      const duracaoTotal = servicosSelecionados.reduce((sum, s) => sum + s.duration, 0);
      const horarioFinal = new Date(horarioInicial);
      horarioFinal.setMinutes(horarioFinal.getMinutes() + duracaoTotal);

      // Verifica indisponibilidade do barbeiro
      const indisponibilidades = await supabase
        .from('barber_unavailability')
        .select('*')
        .eq('barber_id', barbeiro.id)
        .eq('date', values.data.toISOString().split('T')[0]);

      const conflitoIndisponibilidade = indisponibilidades.data?.some(indisponibilidade => {
        const [horaIndisponibilidadeInicio, minutoIndisponibilidadeInicio] = indisponibilidade.start_time.split(':').map(Number);
        const [horaIndisponibilidadeFim, minutoIndisponibilidadeFim] = indisponibilidade.end_time.split(':').map(Number);

        const minutosIndisponibilidadeInicio = horaIndisponibilidadeInicio * 60 + minutoIndisponibilidadeInicio;
        const minutosIndisponibilidadeFim = horaIndisponibilidadeFim * 60 + minutoIndisponibilidadeFim;

        const minutosAgendamentoInicio = horaInicial * 60 + minutoInicial;
        const minutosAgendamentoFim = minutosAgendamentoInicio + duracaoTotal;

        return (
          (minutosAgendamentoInicio >= minutosIndisponibilidadeInicio && minutosAgendamentoInicio < minutosIndisponibilidadeFim) ||
          (minutosAgendamentoFim > minutosIndisponibilidadeInicio && minutosAgendamentoFim <= minutosIndisponibilidadeFim) ||
          (minutosAgendamentoInicio <= minutosIndisponibilidadeInicio && minutosAgendamentoFim >= minutosIndisponibilidadeFim)
        );
      });

      if (conflitoIndisponibilidade) {
        toast({
          variant: "destructive",
          title: "Conflito de agendamento",
          description: "O barbeiro estará indisponível para a data e horário necessários. Por favor, escolha outro horário.",
        });
        setIsSubmitting(false);
        return;
      }

      // Verifica disponibilidade para todo o período do serviço
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('date', values.data.toISOString().split('T')[0])
        .eq('barber_shop_id', selectedBarberShop.id)
        .or(`barber_id.eq.${barbeiro.id},client_id.eq.${cliente.id}`)
        .neq('status', 'cancelado')
        .in('status', ['confirmado', 'pendente']);

      // Se estiver editando, exclui o próprio agendamento da verificação
      if (agendamentoParaEditar?.id) {
        query = query.neq('id', agendamentoParaEditar.id);
      }

      const agendamentosConflitantes = await query;

      if (agendamentosConflitantes.data) {
        const verificarConflito = async (ag: any) => {
          const [horaAg, minutoAg] = ag.time.split(':').map(Number);
          const horarioAg = new Date(values.data);
          horarioAg.setHours(horaAg, minutoAg, 0, 0);

          const fimAg = new Date(horarioAg);
          const servicosAg = await supabase
            .from('appointment_services')
            .select('service_duration')
            .eq('appointment_id', ag.id);
          
          const duracaoTotalAg = servicosAg.data?.reduce((sum, s) => sum + s.service_duration, 0) || 0;
          fimAg.setMinutes(fimAg.getMinutes() + duracaoTotalAg);

          const novoInicio = new Date(values.data);
          novoInicio.setHours(horaInicial, minutoInicial, 0, 0);
          
          const novoFim = new Date(novoInicio);
          novoFim.setMinutes(novoFim.getMinutes() + duracaoTotal);

          const temConflito = (
            (novoInicio >= horarioAg && novoInicio < fimAg) ||
            (novoFim > horarioAg && novoFim <= fimAg) ||
            (novoInicio <= horarioAg && novoFim >= fimAg)
          );

          return temConflito;
        };

        const conflitos = await Promise.all(agendamentosConflitantes.data.map(verificarConflito));
        const temConflito = conflitos.some(conflito => conflito);

        if (temConflito) {
          toast({
            variant: "destructive",
            title: "Conflito de horários",
            description: "Horário ocupado por outro cliente. Escolha outro horário ou barbeiro.",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const dadosAgendamento = {
        date: values.data.toISOString().split('T')[0],
        time: values.horario,
        client_id: cliente.id,
        client_name: cliente.name,
        client_email: cliente.email,
        client_phone: cliente.phone,
        barber_id: barbeiro.id,
        barber_name: barbeiro.name,
        barber_shop_id: selectedBarberShop.id,
        services: servicosSelecionados.map(servico => ({
          service_id: servico.id,
          service_name: servico.name,
          service_price: servico.price,
          service_duration: servico.duration
        })),
        total_duration: duracaoTotal,
        total_price: servicosSelecionados.reduce((sum, s) => sum + s.price, 0),
        status: 'pendente'
      };

      if (agendamentoParaEditar) {
        const { services, ...dadosAgendamentoSemServicos } = dadosAgendamento;
        await updateAgendamento.mutateAsync({
          id: agendamentoParaEditar.id,
          ...dadosAgendamentoSemServicos,
        });

        // Atualiza os serviços separadamente
        await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', agendamentoParaEditar.id);

        await supabase
          .from('appointment_services')
          .insert(services.map(service => ({
            appointment_id: agendamentoParaEditar.id,
            ...service
          })));
      } else {
        await createAgendamento.mutateAsync(dadosAgendamento);
      }

      onOpenChange(false);
      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      toast({
        title: "Erro ao agendar",
        description: "Ocorreu um erro ao processar o formulário. Por favor, tente novamente mais tarde.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      
      <DialogContent className="max-w-3xl max-h-[110vh] overflow-y-auto bg-secondary">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            {agendamentoParaEditar ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => {
                  const isClienteBloqueado = agendamentoParaEditar?.created_by_app_user === true;
                  
                  return (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isClienteBloqueado}
                      >
                        <FormControl>
                          <SelectTrigger className={isClienteBloqueado ? "bg-muted cursor-not-allowed" : ""}>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes?.filter(cliente => cliente.active).map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isClienteBloqueado && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <p>Agendamento feito no aplicativo BarberPro.</p>
                          <p>Cliente não pode ser alterado.</p>
                        </div>
                      )}
                      <FormMessage className="text-red-500 text-sm" />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="barbeiroId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barbeiro *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um barbeiro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {barbers?.filter(barbeiro => barbeiro.active).map((barbeiro) => (
                          <SelectItem key={barbeiro.id} value={barbeiro.id}>
                            {barbeiro.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="servicosSelecionados"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Serviços *</FormLabel>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {servicos?.map((servico) => (
                      <FormField
                        key={servico.id}
                        control={form.control}
                        name="servicosSelecionados"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={servico.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(servico.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, servico.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== servico.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-normal">
                                  {servico.name} - {formatarPreco(servico.price)}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            <DataHorarioFields 
              form={form} 
              date={form.watch('data')}
              setDate={(date: Date | undefined) => {
                form.setValue('data', date as Date);
              }}
              agendamentos={agendamentos}
              barberShopId={selectedBarberShop?.id as string}
              agendamentoParaEditar={agendamentoParaEditar}
            />

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {agendamentoParaEditar ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
