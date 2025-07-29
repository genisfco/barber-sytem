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
    appointment_id?: string;
    type: "receita" | "despesa";
    value: number;
    description: string;
    payment_method?: string;
    category: "servicos" | "produtos" | "assinaturas" | "comissoes" | "despesas_fixas" | "sistemas" | "outros";
    status: "pendente" | "pago" | "cancelado";
    payment_date: string;
    created_at: string;
    updated_at: string;
    // Campos adicionais para filtros
    appointment?: {
      barber_id: string;
      barber_name: string;
      client_id: string;
      client_name: string;
    };
  }[];
};

export type FiltrosRelatorio = {
  barber_id?: string;
  client_id?: string;
  category?: string;
  payment_method?: string;
};

export function useRelatorios() {
  const { selectedBarberShop } = useBarberShopContext();

  const getRelatorioMensal = (mes: string, ano: string, filtros?: FiltrosRelatorio) => {
    return useQuery({
      queryKey: ["relatorio-mensal", mes, ano, selectedBarberShop?.id, filtros],
      queryFn: async () => {
        if (!selectedBarberShop) {
          throw new Error("Barbearia não selecionada");
        }

        // Cria uma data do primeiro dia do mês
        const startDate = `${ano}-${mes.padStart(2, "0")}-01`;
        
        // Calcula o último dia do mês usando endOfMonth
        const lastDay = endOfMonth(new Date(Number(ano), Number(mes) - 1));
        const endDate = format(lastDay, "yyyy-MM-dd");

        let query = supabase
          .from("transactions")
          .select(`
            *,
            appointment:appointments (
              barber_id,
              barber_name,
              client_id,
              client_name
            )
          `)
          .eq("barber_shop_id", selectedBarberShop.id)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate);

        // Aplicar filtros se fornecidos
        if (filtros?.category && filtros.category !== "todos") {
          query = query.eq("category", filtros.category);
        }

        if (filtros?.payment_method && filtros.payment_method !== "todos") {
          query = query.eq("payment_method", filtros.payment_method);
        }

        const { data, error } = await query.order("payment_date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório mensal");
          throw error;
        }

        let transacoesFiltradas = data as (RelatorioData['transacoes'][0] & { appointment?: any })[];

        // Filtros que precisam ser aplicados no frontend (por causa do join)
        if (filtros?.barber_id && filtros.barber_id !== "todos") {
          transacoesFiltradas = transacoesFiltradas.filter(t => 
            t.appointment?.barber_id === filtros.barber_id
          );
        }

        if (filtros?.client_id && filtros.client_id !== "todos") {
          transacoesFiltradas = transacoesFiltradas.filter(t => 
            t.appointment?.client_id === filtros.client_id
          );
        }

        const totais = transacoesFiltradas.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: transacoesFiltradas }
        );

        return totais as RelatorioData;
      },
      enabled: Boolean(mes && ano && selectedBarberShop),
    });
  };

  const getRelatorioAnual = (ano: string, filtros?: FiltrosRelatorio) => {
    return useQuery({
      queryKey: ["relatorio-anual", ano, selectedBarberShop?.id, filtros],
      queryFn: async () => {
        if (!selectedBarberShop) {
          throw new Error("Barbearia não selecionada");
        }

        const startDate = `${ano}-01-01`;
        const endDate = `${ano}-12-31`;

        let query = supabase
          .from("transactions")
          .select(`
            *,
            appointment:appointments (
              barber_id,
              barber_name,
              client_id,
              client_name
            )
          `)
          .eq("barber_shop_id", selectedBarberShop.id)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate);

        // Aplicar filtros se fornecidos
        if (filtros?.category && filtros.category !== "todos") {
          query = query.eq("category", filtros.category);
        }

        if (filtros?.payment_method && filtros.payment_method !== "todos") {
          query = query.eq("payment_method", filtros.payment_method);
        }

        const { data, error } = await query.order("payment_date", { ascending: false });

        if (error) {
          toast.error("Erro ao carregar relatório anual");
          throw error;
        }

        let transacoesFiltradas = data as (RelatorioData['transacoes'][0] & { appointment?: any })[];

        // Filtros que precisam ser aplicados no frontend (por causa do join)
        if (filtros?.barber_id && filtros.barber_id !== "todos") {
          transacoesFiltradas = transacoesFiltradas.filter(t => 
            t.appointment?.barber_id === filtros.barber_id
          );
        }

        if (filtros?.client_id && filtros.client_id !== "todos") {
          transacoesFiltradas = transacoesFiltradas.filter(t => 
            t.appointment?.client_id === filtros.client_id
          );
        }

        const totais = transacoesFiltradas.reduce(
          (acc, transacao) => {
            if (transacao.type === "receita") {
              acc.receitas += Number(transacao.value);
            } else {
              acc.despesas += Number(transacao.value);
            }
            acc.saldo = acc.receitas - acc.despesas;
            return acc;
          },
          { receitas: 0, despesas: 0, saldo: 0, transacoes: transacoesFiltradas }
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
