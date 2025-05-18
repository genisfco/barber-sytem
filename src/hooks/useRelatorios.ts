import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, endOfMonth } from "date-fns";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

export type RelatorioData = {
  receitas: number;
  despesas: number;
  saldo: number;
  transacoes: {
    id: string;
    barber_shop_id: string;
    type: "receita" | "despesa";
    value: number;
    description: string;
    payment_method?: string;
    category: "servicos" | "produtos" | "assinaturas" | "comissoes" | "despesas_fixas" | "outros";
    status: "pendente" | "pago" | "cancelado";
    payment_date: string;
    created_at: string;
    updated_at: string;
  }[];
};

export function useRelatorios() {
  const { selectedBarberShop } = useBarberShopContext();

  const getRelatorioMensal = (mes: string, ano: string) => {
    return useQuery({
      queryKey: ["relatorio-mensal", mes, ano, selectedBarberShop?.id],
      queryFn: async () => {
        if (!selectedBarberShop) {
          throw new Error("Barbearia não selecionada");
        }

        // Cria uma data do primeiro dia do mês
        const startDate = `${ano}-${mes.padStart(2, "0")}-01`;
        
        // Calcula o último dia do mês usando endOfMonth
        const lastDay = endOfMonth(new Date(Number(ano), Number(mes) - 1));
        const endDate = format(lastDay, "yyyy-MM-dd");

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("barber_shop_id", selectedBarberShop.id)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório mensal");
          throw error;
        }

        const totais = (data || []).reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: data || [] }
        );

        return totais as RelatorioData;
      },
      enabled: Boolean(mes && ano && selectedBarberShop),
    });
  };

  const getRelatorioAnual = (ano: string) => {
    return useQuery({
      queryKey: ["relatorio-anual", ano, selectedBarberShop?.id],
      queryFn: async () => {
        if (!selectedBarberShop) {
          throw new Error("Barbearia não selecionada");
        }

        const startDate = `${ano}-01-01`;
        const endDate = `${ano}-12-31`;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("barber_shop_id", selectedBarberShop.id)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório anual");
          throw error;
        }

        const totais = (data || []).reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: data || [] }
        );

        return totais as RelatorioData;
      },
      enabled: Boolean(ano && selectedBarberShop),
    });
  };

  return {
    getRelatorioMensal,
    getRelatorioAnual,
  };
}
