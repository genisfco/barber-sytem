import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Clock, Scissors, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbers } from "@/hooks/useBarbers";
import { useServicos } from "@/hooks/useServicos";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { FinalizarAtendimentoForm } from "@/components/forms/FinalizarAtendimentoForm";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { logError } from "@/utils/logger";
import { Agendamento } from "@/types/agendamento";


const Index = () => {
  const today = new Date();
  const { agendamentos, updateAgendamento, updateAgendamentosRelacionados } = useAgendamentos(today);
  const { totais } = useTransacoes();
  const { barbers } = useBarbers();
  const { servicos } = useServicos();
  const [openEditForm, setOpenEditForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<any>();
  const [openFinalizarForm, setOpenFinalizarForm] = useState(false);
  const [agendamentoParaFinalizar, setAgendamentoParaFinalizar] = useState<any>();

  const agendamentosDoDia = agendamentos
    ?.sort((a, b) => a.time.localeCompare(b.time)) || [];

  const agendamentosFiltrados = agendamentosDoDia;

  // Função auxiliar para obter o horário atual de agendamento (00 ou 30)
  const getHorarioAtualAgenda = () => {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const intervaloAtual = minutoAtual < 30 ? '00' : '30';
    return `${horaAtual.toString().padStart(2, '0')}:${intervaloAtual}`;
  };

  const agendamentosCompletos = agendamentosFiltrados
    ?.filter(agendamento => {
      // Não mostrar agendamentos indisponíveis 
      if (["indisponivel"].includes(agendamento.status)) {
        return false;
      }
      
      // Incluir todos os agendamentos do dia (passados, atuais e futuros)
      return true;
    })
    ?.sort((a, b) => b.time.localeCompare(a.time));

  const proximosAgendamentos = agendamentosFiltrados
    ?.filter(agendamento => {
      // Incluir agendamentos do horário atual e futuros
      const horarioAtualAgenda = getHorarioAtualAgenda();
      
      // Não mostrar agendamentos indisponíveis 
      if (["indisponivel"].includes(agendamento.status)) {
        return false;
      }
      
      // Incluir se for do horário atual
      if (agendamento.time.startsWith(horarioAtualAgenda)) {
        return true;
      }
      
      // Ou se for um horário futuro
      const [hours, minutes] = agendamento.time.split(':');
      const agendamentoTime = new Date();
      agendamentoTime.setHours(parseInt(hours), parseInt(minutes), 0);
      return agendamentoTime > today;
    })
    ?.sort((a, b) => a.time.localeCompare(b.time))
    ?.slice(0, 5);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };

  const handleConfirmar = async (id: string) => {
    // Encontra o agendamento para obter suas informações
    const agendamento = agendamentos?.find(a => a.id === id);
    if (!agendamento) {
      return;
    }

    try {
      // Atualiza todos os agendamentos relacionados
      await updateAgendamentosRelacionados.mutateAsync({
        client_id: agendamento.client_id,
        barber_id: agendamento.barber_id,
        date: agendamento.date,
        status: "confirmado" 
      });
    } catch (error) {
      logError(error, '❌ Erro ao atualizar agendamentos:');
    }
  };

  const handleCancelar = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "cancelado"
    });
  };

  const handleAtendido = (agendamento: Agendamento) => {
    if (agendamento.status !== "confirmado" && agendamento.status !== "atendido") {
      toast.error("Por favor, confirme o agendamento antes de finalizar o atendimento.");
      return;
    }
    setAgendamentoParaFinalizar(agendamento);
    setOpenFinalizarForm(true);
  };

  const handleEditar = (agendamento: any) => {
    setAgendamentoParaEditar(agendamento);
    setOpenEditForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-600';
      case 'confirmado':
        return 'text-green-600';
      case 'cancelado':
        return 'text-red-600';
      case 'atendido':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'confirmado':
        return 'Confirmado';
      case 'cancelado':
        return 'Cancelado';
      case 'atendido':
        return 'Atendido';
      default:
        return status;
    }
  };

  const getBarbeiroStatus = (barbeiroId: string) => {
    const agora = new Date();
    
    // Determinar o intervalo atual de 30 minutos
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    
    // Determinar o horário de agendamento atual (arredondando para 00 ou 30 mais próximo)
    // Se minutos < 30, estamos no intervalo XX:00, senão estamos no intervalo XX:30
    const intervaloAtual = minutoAtual < 30 ? '00' : '30';
    const horarioAtualAgenda = `${horaAtual.toString().padStart(2, '0')}:${intervaloAtual}`;
    
    // Calcular próximo horário de agenda
    const proximaHora = minutoAtual < 30 ? horaAtual : (horaAtual + 1) % 24;
    const proximoIntervalo = minutoAtual < 30 ? '30' : '00';
    const proximoHorarioAgenda = `${proximaHora.toString().padStart(2, '0')}:${proximoIntervalo}`;
    
    // Filtrar todos os agendamentos do barbeiro para hoje
    const agendamentosBarbeiro = agendamentosDoDia?.filter(
      a => a.barber_id === barbeiroId
    ) || [];
    
    // Encontrar o agendamento atual
    const agendamentoAtual = agendamentosBarbeiro.find(
      a => a.time.startsWith(horarioAtualAgenda)
    );
    
    // Encontrar próximo agendamento
    let agendamentoProximo = agendamentosBarbeiro.find(
      a => a.time.startsWith(proximoHorarioAgenda)
    );
    
    // Se não encontrar, procure outros horários futuros
    if (!agendamentoProximo) {
      const horariosAgendados = agendamentosBarbeiro
        .filter(a => {
          // Extrair apenas hora e minuto para comparação
          const horarioAgendamento = a.time.substring(0, 5);
          
          // Verificar se é um horário futuro
          if (minutoAtual < 30) {
            // Se estamos no intervalo XX:00-XX:29
            return (horarioAgendamento > horarioAtualAgenda);
          } else {
            // Se estamos no intervalo XX:30-XX:59
            return (horarioAgendamento > horarioAtualAgenda);
          }
        })
        .sort((a, b) => a.time.localeCompare(b.time));
      
      if (horariosAgendados.length > 0) {
        agendamentoProximo = horariosAgendados[0];
      }
    }
    
    // Determinar status atual
    const statusAtual = !agendamentoAtual 
      ? { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' }
      : agendamentoAtual.status === 'pendente'
        ? { texto: 'Aguardando confirmação', cor: 'text-orange-600', bgCor: 'bg-orange-500' }
        : agendamentoAtual.status === 'confirmado'
          ? { texto: 'Em atendimento', cor: 'text-yellow-600', bgCor: 'bg-yellow-500' }
          : agendamentoAtual.status === 'atendido'
            ? { texto: 'Cliente atendido', cor: 'text-purple-600', bgCor: 'bg-purple-500' }
            : { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' }; // cancelado ou outros status
    
    // Determinar próximo status
    const proximoStatus = !agendamentoProximo
      ? { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' }
      : agendamentoProximo.status === 'pendente'
        ? { texto: 'Aguardando confirmação', cor: 'text-orange-600', bgCor: 'bg-orange-500' }
        : agendamentoProximo.status === 'confirmado'
          ? { texto: 'Aguardando cliente', cor: 'text-blue-600', bgCor: 'bg-blue-500' }
          : { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' }; // cancelado ou outros status
    
    return {
      horarioAtual: horarioAtualAgenda,
      statusAtual,
      proximoHorario: agendamentoProximo ? agendamentoProximo.time.substring(0, 5) : proximoHorarioAgenda,
      proximoStatus
    };
  };



  // Função para ordenar agendamentos conforme a nova sequência
  const ordenarAgendamentos = (agendamentos: any[]) => {
    if (!agendamentos?.length) return [];
    const horarioAtualAgenda = getHorarioAtualAgenda();
    const agora = new Date();

    // Separar em listas
    const atuais: any[] = [];
    const proximos: any[] = [];
    const passadosPendentes: any[] = [];
    const passadosAtendidos: any[] = [];

    agendamentos.forEach(a => {
      const [hours, minutes] = a.time.split(':').map(Number);
      const agendamentoTime = new Date();
      agendamentoTime.setHours(hours, minutes, 0, 0);
      const isAtual = a.time.startsWith(horarioAtualAgenda);
      const isPassado = agendamentoTime < agora && !isAtual;
      if (isAtual) {
        atuais.push(a);
      } else if (!isPassado) {
        proximos.push(a);
      } else if (isPassado && a.status !== "atendido") {
        passadosPendentes.push(a);
      } else if (isPassado && a.status === "atendido") {
        passadosAtendidos.push(a);
      }
    });

    // Ordenar cada grupo
    proximos.sort((a, b) => {
      const [ha, ma] = a.time.split(':').map(Number);
      const [hb, mb] = b.time.split(':').map(Number);
      return ha !== hb ? ha - hb : ma - mb;
    });
    passadosPendentes.sort((a, b) => {
      const [ha, ma] = a.time.split(':').map(Number);
      const [hb, mb] = b.time.split(':').map(Number);
      return ha !== hb ? ha - hb : ma - mb;
    });
    passadosAtendidos.sort((a, b) => {
      const [ha, ma] = a.time.split(':').map(Number);
      const [hb, mb] = b.time.split(':').map(Number);
      return ha !== hb ? ha - hb : ma - mb;
    });

    // Concatenar na ordem correta
    return [
      ...atuais,
      ...proximos,
      ...passadosPendentes,
      ...passadosAtendidos,
    ];
  };

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: agendamentosDoDia?.filter(a => 
        ["pendente", "confirmado", "atendido", "cancelado"].includes(a.status)
      )?.length.toString() || "0",
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Clientes Atendidos",
      value: agendamentosDoDia?.filter(a => a.status === "atendido")?.length.toString() || "0",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Tempo Médio de Atendimento",
      value: (() => {
        const agendamentosAtendidos = agendamentosDoDia?.filter(a => a.status === "atendido") || [];
        if (agendamentosAtendidos.length === 0) return "0 min";
        
        const tempoTotal = agendamentosAtendidos.reduce((sum, a) => sum + (a.total_duration || 0), 0);
        const tempoMedio = Math.round(tempoTotal / agendamentosAtendidos.length);
        return `${tempoMedio} min`;
      })(),
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Faturamento Diário",
      value: formatMoney(totais.saldo),
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
            
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title || stat.value} className="p-6 bg-secondary border-none">
            <div className="flex items-center justify-between">
              <div>
                {stat.title && <p className="text-sm text-muted-foreground">{stat.title}</p>}
                <h3 className={cn(
                  "text-2xl font-semibold mt-1",
                  !stat.title && "text-right text-3xl"
                )}>{stat.value}</h3>

              </div>
              <div className={cn("p-3 rounded-full bg-primary/10", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6 bg-secondary border-none">
          <h2 className="font-display text-lg sm:text-xl mb-2 sm:mb-4">Lista de Agendamentos do Dia</h2>
          <div className="space-y-3 sm:space-y-4">
            {!agendamentosCompletos?.length ? (
              <div className="text-muted-foreground">
                Nenhum agendamento para hoje.
              </div>
            ) : (
              ordenarAgendamentos(agendamentosCompletos).map((agendamento) => {
                const horarioAtualAgenda = getHorarioAtualAgenda();
                const [hours, minutes] = agendamento.time.split(':').map(Number);
                const agendamentoTime = new Date();
                agendamentoTime.setHours(hours, minutes, 0);
                const agora = new Date();
                const isPassado = agendamentoTime < agora && !agendamento.time.startsWith(horarioAtualAgenda);
                const isAtual = agendamento.time.startsWith(horarioAtualAgenda);
                const isPassadoEAtendido = isPassado && agendamento.status === "atendido";
                const isPassadoEPendente = isPassado && agendamento.status !== "atendido";
                
                return (
                  <div
                    key={agendamento.id}
                    className={cn(
                      // Responsividade: flex-col em mobile, flex-row em telas maiores
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 rounded-lg transition-all gap-2 sm:gap-0 w-full overflow-x-auto",
                      isPassadoEAtendido 
                        ? "bg-background/20 opacity-75" 
                        : isAtual 
                          ? "bg-background/90 border-2 border-white" 
                          : isPassadoEPendente
                            ? "bg-background/70 opacity-65"
                            : "bg-background/90"
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                      <div className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-base sm:text-lg shrink-0",
                        isPassadoEAtendido 
                          ? "bg-gray-700 text-gray-600" 
                          : isAtual 
                            ? "bg-primary" 
                            : isPassadoEPendente
                              ? "bg-orange-400 text-white"
                              : "bg-secondary"
                      )}>
                        {agendamento.client_name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-base sm:text-lg truncate",
                          isPassadoEAtendido && "text-muted-foreground"
                        )}>
                          {agendamento.client_name}
                        </p>
                        <div className="flex flex-col text-xs sm:text-sm text-muted-foreground">
                          <span className="truncate">Serviços: {agendamento.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado'}</span>
                          <span className="truncate">Barbeiro: {agendamento.barber_name || "Não definido"}</span>
                          <span className={cn("font-medium", getStatusColor(agendamento.status))}>
                            Cliente: {getStatusText(agendamento.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 sm:gap-2 w-full sm:w-auto">
                      <div className="text-right">
                        <p className={cn(
                          "text-base sm:text-lg font-medium",
                          isPassadoEAtendido && "text-muted-foreground"
                        )}>
                          {formatTime(agendamento.time)}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {isPassadoEAtendido ? "Concluído" : isAtual ? "Em Atendimento" : isPassadoEPendente ? "Pendente de Atualização  " : "Próximo Atendimento"}
                        </p>
                      </div>
                      {agendamento.status !== "atendido" && (
                        <div className="flex gap-1 flex-wrap sm:flex-nowrap w-full sm:w-auto">
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
                            onClick={() => handleAtendido(agendamento)}
                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                            title="Finalizar atendimento"
                          >
                            <Scissors className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {agendamento.status === "atendido" && (
                        <div className="flex gap-1 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAtendido(agendamento)}
                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                            title="Editar atendimento"
                          >
                            <Scissors className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-secondary border-none">
          <h2 className="font-display text-lg sm:text-xl mb-2 sm:mb-4">Status de Atendimentos</h2>
          {/* Cabeçalho alinhado em grid com largura fixa para o ícone */}
          {/* <div className="grid grid-cols-[56px_1fr_1fr] gap-4 sm:gap-6 mb-1 sm:mb-2 px-2 sm:px-4">
            <div></div>
            <div className="text-xs sm:text-sm text-muted-foreground text-right">Horário atual</div>
            <div className="text-xs sm:text-sm text-muted-foreground text-right">Próximo horário</div>
          </div> */}
          <div className="space-y-3 sm:space-y-4">
            {barbers?.filter(b => b.active).map((barbeiro) => {
              const status = getBarbeiroStatus(barbeiro.id);
              return (
                <div
                  key={barbeiro.id}
                  className="grid grid-cols-[56px_1fr_1fr_1fr] gap-4 sm:gap-6 items-center p-2 sm:p-4 bg-background/50 rounded-lg w-full overflow-x-auto"
                >
                  {/* Coluna 1: Ícone */}
                  <div className="flex items-center justify-center">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  {/* Coluna 2: Nome */}
                  <div>
                    <p className="font-medium text-base sm:text-lg">{barbeiro.name}</p>
                  </div>
                  {/* Coluna 3: Tempo médio de atendimento */}
                  <div className="flex flex-col items-end">
                    <p className="text-xs sm:text-sm text-muted-foreground">Tempo Médio</p>
                    <p className="text-xs sm:text-sm font-medium">
                      {(() => {
                        const agendamentosBarbeiro = agendamentosDoDia?.filter(a => 
                          a.barber_id === barbeiro.id && a.status === "atendido"
                        ) || [];
                        if (agendamentosBarbeiro.length === 0) return "0 min";
                        
                        const tempoTotal = agendamentosBarbeiro.reduce((sum, a) => sum + (a.total_duration || 0), 0);
                        const tempoMedio = Math.round(tempoTotal / agendamentosBarbeiro.length);
                        return `${tempoMedio} min`;
                      })()}
                    </p>
                  </div>
                  {/* Coluna 4: Status atual e próximo status */}
                  <div className="flex gap-4 sm:gap-6 w-full sm:w-auto">
                    {/* Status atual */}
                    <div className="flex flex-col items-end">
                      <p className="text-xs sm:text-sm font-medium">{status.horarioAtual}</p>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <p className={cn("text-xs sm:text-sm font-medium", status.statusAtual.cor)}>
                          {status.statusAtual.texto}
                        </p>
                        {/* <div className={cn("h-2 w-2 sm:h-3 sm:w-3 rounded-full", status.statusAtual.bgCor)} /> */}
                      </div>
                    </div>
                    {/* Próximo status */}
                    <div className="flex flex-col items-end">
                      <p className="text-xs sm:text-sm font-medium">{status.proximoHorario}</p>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <p className={cn("text-right text-xs sm:text-sm font-medium", status.proximoStatus.cor)}>
                          {status.proximoStatus.texto}
                        </p>
                        {/* <div className={cn("h-2 w-2 sm:h-3 sm:w-3 rounded-full", status.proximoStatus.bgCor)} /> */}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
        </Card>
      </div>

      <AgendamentoForm 
        open={openEditForm} 
        onOpenChange={setOpenEditForm}
        agendamentoParaEditar={agendamentoParaEditar}
        dataInicial={agendamentoParaEditar ? new Date(agendamentoParaEditar.date) : undefined}
      />

      {agendamentoParaFinalizar && (
        <FinalizarAtendimentoForm
          open={openFinalizarForm}
          onOpenChange={setOpenFinalizarForm}
          agendamento={agendamentoParaFinalizar}
        />
      )}

      <ToastContainer />
    </div>
  );
};

export default Index;
