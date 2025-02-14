
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addHours } from "date-fns";

export type Transacao = {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string;
  created_at?: string;
};

export function useTransacoes() {
  const queryClient = useQueryClient();

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["transacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar transações");
        throw error;
      }

      return data as Transacao[];
    },
  });

  const createTransacao = useMutation({
    mutationFn: async (transacao: Omit<Transacao, "id" | "created_at">) => {
      // Ajusta a data para o fuso horário local
      const localDate = addHours(new Date(transacao.date), 3);
      const adjustedTransacao = {
        ...transacao,
        date: localDate.toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert(adjustedTransacao)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar transação");
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });

  // Cálculos de totais
  const totais = transacoes?.reduce(
    (acc, transacao) => {
      if (transacao.type === "receita") {
        acc.receitas += Number(transacao.amount);
      } else {
        acc.despesas += Number(transacao.amount);
      }
      acc.saldo = acc.receitas - acc.despesas;
      return acc;
    },
    { receitas: 0, despesas: 0, saldo: 0 }
  ) || { receitas: 0, despesas: 0, saldo: 0 };

  return {
    transacoes,
    isLoading,
    createTransacao,
    totais,
  };
}
