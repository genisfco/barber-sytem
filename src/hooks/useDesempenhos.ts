import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { useBarbers } from "@/hooks/useBarbers";
import { useClientes } from "@/hooks/useClientes";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDate, getDaysInMonth } from "date-fns";

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

function faturamentoPorPeriodo(transacoes, inicio, fim) {
  return transacoes.filter(t => t.type === "receita" && t.payment_date >= format(inicio, "yyyy-MM-dd") && t.payment_date <= format(fim, "yyyy-MM-dd")).reduce((acc, t) => acc + Number(t.value), 0);
}

function barbeiroMaisAtendimentos(agendamentos, barbers) {
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

function ticketMedio(agendamentos) {
  const atendidos = agendamentos.filter(a => a.status === "atendido");
  if (!atendidos.length) return 0;
  const total = atendidos.reduce((acc, a) => acc + Number(a.final_price), 0);
  const clientesUnicos = new Set(atendidos.map(a => a.client_id)).size;
  return clientesUnicos ? total / clientesUnicos : 0;
}

function ticketMedioAgendamento(agendamentos) {
  const atendidos = agendamentos.filter(a => a.status === "atendido");
  if (!atendidos.length) return 0;
  const total = atendidos.reduce((acc, a) => acc + Number(a.final_price), 0);
  return total / atendidos.length;
}

export function useDesempenhos() {
  const { selectedBarberShop } = useBarberShopContext();
  const { barbers = [] } = useBarbers();
  const { clientes = [] } = useClientes();

  // Busca todos os agendamentos da barbearia
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ["agendamentos-desempenho", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("barber_shop_id", selectedBarberShop.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberShop?.id,
    staleTime: 1000 * 60 * 5
  });

  return {
    agendamentos,
    isLoading,
    filtrarPorPeriodo,
    agruparPorStatus,
    barbeiroMaisAtendimentos: (ag, bs) => barbeiroMaisAtendimentos(ag, bs || barbers),
    ticketMedio,
    ticketMedioAgendamento
  };
} 