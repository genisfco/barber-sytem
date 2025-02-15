
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export type RelatorioData = {
  receitas: number;
  despesas: number;
  saldo: number;
  transacoes: {
    id: string;
    type: "receita" | "despesa";
    amount: number;
    description: string;
    category: string;
    date: string;
    notes?: string;
  }[];
};

export function useRelatorios() {
  const getRelatorioMensal = (mes: string, ano: string) => {
    return useQuery({
      queryKey: ["relatorio-mensal", mes, ano],
      queryFn: async () => {
        console.log("Buscando relatório mensal...", { mes, ano });
        
        const startDate = `${ano}-${mes.padStart(2, "0")}-01`;
        const endDate = `${ano}-${mes.padStart(2, "0")}-31`;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório mensal");
          throw error;
        }

        console.log("Dados do relatório mensal:", data);

        const totais = data.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.amount);
            } else {
              acc.despesas += Number(transacao.amount);
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
        console.log("Buscando relatório anual...", { ano });
        
        const startDate = `${ano}-01-01`;
        const endDate = `${ano}-12-31`;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório anual");
          throw error;
        }

        console.log("Dados do relatório anual:", data);

        const totais = data.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.amount);
            } else {
              acc.despesas += Number(transacao.amount);
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
