import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";

const Agendamentos = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [openForm, setOpenForm] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Agendamentos</h1>
        <Button onClick={() => setOpenForm(true)}>
          <Plus className="mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid md:grid-cols-[400px,1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground">
              Nenhum agendamento para hoje.
            </div>
          </CardContent>
        </Card>
      </div>

      <AgendamentoForm open={openForm} onOpenChange={setOpenForm} />
    </div>
  );
};

export default Agendamentos;