
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const agendamentosDoDia = agendamentos?.sort((a, b) => 
    a.time.localeCompare(b.time)
  );

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
