
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgendamentos } from "@/hooks/useAgendamentos";

interface Agendamento {
  id: string;
  time: string;
  client_name: string;
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

  return (
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
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelar(agendamento.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {}} // Será implementado posteriormente
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      >
                        <Pencil className="h-4 w-4" />
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
  );
}
