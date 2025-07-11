import { ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesempenhos } from "@/hooks/useDesempenhos";
import { useDesempenhoBarbeiros } from "@/hooks/useDesempenhoBarbeiros";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useBarbers } from "@/hooks/useBarbers";
import { useClientes } from "@/hooks/useClientes";
import { useEffect, useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDate, getDaysInMonth, format as formatDateFns } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, Eye, Package, Scissors } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  atendido: "#7c3aed",
  confirmado: "#22c55e",
  pendente: "#eab308",
  cancelado: "#ef4444"
};

const ALL_STATUS = [
  'atendido',
  'confirmado',
  'pendente',
  'cancelado'
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

// Componente para mostrar detalhes dos serviços e produtos
function DetalhesBarbeiro({ barbeiro, trigger }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Desempenho - {barbeiro.barber_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{barbeiro.agendamentos_atendidos}</div>
              <div className="text-sm text-muted-foreground">Atendimentos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{barbeiro.total_servicos}</div>
              <div className="text-sm text-muted-foreground">Serviços</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{barbeiro.total_produtos}</div>
              <div className="text-sm text-muted-foreground">Produtos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatMoney(barbeiro.valor_total)}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Detalhes dos Serviços */}
          {barbeiro.servicos_detalhes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Serviços Vendidos</h3>
                <Badge variant="secondary">{barbeiro.servicos_detalhes.length} tipos</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Valor Unitário</TableHead>
                    <TableHead className="text-center">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barbeiro.servicos_detalhes.map((servico, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{servico.service_name}</TableCell>
                      <TableCell className="text-center">{servico.quantidade}</TableCell>
                      <TableCell className="text-center">
                        {formatMoney(servico.valor_total / servico.quantidade)}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {formatMoney(servico.valor_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Detalhes dos Produtos */}
          {barbeiro.produtos_detalhes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Produtos Vendidos</h3>
                <Badge variant="secondary">{barbeiro.produtos_detalhes.length} tipos</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Valor Unitário</TableHead>
                    <TableHead className="text-center">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barbeiro.produtos_detalhes.map((produto, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{produto.product_name}</TableCell>
                      <TableCell className="text-center">{produto.quantidade}</TableCell>
                      <TableCell className="text-center">
                        {formatMoney(produto.valor_total / produto.quantidade)}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {formatMoney(produto.valor_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {barbeiro.servicos_detalhes.length === 0 && barbeiro.produtos_detalhes.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nenhum serviço ou produto registrado para este período.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente para a aba de Barbeiros
function AbaBarbeiros() {
  const { 
    fetchDesempenhoBarbeiros,
    getSemanaComOffset,
    getMesComOffset,
    getQuinzenaComOffset
  } = useDesempenhoBarbeiros();

  // Estados de offset para navegação
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [quinzenaOffset, setQuinzenaOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);

  // Períodos com offset
  const { inicio: semanaInicioOffset, fim: semanaFimOffset } = getSemanaComOffset(semanaOffset);
  const { inicio: mesInicioOffset, fim: mesFimOffset } = getMesComOffset(mesOffset);
  const { inicio: quinzenaInicioOffset, fim: quinzenaFimOffset } = getQuinzenaComOffset(quinzenaOffset);

  // Queries para cada período com offset
  const { data: desempenhoSemana, isLoading: isLoadingSemana } = useQuery({
    queryKey: ['desempenho-barbeiros', 'semana', semanaOffset, semanaInicioOffset, semanaFimOffset],
    queryFn: () => fetchDesempenhoBarbeiros(semanaInicioOffset, semanaFimOffset),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const { data: desempenhoQuinzena, isLoading: isLoadingQuinzena } = useQuery({
    queryKey: ['desempenho-barbeiros', 'quinzena', quinzenaOffset, quinzenaInicioOffset, quinzenaFimOffset],
    queryFn: () => fetchDesempenhoBarbeiros(quinzenaInicioOffset, quinzenaFimOffset),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const { data: desempenhoMes, isLoading: isLoadingMes } = useQuery({
    queryKey: ['desempenho-barbeiros', 'mes', mesOffset, mesInicioOffset, mesFimOffset],
    queryFn: () => fetchDesempenhoBarbeiros(mesInicioOffset, mesFimOffset),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const isLoading = isLoadingSemana || isLoadingQuinzena || isLoadingMes;

  // Função para formatar datas do período
  function periodoFormatado(inicio, fim) {
    return `(${format(inicio, 'dd/MM/yyyy')} - ${format(fim, 'dd/MM/yyyy')})`;
  }

  // Função para obter o nome do mês
  function nomeMes(data) {
    return formatDateFns(data, "MMMM yyyy", { locale: ptBR });
  }

  // Funções para navegação
  const podeAvancarSemana = semanaOffset < 0;
  const podeAvancarQuinzena = quinzenaOffset < 0;
  const podeAvancarMes = mesOffset < 0;

  // Componente de tabela de desempenho
  function TabelaDesempenho({ data, titulo }) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex justify-center items-center min-h-[200px] text-muted-foreground">
          Nenhum dado disponível para o período
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap justify-center items-center text-center">
          <div className="flex flex-col items-center p-2">
            <span className="text-xs text-muted-foreground">Total de Atendimentos</span>
            <span className="text-lg font-bold">
              {data.reduce((sum, b) => sum + b.agendamentos_atendidos, 0)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2">
            <span className="text-xs text-muted-foreground">Total de Serviços</span>
            <span className="text-lg font-bold">
              {data.reduce((sum, b) => sum + b.total_servicos, 0)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2">
            <span className="text-xs text-muted-foreground">Total de Produtos</span>
            <span className="text-lg font-bold">
              {data.reduce((sum, b) => sum + b.total_produtos, 0)}
            </span>
          </div>
          <div className="flex flex-col items-center p-2">
            <span className="text-xs text-muted-foreground">Faturamento Total</span>
            <span className="text-lg font-bold">
              {formatMoney(data.reduce((sum, b) => sum + b.valor_total, 0))}
            </span>
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barbeiro</TableHead>
              <TableHead className="text-center">Atendimentos</TableHead>
              <TableHead className="text-center">Serviços</TableHead>
              <TableHead className="text-center">Produtos</TableHead>
              <TableHead className="text-center">Valor Serviços</TableHead>
              <TableHead className="text-center">Valor Produtos</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((barbeiro) => (
              <TableRow key={barbeiro.barber_id}>
                <TableCell className="font-medium">{barbeiro.barber_name}</TableCell>
                <TableCell className="text-center">{barbeiro.agendamentos_atendidos}</TableCell>
                <TableCell className="text-center">{barbeiro.total_servicos}</TableCell>
                <TableCell className="text-center">{barbeiro.total_produtos}</TableCell>
                <TableCell className="text-center">{formatMoney(barbeiro.valor_servicos)}</TableCell>
                <TableCell className="text-center">{formatMoney(barbeiro.valor_produtos)}</TableCell>
                <TableCell className="text-center font-bold">{formatMoney(barbeiro.valor_total)}</TableCell>
                <TableCell className="text-center">
                  <DetalhesBarbeiro 
                    barbeiro={barbeiro}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Semana */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setSemanaOffset((o) => o - 1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            Semana
            <span className="text-sm font-normal text-foreground ml-2">{periodoFormatado(semanaInicioOffset, semanaFimOffset)}</span>
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setSemanaOffset((o) => o + 1)}
            aria-label="Semana seguinte"
            disabled={!podeAvancarSemana}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <TabelaDesempenho data={desempenhoSemana || []} titulo="Semana" />
      </Card>

      {/* Quinzena */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setQuinzenaOffset((o) => o - 1)}
            aria-label="Quinzena anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            Quinzena
            <span className="text-sm font-normal text-foreground ml-2">{periodoFormatado(quinzenaInicioOffset, quinzenaFimOffset)}</span>
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setQuinzenaOffset((o) => o + 1)}
            aria-label="Quinzena seguinte"
            disabled={!podeAvancarQuinzena}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <TabelaDesempenho data={desempenhoQuinzena || []} titulo="Quinzena" />
      </Card>

      {/* Mês */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setMesOffset((o) => o - 1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            {nomeMes(mesInicioOffset)}
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setMesOffset((o) => o + 1)}
            aria-label="Mês seguinte"
            disabled={!podeAvancarMes}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <TabelaDesempenho data={desempenhoMes || []} titulo="Mês" />
      </Card>
    </div>
  );
}

// Componente para a aba da Loja (mantém o conteúdo original)
function AbaLoja() {
  const today = new Date();
  const { agendamentos = [], isLoading, filtrarPorPeriodo, agruparPorStatus, barbeiroMaisAtendimentos, ticketMedio, ticketMedioAgendamento } = useDesempenhos();
  const { transacoes = [] } = useTransacoes();
  const { barbers = [] } = useBarbers();
  const { clientes = [] } = useClientes();
  const [dataAtual, setDataAtual] = useState(new Date());

  // Estados de offset para navegação
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [quinzenaOffset, setQuinzenaOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setDataAtual(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  // Funções para calcular períodos com offset
  function getSemanaComOffset(offset) {
    const base = new Date(today);
    base.setDate(base.getDate() + offset * 7);
    const inicio = startOfWeek(base, { weekStartsOn: 1 });
    const fim = endOfWeek(base, { weekStartsOn: 1 });
    return { inicio, fim };
  }
  function getMesComOffset(offset) {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const inicio = startOfMonth(base);
    const fim = endOfMonth(base);
    return { inicio, fim };
  }
  function getQuinzenaComOffset(offset) {
    // Quinzena: 1-15 ou 16-fim
    // offset 0 = quinzena atual, -1 = anterior, +1 = próxima (não pode passar de 0)
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let quinzenaBase = 0;
    if (base.getDate() > 15) quinzenaBase = 1;
    let totalOffset = quinzenaBase + offset;
    let ano = base.getFullYear();
    let mes = base.getMonth();
    while (totalOffset < 0) {
      mes--;
      if (mes < 0) {
        mes = 11;
        ano--;
      }
      totalOffset += 2;
    }
    while (totalOffset > 1) {
      mes++;
      if (mes > 11) {
        mes = 0;
        ano++;
      }
      totalOffset -= 2;
    }
    const diasNoMes = getDaysInMonth(new Date(ano, mes));
    if (totalOffset === 0) {
      return {
        inicio: new Date(ano, mes, 1),
        fim: new Date(ano, mes, 15),
      };
    } else {
      return {
        inicio: new Date(ano, mes, 16),
        fim: new Date(ano, mes, diasNoMes),
      };
    }
  }

  // Períodos com offset
  const { inicio: semanaInicio, fim: semanaFim } = getSemanaComOffset(semanaOffset);
  const { inicio: mesInicio, fim: mesFim } = getMesComOffset(mesOffset);
  const { inicio: quinzenaInicio, fim: quinzenaFim } = getQuinzenaComOffset(quinzenaOffset);

  // Agendamentos filtrados
  const agendamentosSemana = useMemo(() => filtrarPorPeriodo(agendamentos, semanaInicio, semanaFim), [agendamentos, semanaInicio, semanaFim]);
  const agendamentosQuinzena = useMemo(() => filtrarPorPeriodo(agendamentos, quinzenaInicio, quinzenaFim), [agendamentos, quinzenaInicio, quinzenaFim]);
  const agendamentosMes = useMemo(() => filtrarPorPeriodo(agendamentos, mesInicio, mesFim), [agendamentos, mesInicio, mesFim]);

  // Gráficos de status
  const statusSemana = useMemo(() => agruparPorStatus(agendamentosSemana), [agendamentosSemana]);
  const statusQuinzena = useMemo(() => agruparPorStatus(agendamentosQuinzena), [agendamentosQuinzena]);
  const statusMes = useMemo(() => agruparPorStatus(agendamentosMes), [agendamentosMes]);

  // Faturamento por período (usando agendamentos atendidos)
  function faturamentoBruto(agendamentos) {
    return agendamentos.filter(a => a.status === "atendido").reduce((acc, a) => acc + Number(a.final_price), 0);
  }
  const faturamentoSemana = faturamentoBruto(agendamentosSemana);
  const faturamentoQuinzena = faturamentoBruto(agendamentosQuinzena);
  const faturamentoMes = faturamentoBruto(agendamentosMes);

  // Componente de gráfico de barras horizontais
  function BarrasStatus({ data }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <div className="flex justify-center items-center min-h-[100px] text-muted-foreground">
          Sem dados para o período
        </div>
      );
    }
    // Tooltip customizado
    function CustomTooltip({ active, payload }) {
      if (active && payload && payload.length) {
        return (
          <div style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 13, color: '#222', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {payload[0].payload.percent}%
          </div>
        );
      }
      return null;
    }
    return (
      <div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            {/* <CartesianGrid strokeDasharray="3 3" /> */}
            <XAxis type="number" allowDecimals={false} />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={100}
              tick={{ fill: '#e5e7eb', fontWeight: 200, fontSize: 12 }}
            />
            <RechartsTooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="value" isAnimationActive fill="#7c3aed"
              label={({ x, y, width, height, value, index }) => {
                const entry = data[index];
                const color = STATUS_COLORS[entry.status] || '#8884d8';
                return (
                  <text
                    x={x + width + 8}
                    y={y + height / 2}
                    fill={color}
                    fontWeight={600}
                    alignmentBaseline="middle"
                  >
                    {value}
                  </text>
                );
              }}
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status] || "#8884d8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
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

  // Função para obter o nome do mês
  function nomeMes(data) {
    return formatDateFns(data, "MMMM yyyy", { locale: ptBR });
  }

  // Funções para navegação
  const podeAvancarSemana = semanaOffset < 0;
  const podeAvancarQuinzena = quinzenaOffset < 0;
  const podeAvancarMes = mesOffset < 0;

  return (
    <div className="space-y-8">
      {/* Semana */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setSemanaOffset((o) => o - 1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            Semana
            <span className="text-sm font-normal text-foreground ml-2">{periodoFormatado(semanaInicio, semanaFim)}</span>
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setSemanaOffset((o) => o + 1)}
            aria-label="Semana seguinte"
            disabled={!podeAvancarSemana}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-8 mb-4 flex-wrap justify-center items-center text-center">
          <MetricCard title="Faturamento Bruto" value={formatMoney(faturamentoSemana)} />
          <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosSemana, barbers)} />
          <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosSemana))} />
          <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosSemana))} />
        </div>
        <BarrasStatus data={statusSemana} />
      </Card>
      {/* Quinzena */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setQuinzenaOffset((o) => o - 1)}
            aria-label="Quinzena anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            Quinzena
            <span className="text-sm font-normal text-foreground ml-2">{periodoFormatado(quinzenaInicio, quinzenaFim)}</span>
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setQuinzenaOffset((o) => o + 1)}
            aria-label="Quinzena seguinte"
            disabled={!podeAvancarQuinzena}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-8 mb-4 flex-wrap justify-center items-center text-center">
          <MetricCard title="Faturamento Bruto" value={formatMoney(faturamentoQuinzena)} />
          <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosQuinzena, barbers)} />
          <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosQuinzena))} />
          <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosQuinzena))} />
        </div>
        <BarrasStatus data={statusQuinzena} />
      </Card>
      {/* Mês */}
      <Card className="p-6 bg-secondary border-none">
        <div className="flex items-center justify-between mb-4">
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setMesOffset((o) => o - 1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            {nomeMes(mesInicio)}
            {/* <span className="text-sm font-normal text-muted-foreground ml-2">{periodoFormatado(mesInicio, mesFim)}</span> */}
          </h2>
          <button
            className="p-1 hover:bg-accent rounded disabled:opacity-50"
            onClick={() => setMesOffset((o) => o + 1)}
            aria-label="Mês seguinte"
            disabled={!podeAvancarMes}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-8 mb-4 flex-wrap justify-center items-center text-center">
          <MetricCard title="Faturamento Bruto" value={formatMoney(faturamentoMes)} />
          <MetricCard title="Barbeiro com mais atendimentos" value={barbeiroMaisAtendimentos(agendamentosMes, barbers)} />
          <MetricCard title="Ticket médio por cliente" value={formatMoney(ticketMedio(agendamentosMes))} />
          <MetricCard title="Ticket médio por agendamento" value={formatMoney(ticketMedioAgendamento(agendamentosMes))} />
        </div>
        <BarrasStatus data={statusMes} />
      </Card>
    </div>
  );
}

const Desempenho = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <Tabs defaultValue="barbeiros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
          <TabsTrigger value="loja">Loja</TabsTrigger>
        </TabsList>

        <TabsContent value="barbeiros">
          <AbaBarbeiros />
        </TabsContent>

        <TabsContent value="loja">
          <AbaLoja />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Desempenho; 