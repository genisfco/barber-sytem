import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { horarios } from "@/components/forms/agendamento/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendamentoGridProps {
  date: Date;
}

export function AgendamentoGrid({ date }: AgendamentoGridProps) {
  const { barbeiros } = useBarbeiros();
  const { agendamentos } = useAgendamentos(date);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const handleHorarioClick = (barbeiroId: string, horario: string) => {
    setSelectedBarbeiro(barbeiroId);
    setSelectedHorario(horario);
    setOpenForm(true);
  };

  const isHorarioOcupado = (barbeiroId: string, horario: string) => {
    return agendamentos?.some(
      (agendamento) =>
        agendamento.barber_id === barbeiroId &&
        agendamento.time === horario &&
        agendamento.status !== "cancelado"
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbeiros?.map((barbeiro) => (
          <Card key={barbeiro.id} className="overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-lg">{barbeiro.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {horarios.map((horario) => {
                  const ocupado = isHorarioOcupado(barbeiro.id, horario);
                  return (
                    <div
                      key={`${barbeiro.id}-${horario}`}
                      className={`p-2 rounded-md text-center cursor-pointer transition-colors ${
                        ocupado
                          ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                      onClick={() => !ocupado && handleHorarioClick(barbeiro.id, horario)}
                    >
                      <div className="font-medium">{horario}</div>
                      
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <AgendamentoForm
            open={openForm}
            onOpenChange={setOpenForm}
            horarioInicial={selectedHorario || ""}
            barbeiroInicial={selectedBarbeiro || ""}
            dataInicial={date}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 