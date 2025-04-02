import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { horarios } from "@/constants/horarios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { IndisponivelForm } from "@/components/forms/BarberIndisponivelForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";

interface AgendamentoGridProps {
  date: Date;
  agendamentos: any[] | undefined;
  isLoading: boolean;
}

export function AgendamentoGrid({ date, agendamentos, isLoading }: AgendamentoGridProps) {
  const { barbeiros } = useBarbeiros();
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openIndisponivelForm, setOpenIndisponivelForm] = useState(false);
  const [selectedBarbeiroIndisponivel, setSelectedBarbeiroIndisponivel] = useState<{id: string, name: string} | null>(null);

  const handleHorarioClick = (barbeiroId: string, horario: string) => {
    setSelectedBarbeiro(barbeiroId);
    setSelectedHorario(horario);
    setOpenForm(true);
  };

  const handleIndisponivelClick = (barbeiroId: string, barbeiroName: string) => {
    setSelectedBarbeiroIndisponivel({ id: barbeiroId, name: barbeiroName });
    setOpenIndisponivelForm(true);
  };

  const isHorarioPassado = (horario: string) => {
    const [hora, minuto] = horario.split(":").map(Number);
    const horaAtual = new Date().getHours();
    const minutoAtual = new Date().getMinutes();
    const hoje = new Date().toISOString().split("T")[0];
    const dataSelecionada = format(date, "yyyy-MM-dd");

    if (dataSelecionada < hoje) return true;
    if (dataSelecionada > hoje) return false;
    
    if (hora < horaAtual) return true;
    if (hora === horaAtual && minuto <= minutoAtual) return true;
    
    return false;
  };

  // Função para verificar se um horário está ocupado para um barbeiro específico
  const isHorarioIndisponivel = (barbeiroId: string, horario: string) => {
    return agendamentos?.some(
      (agendamento) =>
        agendamento.barber_id === barbeiroId &&
        agendamento.time.slice(0, 5) === horario && // REMOVENDO OS SEGS, PARA USAR APENAS HH:mm
        (agendamento.status === "pendente" || 
         agendamento.status === "atendido" || 
         agendamento.status === "confirmado" ||
         agendamento.status === "ocupado" ||
         agendamento.status === "indisponivel")
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando horários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbeiros?.map((barbeiro) => (
          <Card key={barbeiro.id} className="overflow-hidden bg-white border shadow-sm">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{barbeiro.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:text-primary-foreground/80"
                  onClick={() => handleIndisponivelClick(barbeiro.id, barbeiro.name)}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {horarios.map((horario) => {
                  const horario_barbeiro_indisponivel = isHorarioIndisponivel(barbeiro.id, horario);
                  const horario_passado = isHorarioPassado(horario);
                  const hora_agenda_indisponivel = horario_barbeiro_indisponivel || horario_passado;

                  return (
                    <div
                      key={`${barbeiro.id}-${horario}`}
                      className={`py-2 px-1 rounded-md text-center font-medium transition-colors ${
                        hora_agenda_indisponivel
                          ? "bg-red-100 text-red-700 cursor-not-allowed opacity-75"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      }`}
                      onClick={() => !hora_agenda_indisponivel && handleHorarioClick(barbeiro.id, horario)}
                    >
                      {horario}
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

      <Dialog open={openIndisponivelForm} onOpenChange={setOpenIndisponivelForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Indisponibilidade</DialogTitle>
          </DialogHeader>
          {selectedBarbeiroIndisponivel && (
            <IndisponivelForm
              barbeiroId={selectedBarbeiroIndisponivel.id}
              barbeiroName={selectedBarbeiroIndisponivel.name}
              onOpenChange={setOpenIndisponivelForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
