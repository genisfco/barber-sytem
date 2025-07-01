import { ChartContainer } from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbers } from "@/hooks/useBarbers";
import { useClientes } from "@/hooks/useClientes";
import { useEffect, useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDate, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_COLORS = {
  atendido: "#7c3aed",
  confirmado: "#22c55e",
  pendente: "#eab308",
  cancelado: "#ef4444",
  indisponivel: "#64748b",
  liberado: "#0ea5e9"
};

const ALL_STATUS = [
  'atendido',
  'confirmado',
  'pendente',
  'cancelado',
  'indisponivel',
  'liberado'
];

function filtrarPorPeriodo(agendamentos, inicio, fim) {
  return agendamentos?.filter(a => {
    const data = new Date(a.date);
    return data >= inicio && data <= fim;
  }) || [];
}

function agruparPorStatus(agendamentos) {
  const total = agendamentos.length;
  const statusCount = agendamentos.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  return ALL_STATUS.map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: statusCount[status] || 0,
    percent: total ? ((Number(statusCount[status] || 0) / Number(total)) * 100).toFixed(1) : 0,
    status
  }));
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const Desempenho = () => {
  const today = new Date();
  const { agendamentos = [] } = useAgendamentos();
  const { transacoes = [] } = useTransacoes();
  const { barbers = [] } = useBarbers();
  const { clientes = [] } = useClientes();
  const [dataAtual, setDataAtual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDataAtual(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  // Períodos
  const semanaInicio = startOfWeek(today, { weekStartsOn: 1 });
  const semanaFim = endOfWeek(today, { weekStartsOn: 1 });
  const mesInicio = startOfMonth(today);
  const mesFim = endOfMonth(today);
  const diaHoje = getDate(today);
  const diasNoMes = getDaysInMonth(today);
  // Quinzena: 1-15 ou 16-fim
  const quinzenaInicio = diaHoje <= 15 ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 16);
  const quinzenaFim = diaHoje <= 15 ? new Date(today.getFullYear(), today.getMonth(), 15) : mesFim;

  // Agendamentos filtrados
  const agendamentosSemana = useMemo(() => filtrarPorPeriodo(agendamentos, semanaInicio, semanaFim), [agendamentos, semanaInicio, semanaFim]);
  const agendamentosQuinzena = useMemo(() => filtrarPorPeriodo(agendamentos, quinzenaInicio, quinzenaFim), [agendamentos, quinzenaInicio, quinzenaFim]);
  const agendamentosMes = useMemo(() => filtrarPorPeriodo(agendamentos, mesInicio, mesFim), [agendamentos, mesInicio, mesFim]);

  // Gráficos de status
  const statusSemana = useMemo(() => agruparPorStatus(agendamentosSemana), [agendamentosSemana]);
  const statusQuinzena = useMemo(() => agruparPorStatus(agendamentosQuinzena), [agendamentosQuinzena]);
  const statusMes = useMemo(() => agruparPorStatus(agendamentosMes), [agendamentosMes]);

  // Faturamento por período
  function faturamentoPorPeriodo(transacoes, inicio, fim) {
    return transacoes.filter(t => t.type === "receita" && t.payment_date >= format(inicio, "yyyy-MM-dd") && t.payment_date <= format(fim, "yyyy-MM-dd")).reduce((acc, t) => acc + Number(t.value), 0);
  }
  const faturamentoSemana = faturamentoPorPeriodo(transacoes, semanaInicio, semanaFim);
  const faturamentoQuinzena = faturamentoPorPeriodo(transacoes, quinzenaInicio, quinzenaFim);
  const faturamentoMes = faturamentoPorPeriodo(transacoes, mesInicio, mesFim);

  // Barbeiro com mais atendimentos
  function barbeiroMaisAtendimentos(agendamentos) {
    const counts = agendamentos.filter(a => a.status === "atendido").reduce((acc, a) => {
      acc[a.barber_id] = (acc[a.barber_id] || 0) + 1;
      return acc;
    }, {});
    const values = Object.values(counts).map(Number);
    const max = values.length ? Math.max(...values) : 0;
    const id = Object.keys(counts).find(key => Number(counts[key]) === max);
    const barbeiro = barbers.find(b => b.id === id);
    return barbeiro ? `${barbeiro.name} (${max})` : "-";
  }

  // Ticket médio por cliente
  function ticketMedio(agendamentos) {
    const atendidos = agendamentos.filter(a => a.status === "atendido");
    if (!atendidos.length) return 0;
    const total = atendidos.reduce((acc, a) => acc + Number(a.final_price), 0);
    const clientesUnicos = new Set(atendidos.map(a => a.client_id)).size;
    return clientesUnicos ? total / clientesUnicos : 0;
  }

  // Ticket médio por agendamento
  function ticketMedioAgendamento(agendamentos) {
    const atendidos = agendamentos.filter(a => a.status === "atendido");
    if (!atendidos.length) return 0;
    const total = atendidos.reduce((acc, a) => acc + Number(a.final_price), 0);
    return total / atendidos.length;
  }

  // Componente de gráfico de pizza
  function PizzaStatus({ data }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <div className="flex justify-center items-center min-h-[100px] text-muted-foreground">
          Sem dados para o período
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${percent}%`}>
            {data.map((entry, idx) => (
              <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status] || "#8884d8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percent}%)`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Cards de métricas
  function MetricCard({ title, value }) {
    return (
      <div className="flex flex-col items-center p-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className="text-lg font-bold">{typeof value === 'number' ? formatMoney(value) : value}</span>
      </div>
    );
  }

  // Função para formatar datas do período
  function periodoFormatado(inicio, fim) {
    return `(${format(inicio, 'dd/MM/yyyy')} - ${format(fim, 'dd/MM/yyyy')})`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* <h1 className="text-2xl font-bold mb-6">Desempenho da Barbearia</h1> */}
      <div className="space-y-8">
        {/* Semana atual */}
        <Card className="p-6 bg-secondary border-none">
          <h2 className="text-lg font-semibold mb-4">Semana Atual <span className="text-sm font-normal text-muted-foreground">{periodoFormatado(semanaInicio, semanaFim)}</span></h2>
          <div className="flex gap-8 mb-4 flex-wrap">
            <MetricCard title="Faturamento" value={formatMoney(faturamentoSemana)} />
            <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosSemana)} />
            <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosSemana))} />
            <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosSemana))} />
          </div>
          <PizzaStatus data={statusSemana} />
        </Card>
        {/* Quinzena atual */}
        <Card className="p-6 bg-secondary border-none">
          <h2 className="text-lg font-semibold mb-4">Quinzena Atual <span className="text-sm font-normal text-muted-foreground">{periodoFormatado(quinzenaInicio, quinzenaFim)}</span></h2>
          <div className="flex gap-8 mb-4 flex-wrap">
            <MetricCard title="Faturamento" value={formatMoney(faturamentoQuinzena)} />
            <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosQuinzena)} />
            <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosQuinzena))} />
            <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosQuinzena))} />
          </div>
          <PizzaStatus data={statusQuinzena} />
        </Card>
        {/* Mês atual */}
        <Card className="p-6 bg-secondary border-none">
          <h2 className="text-lg font-semibold mb-4">Mês Atual <span className="text-sm font-normal text-muted-foreground">{periodoFormatado(mesInicio, mesFim)}</span></h2>
          <div className="flex gap-8 mb-4 flex-wrap">
            <MetricCard title="Faturamento" value={formatMoney(faturamentoMes)} />
            <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosMes)} />
            <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosMes))} />
            <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosMes))} />
          </div>
          <PizzaStatus data={statusMes} />
        </Card>
      </div>
    </div>
  );
};

export default Desempenho; 