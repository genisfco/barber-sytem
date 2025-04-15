import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Clock, Scissors, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import { useServicos } from "@/hooks/useServicos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";

const Index = () => {
  const today = new Date();
  const { agendamentos, updateAgendamento, updateAgendamentosRelacionados } = useAgendamentos(today);
  const { totais } = useTransacoes();
  const { barbeiros } = useBarbeiros();
  const { servicos } = useServicos();
  const [openEditForm, setOpenEditForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<any>();
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 60000);

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
    console.log('🎯 Iniciando confirmação do agendamento:', id);
    
    // Encontra o agendamento para obter suas informações
    const agendamento = agendamentos?.find(a => a.id === id);
    if (!agendamento) {
      console.log('❌ Agendamento não encontrado');
      return;
    }

    console.log('📋 Dados do agendamento:', agendamento);

    try {
      // Atualiza todos os agendamentos relacionados
      await updateAgendamentosRelacionados.mutateAsync({
        client_id: agendamento.client_id,
        barber_id: agendamento.barber_id,
        date: agendamento.date,
        status: "confirmado" 
      });

      console.log('✅ Atualização concluída com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar agendamentos:', error);
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

  const handleAtendido = async (agendamento: any) => {
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
            status: "atendido"
          });
        }
      }
    } else {
      await updateAgendamento.mutateAsync({
        id: agendamento.id,
        status: "atendido"
      });
    }
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
    
    // Para debug
    console.log(`Barbeiro ${barbeiroId} - hora atual agenda: ${horarioAtualAgenda}, agendamentos:`, 
                agendamentosBarbeiro.map(a => `${a.time.substring(0, 5)} (${a.status})`));
    
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

  const getDiaSemana = (date: Date) => {
    const dia = format(date, "EEEE", { locale: ptBR }).toUpperCase();
    return dia.includes("SEGUNDA") ? "SEG" :
           dia.includes("TERÇA") ? "TER" :
           dia.includes("QUARTA") ? "QUA" :
           dia.includes("QUINTA") ? "QUI" :
           dia.includes("SEXTA") ? "SEX" :
           dia.includes("SÁBADO") ? "SAB" :
           "DOM";
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
      value: format(dataHoraAtual, "HH:mm"),
      icon: Clock,
      color: "text-primary",
      subtitle: `${getDiaSemana(dataHoraAtual)}, ${format(dataHoraAtual, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <h1 className="text-3xl font-display mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title || stat.value} className="p-6 bg-secondary border-none">
            <div className="flex items-center justify-between">
              <div>
                {stat.title && <p className="text-sm text-muted-foreground">{stat.title}</p>}
                <h3 className={cn(
                  "text-2xl font-semibold mt-1",
                  !stat.title && "text-right"
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
        <Card className="p-6 bg-secondary border-none">
          <h2 className="font-display text-xl mb-4">Lista de Agendamentos</h2>
          <div className="space-y-4">
            {!proximosAgendamentos?.length ? (
              <div className="text-muted-foreground">
                Nenhum agendamento para hoje.
              </div>
            ) : (
              proximosAgendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg">
                      {agendamento.client_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">{agendamento.client_name}</p>
                      <div className="flex flex-col text-sm text-muted-foreground">
                        <span>Serviços: {agendamento.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado'}</span>
                        <span>Barbeiro: {agendamento.barber || "Não definido"}</span>
                        <span className={cn("font-medium", getStatusColor(agendamento.status))}>
                          Status: {getStatusText(agendamento.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-lg font-medium">{formatTime(agendamento.time)}</p>
                      <p className="text-sm text-muted-foreground">Hoje</p>
                    </div>
                    <div className="flex gap-1">
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
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 bg-secondary border-none">
          <h2 className="font-display text-xl mb-4">Status de Atendimentos</h2>
          <div className="flex justify-between mb-2 px-4">
            <div className="flex-1"></div>
            <div className="flex gap-6">
              <div className="text-sm text-muted-foreground">Horário atual</div>
              <div className="text-sm text-muted-foreground">Próximo horário</div>
            </div>
          </div>
          <div className="space-y-4">
            {barbeiros?.map((barbeiro) => {
              const status = getBarbeiroStatus(barbeiro.id);
              return (
                <div key={barbeiro.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{barbeiro.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    {/* Status atual */}
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-medium">{status.horarioAtual}</p>
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium", status.statusAtual.cor)}>
                          {status.statusAtual.texto}
                        </p>
                        <div className={cn("h-3 w-3 rounded-full", status.statusAtual.bgCor)} />
                      </div>
                    </div>
                    
                    {/* Próximo status */}
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-medium">{status.proximoHorario}</p>
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium", status.proximoStatus.cor)}>
                          {status.proximoStatus.texto}
                        </p>
                        <div className={cn("h-3 w-3 rounded-full", status.proximoStatus.bgCor)} />
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
      />
    </div>
  );
};

export default Index;
