
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Agendamentos = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [openForm, setOpenForm] = useState(false);
  
  const { agendamentos, isLoading } = useAgendamentos(date);

  const agendamentosDoDia = agendamentos?.sort((a, b) => 
    a.time.localeCompare(b.time)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Agendamentos</h1>
        <Button onClick={() => setOpenForm(true)}>
          <Plus className="mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid md:grid-cols-[360px,1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

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
      </div>

      <AgendamentoForm open={openForm} onOpenChange={setOpenForm} />
    </div>
  );
};

export default Agendamentos;
