import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBarbers } from "@/hooks/useBarbers";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { horarios, converterHorariosFuncionamento } from "@/constants/horarios";
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
import { supabase } from '@/integrations/supabase/client';
import { DayOfWeek } from '@/types/barberShop';

interface AgendamentoGridProps {
  barberShopId: string;
  date: Date;
  agendamentos: any[];
  isLoading: boolean;
  onHorarioSelect: (horario: string) => void;
}

export function AgendamentoGrid({ barberShopId, date, agendamentos, isLoading, onHorarioSelect }: AgendamentoGridProps) {
  const { barbers } = useBarbers();
  const { verificarDisponibilidadeBarbeiro } = useAgendamentos();
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openIndisponivelForm, setOpenIndisponivelForm] = useState(false);
  const [selectedBarbeiroIndisponivel, setSelectedBarbeiroIndisponivel] = useState<{id: string, name: string} | null>(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<any[]>([]);

  // Formatamos a data para o padrão yyyy-MM-dd
  const dataFormatada = format(date, "yyyy-MM-dd");

  const convertToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  useEffect(() => {
    const carregarHorariosFuncionamento = async () => {
      const { data: horarios, error } = await supabase
        .from('barber_shop_hours')
        .select('*')
        .eq('barber_shop_id', barberShopId)
        .order('day_of_week');

      if (error) {
        console.error('Erro ao carregar horários:', error);
        return;
      }

      if (horarios) {
        setHorariosFuncionamento(horarios);
      }
    };

    carregarHorariosFuncionamento();
  }, [barberShopId]);

  useEffect(() => {
    if (date) {
      const diaSemana = date.getDay() as DayOfWeek;
      const horariosConvertidos = converterHorariosFuncionamento(horariosFuncionamento);
      const horariosDoDia = horariosConvertidos
        .find(h => h.dia === diaSemana && h.ativo)?.horarios || [];
      setHorariosDisponiveis(horariosDoDia);
    }
  }, [date, horariosFuncionamento]);

  const handleHorarioClick = (barbeiroId: string, horario: string) => {
    setSelectedBarber(barbeiroId);
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
    const horarioOcupado = (agendamentos ?? []).some(
      (agendamentoItem) => {
        if (
          agendamentoItem.barber_id === barbeiroId &&
          agendamentoItem.date === dataFormatada &&
          agendamentoItem.status !== 'cancelado' // Excluir agendamentos cancelados
        ) {
          const slotMinutesStart = convertToMinutes(horario);
          const slotMinutesEnd = slotMinutesStart + 30; // Considerando slots de 30 minutos

          const apptMinutesStart = convertToMinutes(agendamentoItem.time);
          const apptMinutesEnd = apptMinutesStart + (agendamentoItem.total_duration || 0);

          // Verifica sobreposição
          const hasOverlap = (
            (slotMinutesStart >= apptMinutesStart && slotMinutesStart < apptMinutesEnd) ||
            (slotMinutesEnd > apptMinutesStart && slotMinutesEnd <= apptMinutesEnd) ||
            (apptMinutesStart >= slotMinutesStart && apptMinutesStart < slotMinutesEnd) // Caso o agendamento seja maior que o slot
          );

          return hasOverlap;
        }
        return false;
      }
    );

    return horarioOcupado || false;
  };

  // Função para obter o motivo da indisponibilidade
  const getMotivoIndisponibilidade = (barbeiroId: string, horario: string) => {
    // Primeiro verificamos se o horário já passou
    if (isHorarioPassado(horario)) {
      return "Horário expirado";
    }

    const barbeiroBloqueadoNoHorario = !verificarDisponibilidadeBarbeiro(barbeiroId, dataFormatada, horario);
    if (barbeiroBloqueadoNoHorario) {
      return "Barbeiro indisponível no horário";
    }

    const agendamentoExistente = (agendamentos ?? []).find(
      (agendamentoItem) => {
        if (
          agendamentoItem.barber_id === barbeiroId &&
          agendamentoItem.date === dataFormatada &&
          agendamentoItem.status !== 'cancelado' // Excluir agendamentos cancelados
        ) {
          const slotMinutesStart = convertToMinutes(horario);
          const slotMinutesEnd = slotMinutesStart + 30; // Considerando slots de 30 minutos

          const apptMinutesStart = convertToMinutes(agendamentoItem.time);
          const apptMinutesEnd = apptMinutesStart + (agendamentoItem.total_duration || 0);

          // Verifica sobreposição
          const hasOverlap = (
            (slotMinutesStart >= apptMinutesStart && slotMinutesStart < apptMinutesEnd) ||
            (slotMinutesEnd > apptMinutesStart && slotMinutesEnd <= apptMinutesEnd) ||
            (apptMinutesStart >= slotMinutesStart && apptMinutesStart < slotMinutesEnd) // Caso o agendamento seja maior que o slot
          );

          return hasOverlap;
        }
        return false;
      }
    );

    if (agendamentoExistente) {
      return "Horário já agendado";
    }

    return "Horário disponível"; // Se chegou aqui, o horário deveria estar disponível.
  };

  if (barbers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando barbeiros...</p>
      </div>
    );
  }

  if (horariosDisponiveis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-xl font-semibold">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>
        <p className="text-red-600 font-medium text-center">
          Agendamento Indisponível.<br />
          Barbearia sem horário definido de funcionamento para o dia selecionado.
        </p>
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
        {barbers?.filter(barbeiro => barbeiro.active).map((barbeiro) => (
          <Card key={barbeiro.id} className="overflow-hidden bg-white border shadow-sm">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{barbeiro.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {horariosDisponiveis.map((horario) => {
                  const horario_barbeiro_indisponivel = isHorarioIndisponivel(barbeiro.id, horario);
                  const horario_passado = isHorarioPassado(horario);
                  const hora_agenda_indisponivel = horario_barbeiro_indisponivel || horario_passado;
                  const motivoIndisponibilidade = getMotivoIndisponibilidade(barbeiro.id, horario);

                  // Debugging logs
                  console.log(`Barbeiro: ${barbeiro.name}, Horário: ${horario}, Data: ${dataFormatada}`);
                  console.log(`isHorarioIndisponivel: ${horario_barbeiro_indisponivel}, Motivo: ${motivoIndisponibilidade}`);
                  console.log("Agendamentos para a data:", agendamentos);

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
            barbeiroInicial={selectedBarber || ""}
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
