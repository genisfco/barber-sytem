
import { useState } from "react";
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
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { formSchema, FormValues } from "./agendamento/schema";
import { servicos } from "./agendamento/constants";
import { ClienteField } from "./agendamento/fields/ClienteField";
import { BarbeiroField } from "./agendamento/fields/BarbeiroField";
import { ServicoField } from "./agendamento/fields/ServicoField";
import { DataHorarioFields } from "./agendamento/fields/DataHorarioFields";

interface AgendamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgendamentoForm({ open, onOpenChange }: AgendamentoFormProps) {
  const [date, setDate] = useState<Date>();
  const { clientes } = useClientes();
  const { barbeiros } = useBarbeiros();
  const { createAgendamento } = useAgendamentos();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    const cliente = clientes?.find((c) => c.id === values.clienteId);
    const barbeiro = barbeiros?.find((b) => b.id === values.barbeiroId);
    const servico = servicos.find((s) => s.id === values.servico);

    if (!cliente || !barbeiro || !servico) {
      return;
    }

    await createAgendamento.mutateAsync({
      date: values.data.toISOString().split('T')[0],
      time: values.horario,
      client_id: cliente.id,
      client_name: cliente.name,
      client_email: cliente.email,
      client_phone: cliente.phone,
      barber_id: barbeiro.id,
      barber: barbeiro.name,
      service: servico.nome,
    });

    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ClienteField form={form} />
            <BarbeiroField form={form} />
            <ServicoField form={form} />
            <DataHorarioFields form={form} date={date} setDate={setDate} />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Agendar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
