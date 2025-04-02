import { Card } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Clock, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Index = () => {
  const today = new Date();
  const { agendamentos } = useAgendamentos(today);
  const { totais } = useTransacoes();

  const agendamentosHoje = agendamentos?.filter(
    (agendamento) => agendamento.date === format(today, "yyyy-MM-dd")
  );

  const proximosAgendamentos = agendamentosHoje
    ?.sort((a, b) => a.time.localeCompare(b.time))
    ?.slice(0, 3);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
      title: "Tempo Médio",
      value: "30min",
      icon: Clock,
      color: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <h1 className="text-3xl font-display mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 bg-secondary border-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-semibold mt-1">{stat.value}</h3>
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
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {agendamento.client_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{agendamento.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agendamento.service}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{agendamento.time}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 bg-secondary border-none">
          <h2 className="font-display text-xl mb-4">Status dos Barbeiros</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Barbeiro {i + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {i === 0 ? "Em atendimento" : i === 1 ? "Disponível" : "Em pausa"}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  i === 0 ? "bg-yellow-500" : i === 1 ? "bg-green-500" : "bg-red-500"
                )} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
