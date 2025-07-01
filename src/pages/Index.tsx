import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Clock, Scissors, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbers } from "@/hooks/useBarbers";
import { useServicos } from "@/hooks/useServicos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { FinalizarAtendimentoForm } from "@/components/forms/FinalizarAtendimentoForm";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const Index = () => {
  const today = new Date();
  const { agendamentos, updateAgendamento, updateAgendamentosRelacionados } = useAgendamentos(today);
  const { totais } = useTransacoes();
  const { barbers } = useBarbers();
  const { servicos } = useServicos();
  const [openEditForm, setOpenEditForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<any>();
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());
  const [openFinalizarForm, setOpenFinalizarForm] = useState(false);
  const [agendamentoParaFinalizar, setAgendamentoParaFinalizar] = useState<any>();

  useEffect(() => {
    const timer = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
      const [hours, minutes] = agendamento.time.split(':').map(Number);
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
    }
  };

  const handleCancelar = async (id: string) => {
    // Encontra o agendamento para obter suas informações
    const agendamento = agendamentos?.find(a => a.id === id);
    if (!agendamento) return;

    // Encontra o serviço para obter sua duração
    const servico = servicos?.find(s => s.name === agendamento.service);
    const slotsNecessarios = servico ? Math.ceil(servico.duration / 30) : 1;

    // Se precisar de mais de um slot, atualiza todos os slots relacionados
    if (slotsNecessarios > 1) {
      const [hora, minuto] = agendamento.time.split(':').map(Number);
      const horariosParaAtualizar = [agendamento.time];

      // Adiciona os próximos horários se forem necessários
      for (let i = 1; i < slotsNecessarios; i++) {
        const proximoHorario = new Date();
        proximoHorario.setHours(hora, minuto + (i * 30), 0, 0);
        const proximoHorarioFormatado = `${proximoHorario.getHours().toString().padStart(2, '0')}:${proximoHorario.getMinutes().toString().padStart(2, '0')}`;
        horariosParaAtualizar.push(proximoHorarioFormatado);
      }

      // Atualiza o status de todos os slots relacionados
      for (const horario of horariosParaAtualizar) {
        const agendamentoRelacionado = agendamentos?.find(
          a => a.date === agendamento.date &&
               a.time === horario &&
               a.client_id === agendamento.client_id &&
               a.barber_id === agendamento.barber_id
        );

        if (agendamentoRelacionado) {
          await updateAgendamento.mutateAsync({
            id: agendamentoRelacionado.id,
            status: "cancelado"
          });
        }
      }
    } else {
      await updateAgendamento.mutateAsync({
        id,
        status: "cancelado"
      });
    }
  };

  const handleAtendido = (agendamento: any) => {
    if (agendamento.status !== "confirmado") {
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
    
    // Função para calcular quando um agendamento termina baseado na duração dos serviços
    const calcularFimAgendamento = (agendamento: any) => {
      if (!agendamento.servicos || agendamento.servicos.length === 0) {
        const [hora, minuto] = agendamento.time.split(':').map(Number);
        const fim = new Date();
        fim.setHours(hora, minuto + 30 - 1, 0, 0); // subtrai 1 minuto
        return fim;
      }
      const duracaoTotal = agendamento.servicos.reduce((sum: number, servico: any) => {
        return sum + (servico.service_duration || 0);
      }, 0);
      if (duracaoTotal === 0) {
        const [hora, minuto] = agendamento.time.split(':').map(Number);
        const fim = new Date();
        fim.setHours(hora, minuto + 30 - 1, 0, 0); // subtrai 1 minuto
        return fim;
      }
      const [hora, minuto] = agendamento.time.split(':').map(Number);
      const fim = new Date();
      fim.setHours(hora, minuto + duracaoTotal - 1, 0, 0); // subtrai 1 minuto
      return fim;
    };
    
    // Encontrar o agendamento atual (que está ativo no momento)
    const agendamentoAtual = agendamentosBarbeiro.find(agendamento => {
      if (agendamento.status === 'cancelado') return false;
      const fimAgendamento = calcularFimAgendamento(agendamento);
      const inicioAgendamento = new Date();
      const [hora, minuto] = agendamento.time.split(':').map(Number);
      inicioAgendamento.setHours(hora, minuto, 0, 0);
      return agora >= inicioAgendamento && agora < fimAgendamento;
    });

    // Calcular o fim do agendamento atual (se houver)
    let fimAgendamentoAtual: Date | null = null;
    if (agendamentoAtual) {
      fimAgendamentoAtual = calcularFimAgendamento(agendamentoAtual);
    }

    // Determinar status atual
    let statusAtual;
    if (!agendamentoAtual) {
      statusAtual = { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' };
    } else {
      switch (agendamentoAtual.status) {
        case 'pendente':
          statusAtual = { texto: 'Aguardando confirmação', cor: 'text-orange-600', bgCor: 'bg-orange-500' };
          break;
        case 'confirmado':
          statusAtual = { texto: 'Em atendimento', cor: 'text-yellow-600', bgCor: 'bg-yellow-500' };
          break;
        case 'atendido':
          statusAtual = { texto: 'Cliente atendido', cor: 'text-purple-600', bgCor: 'bg-purple-500' };
          break;
        default:
          statusAtual = { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' };
      }
    }

    // Determinar próximo status
    let proximoStatus;
    let proximoHorario = proximoHorarioAgenda;
    if (fimAgendamentoAtual) {
      // Use a mesma data do fim do atendimento para o próximo slot
      const proximoSlotDate = new Date(fimAgendamentoAtual);
      proximoSlotDate.setHours(proximaHora, proximoIntervalo === '30' ? 30 : 0, 0, 0);
      
      if (proximoSlotDate < fimAgendamentoAtual) {
        proximoStatus = statusAtual;
        // Ajusta o próximo horário para o fim real do atendimento, arredondando para o próximo slot de 30 minutos
        const fim = new Date(fimAgendamentoAtual);
        fim.setMinutes(Math.ceil(fim.getMinutes() / 30) * 30);
        fim.setSeconds(0, 0);
        proximoHorario = `${fim.getHours().toString().padStart(2, '0')}:${fim.getMinutes().toString().padStart(2, '0')}`;
      } else {
        // Se o próximo slot for IGUAL ou depois do fim do atendimento, mostra "Disponível"
        proximoStatus = { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' };
      }
    } else {
      // Lógica antiga para o próximo agendamento
      // Encontrar o próximo agendamento futuro
      const agendamentosOrdenados = agendamentosBarbeiro
        .filter(a => a.status !== 'cancelado')
        .sort((a, b) => a.time.localeCompare(b.time));
      let agendamentoProximo = null;
      for (const agendamento of agendamentosOrdenados) {
        const [hora, minuto] = agendamento.time.split(':').map(Number);
        const horarioAgendamento = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        if (horarioAgendamento > horarioAtualAgenda) {
          agendamentoProximo = agendamento;
          break;
        }
      }
      if (!agendamentoProximo) {
        proximoStatus = { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' };
      } else {
        switch (agendamentoProximo.status) {
          case 'pendente':
            proximoStatus = { texto: 'Aguardando confirmação', cor: 'text-orange-600', bgCor: 'bg-orange-500' };
            break;
          case 'confirmado':
            proximoStatus = { texto: 'Aguardando cliente', cor: 'text-blue-600', bgCor: 'bg-blue-500' };
            break;
          default:
            proximoStatus = { texto: 'Disponível', cor: 'text-green-600', bgCor: 'bg-green-500' };
        }
      }
    }

    return {
      horarioAtual: horarioAtualAgenda,
      statusAtual,
      proximoHorario,
      proximoStatus
    };
  };

  const getDiaSemana = (date: Date) => {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[date.getDay()];
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
      title: "Faturamento Diário",
      value: formatMoney(totais.saldo),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      value: format(dataHoraAtual, "HH:mm:ss"),
      icon: Clock,
      color: "text-primary",
      subtitle: `${getDiaSemana(dataHoraAtual)}, ${format(dataHoraAtual, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
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
                {stat.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
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
                            title="Cliente atendido"
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
                  className="grid grid-cols-[56px_1fr_1fr] gap-4 sm:gap-6 items-center p-2 sm:p-4 bg-background/50 rounded-lg w-full overflow-x-auto"
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
                  {/* Coluna 3: Status atual e próximo status */}
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
