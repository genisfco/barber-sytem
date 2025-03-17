
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Pencil, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useState } from "react";
import { AgendamentoForm } from "../forms/AgendamentoForm";

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
  service: string;
  status: string;
}

interface AgendamentosTableProps {
  agendamentos: Agendamento[] | undefined;
  isLoading: boolean;
}

export function AgendamentosTable({ agendamentos, isLoading }: AgendamentosTableProps) {
  const { updateAgendamento } = useAgendamentos(new Date());
  const [openEditForm, setOpenEditForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<Agendamento>();

  const agendamentosDoDia = agendamentos?.sort((a, b) => 
    a.time.localeCompare(b.time)
  );

  const handleConfirmar = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "confirmado"
    });
  };

  const handleCancelar = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "cancelado"
    });
  };

  const handleAtendido = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "atendido"
    });
  };

  const handleEditar = (agendamento: Agendamento) => {
    setAgendamentoParaEditar(agendamento);
    setOpenEditForm(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : agendamentosDoDia?.length === 0 ? (
            <div className="text-muted-foreground">
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentosDoDia?.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell>{agendamento.time}</TableCell>
                    <TableCell>{agendamento.client_name}</TableCell>
                    <TableCell>{agendamento.barber}</TableCell>
                    <TableCell>{agendamento.service}</TableCell>
                    <TableCell>{agendamento.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConfirmar(agendamento.id)}
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          title="Confirmar horário"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelar(agendamento.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          title="Cancelar agendamento"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditar(agendamento)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          title="Editar agendamento"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAtendido(agendamento.id)}
                          className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                          title="Cliente atendido"
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>   
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AgendamentoForm 
        open={openEditForm} 
        onOpenChange={setOpenEditForm}
        agendamentoParaEditar={agendamentoParaEditar}
      />
    </>
  );
}
