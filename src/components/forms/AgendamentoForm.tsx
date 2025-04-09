import { useState, useEffect, Dispatch, SetStateAction } from "react";
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
import { useBarbeiros } from "@/hooks/useBarbeiros";
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
  const { createAgendamento, updateAgendamento } = useAgendamentos();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { clientes } = useClientes();
  const { barbeiros } = useBarbeiros();
  const { servicos } = useServicos();
  const { agendamentos } = useAgendamentos(dataInicial);

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(agendamentos, servicos)),
    defaultValues: {
      clienteId: "",
      barbeiroId: barbeiroInicial || "",
      servicoId: "",
      data: dataInicial || new Date(),
      horario: horarioInicial || "",
    },
  });

  // Preenche o formulário quando recebe um agendamento para editar
  useEffect(() => {
    if (agendamentoParaEditar) {
      const data = new Date(agendamentoParaEditar.date);
      form.reset({
        clienteId: agendamentoParaEditar.client_id,
        barbeiroId: agendamentoParaEditar.barber_id,
        servicoId: agendamentoParaEditar.service_id,
        data: data,
        horario: agendamentoParaEditar.time,
      });
    }
  }, [agendamentoParaEditar, form]);

  async function onSubmit(values: FormValues) {
    const cliente = clientes?.find((c) => c.id === values.clienteId);
    const barbeiro = barbeiros?.find((b) => b.id === values.barbeiroId);
    const servico = servicos?.find((s) => s.id === values.servicoId);

    if (!cliente || !barbeiro || !servico) {
      return;
    }

    // Calcula quantos slots de 30 minutos são necessários
    const slotsNecessarios = Math.ceil(servico.duration / 30);
    const horariosParaAgendar = [values.horario];

    // Se precisar de mais de um slot, adiciona os próximos horários
    for (let i = 1; i < slotsNecessarios; i++) {
      const [hora, minuto] = values.horario.split(':').map(Number);
      const proximoHorario = new Date();
      proximoHorario.setHours(hora, minuto + (i * 30), 0, 0);
      const proximoHorarioFormatado = `${proximoHorario.getHours().toString().padStart(2, '0')}:${proximoHorario.getMinutes().toString().padStart(2, '0')}`;
      horariosParaAgendar.push(proximoHorarioFormatado);
    }

    // Verifica disponibilidade para todos os horários necessários
    for (const horario of horariosParaAgendar) {
      // Verifica se o cliente já tem um agendamento para o mesmo horário
      const agendamentoExistente = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', cliente.id)
        .eq('date', values.data.toISOString().split('T')[0])
        .eq('time', horario)
        .in('status', ['confirmado', 'pendente'])
        .single();

      if (agendamentoExistente.data) {
        toast({
          variant: "destructive",
          title: "Erro ao agendar",
          description: `Este cliente já possui um agendamento para o horário ${horario}.`,
        });
        return;
      }

      // Verifica se o barbeiro já tem um agendamento para o mesmo horário
      const barbeiroAgendado = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barbeiro.id)
        .eq('date', values.data.toISOString().split('T')[0])
        .eq('time', horario)
        .in('status', ['confirmado', 'pendente'])
        .single();

      if (barbeiroAgendado.data) {
        toast({
          variant: "destructive",
          title: "Erro ao agendar",
          description: `Este barbeiro já possui um agendamento para o horário ${horario}.`,
        });
        return;
      }
    }

    // Cria os agendamentos para cada horário necessário
    for (const horario of horariosParaAgendar) {
      const dadosAgendamento = {
        date: values.data.toISOString().split('T')[0],
        time: horario,
        client_id: cliente.id,
        client_name: cliente.name,
        client_email: cliente.email,
        client_phone: cliente.phone,
        barber_id: barbeiro.id,
        barber: barbeiro.name,
        service_id: servico.id,
        service: servico.name,
        status: 'pendente'
      };

      if (agendamentoParaEditar && horario === values.horario) {
        await updateAgendamento.mutateAsync({
          id: agendamentoParaEditar.id,
          ...dadosAgendamento,
        });
      } else {
        await createAgendamento.mutateAsync(dadosAgendamento);
      }
    }

    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            {agendamentoParaEditar ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClienteField form={form} />
              <BarbeiroField form={form} />
              <ServicoField form={form} />
            </div>
            <DataHorarioFields 
              form={form} 
              date={form.watch('data')} 
              setDate={(date: Date | undefined) => form.setValue('data', date as Date)} 
              agendamentos={agendamentos} 
            />

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {agendamentoParaEditar ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
