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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgendamentoGridProps {
  date: Date;
  agendamentos: any[] | undefined;
  isLoading: boolean;
}

export function AgendamentoGrid({ date, agendamentos, isLoading }: AgendamentoGridProps) {
  const { barbeiros } = useBarbeiros();
  const { verificarDisponibilidadeBarbeiro } = useAgendamentos();
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openIndisponivelForm, setOpenIndisponivelForm] = useState(false);
  const [selectedBarbeiroIndisponivel, setSelectedBarbeiroIndisponivel] = useState<{id: string, name: string} | null>(null);

  // Formatamos a data para o padrão yyyy-MM-dd
  const dataFormatada = format(date, "yyyy-MM-dd");

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
    const hoje = new Date();
    const dataSelecionada = new Date(date);
    
    // Se a data selecionada for anterior a hoje, todos os horários são considerados passados
    if (dataSelecionada < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
      return true;
    }
    
    // Se a data selecionada for posterior a hoje, nenhum horário é considerado passado
    if (dataSelecionada > new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
      return false;
    }
    
    // Se for hoje, verifica se o horário já passou
    if (hora < hoje.getHours()) return true;
    if (hora === hoje.getHours() && minuto <= hoje.getMinutes()) return true;
    
    return false;
  };

  // Função para verificar se um horário está ocupado para um barbeiro específico
  const isHorarioIndisponivel = (barbeiroId: string, horario: string) => {
    // Verifica se o barbeiro está indisponível para o horário específico
    const barbeiroBloqueadoNoHorario = !verificarDisponibilidadeBarbeiro(barbeiroId, dataFormatada, horario);
    
    // Se o barbeiro está indisponível para o horário, retorna true
    if (barbeiroBloqueadoNoHorario) {
      return true;
    }
    
    // Verifica se o horário já passou
    const horarioPassado = isHorarioPassado(horario);
    if (horarioPassado) {
      return true;
    }
    
    // Verifica se o horário está ocupado por algum agendamento
    const horarioOcupado = agendamentos?.some((agendamento) => {
      if (agendamento.barber_id !== barbeiroId || agendamento.date !== dataFormatada) {
        return false;
      }

      // Converte os horários para minutos para facilitar a comparação
      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
      const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
      
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosVerificar = horaVerificar * 60 + minutoVerificar;
      
      // Verifica se o horário que estamos verificando está dentro do período do agendamento
      return (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status)
      );
    });

    return horarioOcupado || false;
  };

  // Função para obter o motivo da indisponibilidade
  const getMotivoIndisponibilidade = (barbeiroId: string, horario: string) => {
    // Primeiro verificamos se o horário já passou
    if (isHorarioPassado(horario)) {
      const agendamento = agendamentos?.find((agendamento) => {
        if (agendamento.barber_id !== barbeiroId || agendamento.date !== dataFormatada) {
          return false;
        }

        const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
        const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
        
        const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
        const minutosVerificar = horaVerificar * 60 + minutoVerificar;
        
        return (
          minutosVerificar >= minutosAgendamento &&
          minutosVerificar < minutosAgendamento + agendamento.total_duration &&
          ["pendente", "atendido", "confirmado"].includes(agendamento.status)
        );
      });

      if (agendamento) {
        const servicos = agendamento.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado';
        return `Atendimento ${agendamento.client_name} (${servicos})`;
      }
      return "Horário expirado";
    }

    const barbeiroBloqueadoNoHorario = !verificarDisponibilidadeBarbeiro(barbeiroId, dataFormatada, horario);
    if (barbeiroBloqueadoNoHorario) {
      return "Barbeiro indisponível no horário";
    }

    const agendamento = agendamentos?.find((agendamento) => {
      if (agendamento.barber_id !== barbeiroId || agendamento.date !== dataFormatada) {
        return false;
      }

      const [horaAgendamento, minutoAgendamento] = agendamento.time.split(':').map(Number);
      const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
      
      const minutosAgendamento = horaAgendamento * 60 + minutoAgendamento;
      const minutosVerificar = horaVerificar * 60 + minutoVerificar;
      
      return (
        minutosVerificar >= minutosAgendamento &&
        minutosVerificar < minutosAgendamento + agendamento.total_duration &&
        ["pendente", "atendido", "confirmado"].includes(agendamento.status)
      );
    });

    if (agendamento) {
      const servicos = agendamento.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado';
      return `Agendado para ${agendamento.client_name} (${servicos})`;
    }

    return "Horário indisponível";
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
                  const motivoIndisponibilidade = getMotivoIndisponibilidade(barbeiro.id, horario);

                  return (
                    <TooltipProvider key={`${barbeiro.id}-${horario}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`py-2 px-1 rounded-md text-center font-medium transition-colors ${
                              hora_agenda_indisponivel
                                ? "bg-red-100 text-red-700 cursor-not-allowed opacity-75"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            }`}
                            onClick={() => !hora_agenda_indisponivel && handleHorarioClick(barbeiro.id, horario)}
                          >
                            {horario}
                          </div>
                        </TooltipTrigger>
                        {hora_agenda_indisponivel && (
                          <TooltipContent>
                            <p>{motivoIndisponibilidade}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
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
