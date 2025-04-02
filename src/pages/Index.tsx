import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Clock, Scissors, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";

const Index = () => {
  const today = new Date();
  const { agendamentos, updateAgendamento, marcarComoAtendido } = useAgendamentos(today);
  const { totais } = useTransacoes();
  const { barbeiros } = useBarbeiros();
  const [openEditForm, setOpenEditForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<any>();
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const agendamentosHoje = agendamentos?.filter(
    (agendamento) => agendamento.date === format(today, "yyyy-MM-dd")
  );

  const proximosAgendamentos = agendamentosHoje
    ?.filter(agendamento => {
      const [hours, minutes] = agendamento.time.split(':');
      const agendamentoTime = new Date();
      agendamentoTime.setHours(parseInt(hours), parseInt(minutes), 0);
      return agendamentoTime > today && !["indisponivel", "liberado"].includes(agendamento.status);
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
    await updateAgendamento.mutateAsync({
      id,
      status: "confirmado"
    });
  };

  const handleCancelar = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "cancelado"
    });
  };

  const handleAtendido = async (agendamento: any) => {
    await marcarComoAtendido.mutateAsync(agendamento);
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
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const horaAtualFormatada = `${horaAtual.toString().padStart(2, '0')}:${minutoAtual.toString().padStart(2, '0')}`;

    const proximoHorario = new Date(agora);
    proximoHorario.setMinutes(proximoHorario.getMinutes() + 30);
    const proximaHora = proximoHorario.getHours();
    const proximoMinuto = proximoHorario.getMinutes();
    const proximaHoraFormatada = `${proximaHora.toString().padStart(2, '0')}:${proximoMinuto.toString().padStart(2, '0')}`;

    const agendamentosBarbeiro = agendamentosHoje?.filter(
      a => a.barber_id === barbeiroId && 
      (a.status === 'confirmado' || a.status === 'atendido')
    );

    const emAtendimento = agendamentosBarbeiro?.some(
      a => a.time === horaAtualFormatada && a.status === 'atendido'
    );

    const proximoCliente = agendamentosBarbeiro?.some(
      a => a.time === proximaHoraFormatada && a.status === 'confirmado'
    );

    if (emAtendimento) {
      return { status: 'Em atendimento', cor: 'text-yellow-600' };
    } else if (proximoCliente) {
      return { status: 'Aguardando cliente', cor: 'text-blue-600' };
    } else {
      return { status: 'Disponível', cor: 'text-green-600' };
    }
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
      value: agendamentosHoje?.length.toString() || "0",
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Clientes Atendidos",
      value: agendamentosHoje?.filter(a => a.status === "atendido")?.length.toString() || "0",
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
          <h2 className="font-display text-xl mb-4">Próximos Agendamentos</h2>
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
                        <span>Serviço: {agendamento.service}</span>
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
          <h2 className="font-display text-xl mb-4">Status dos Barbeiros</h2>
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
                      <p className={cn("text-sm font-medium", status.cor)}>
                        {status.status}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    status.cor === 'text-yellow-600' ? "bg-yellow-500" : 
                    status.cor === 'text-blue-600' ? "bg-blue-500" : 
                    "bg-green-500"
                  )} />
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
