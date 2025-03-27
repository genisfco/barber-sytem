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
  agendamentoParaEditar?: Agendamento;
}

export function AgendamentoForm({ open, onOpenChange, agendamentoParaEditar }: AgendamentoFormProps) {
  const [date, setDate] = useState<Date>();
  const { clientes } = useClientes();
  const { barbeiros } = useBarbeiros();
  const { servicos } = useServicos();
  const { createAgendamento, updateAgendamento } = useAgendamentos(new Date());
  const { agendamentos } = useAgendamentos(date);

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(agendamentos)),
  });

  // Preenche o formulário quando recebe um agendamento para editar
  useEffect(() => {
    if (agendamentoParaEditar) {
      const data = new Date(agendamentoParaEditar.date);
      setDate(data);
      
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

    // Verifica se o cliente já tem um agendamento para o mesmo horário
    const agendamentoExistente = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', cliente.id)
      .eq('date', values.data.toISOString().split('T')[0])
      .eq('time', values.horario)
      .in('status', ['confirmado', 'pendente'])
      .single();

    if (agendamentoExistente.data) {
      toast({
        variant: "destructive",
        title: "Erro ao agendar",
        description: "Este cliente já possui um agendamento para este horário.",
      });
      return;
    }

    // Verifica se o barbeiro já tem um agendamento para o mesmo horário
    const barbeiroAgendado = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', barbeiro.id)
      .eq('date', values.data.toISOString().split('T')[0])
      .eq('time', values.horario)
      .in('status', ['confirmado', 'pendente'])
      .single();

    if (barbeiroAgendado.data) {
      toast({
        variant: "destructive",
        title: "Erro ao agendar",
        description: "Este barbeiro já possui um agendamento para este horário.",
      });
      return;
    }

    const dadosAgendamento = {
      date: values.data.toISOString().split('T')[0],
      time: values.horario,
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

    if (agendamentoParaEditar) {
      await updateAgendamento.mutateAsync({
        id: agendamentoParaEditar.id,
        ...dadosAgendamento,
      });
    } else {
      await createAgendamento.mutateAsync(dadosAgendamento);
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
              date={date} 
              setDate={setDate} 
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
