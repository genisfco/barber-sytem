import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, endOfMonth } from "date-fns";

export type RelatorioData = {
  receitas: number;
  despesas: number;
  saldo: number;
  transacoes: {
    id: string;
    type: "receita" | "despesa";
    value: number;
    description: string;
    payment_method?: string;
    status: "pendente" | "pago" | "cancelado";
    created_at: string;
  }[];
};

export function useRelatorios() {
  const getRelatorioMensal = (mes: string, ano: string) => {
    return useQuery({
      queryKey: ["relatorio-mensal", mes, ano],
      queryFn: async () => {
        // Cria uma data do primeiro dia do mês
        const startDate = `${ano}-${mes.padStart(2, "0")}-01T00:00:00`;
        
        // Calcula o último dia do mês usando endOfMonth
        const lastDay = endOfMonth(new Date(Number(ano), Number(mes) - 1));
        const endDate = format(lastDay, "yyyy-MM-dd") + "T23:59:59";

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório mensal");
          throw error;
        }

        const totais = data.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: data }
        );

        return totais as RelatorioData;
      },
      enabled: Boolean(mes && ano),
    });
  };

  const getRelatorioAnual = (ano: string) => {
    return useQuery({
      queryKey: ["relatorio-anual", ano],
      queryFn: async () => {
        const startDate = `${ano}-01-01T00:00:00`;
        const endDate = `${ano}-12-31T23:59:59`;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório anual");
          throw error;
        }

        const totais = data.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: data }
        );

        return totais as RelatorioData;
      },
      enabled: Boolean(ano),
    });
  };

  return {
    getRelatorioMensal,
    getRelatorioAnual,
  };
}
