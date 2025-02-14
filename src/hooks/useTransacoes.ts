
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      console.log("Buscando transações...");
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar transações");
        throw error;
      }

      console.log("Transações retornadas:", data);
      return data as Transacao[];
    },
  });

  const createTransacao = useMutation({
    mutationFn: async (transacao: Omit<Transacao, "id" | "created_at">) => {
      console.log("Dados a serem salvos:", transacao);
      
      const { data, error } = await supabase
        .from("transactions")
        .insert(transacao)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar transação");
        throw error;
      }

      console.log("Transação salva:", data);
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
