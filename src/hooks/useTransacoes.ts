import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export type Transacao = {
  id: string;
  appointment_id?: string;
  type: "receita" | "despesa";
  value: number;
  description: string;
  payment_method?: string;
  status: "pendente" | "pago" | "cancelado";
  notes?: string;
  created_at: string;
  updated_at: string;
};

export function useTransacoes() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["transacoes"],
    queryFn: async () => {
      console.log("Buscando todas as transações...");
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar transações");
        throw error;
      }

      console.log("Transações retornadas:", data);
      return data as Transacao[];
    },
  });

  const { data: transacoesHoje } = useQuery({
    queryKey: ["transacoes-hoje"],
    queryFn: async () => {
      console.log("Buscando transações do dia...", today);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (error) {
        toast.error("Erro ao carregar transações do dia");
        throw error;
      }

      console.log("Transações do dia retornadas:", data);
      return data as Transacao[];
    },
  });

  const createTransacao = useMutation({
    mutationFn: async (transacao: Omit<Transacao, "id" | "created_at" | "updated_at">) => {
      console.log("Iniciando criação de transação:", transacao);
      
      // Validar o tipo da transação
      if (transacao.type !== "receita" && transacao.type !== "despesa") {
        throw new Error(`Tipo de transação inválido: ${transacao.type}`);
      }

      // Validar o valor
      if (typeof transacao.value !== "number" || transacao.value <= 0) {
        throw new Error(`Valor inválido: ${transacao.value}`);
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert(transacao)
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado do Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === "23514") { // Violação de check constraint
          throw new Error("Erro na validação do tipo de transação. Por favor, entre em contato com o suporte.");
        }
        throw error;
      }

      console.log("Transação criada com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      console.log("Transação criada com sucesso, invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje"] });
    },
    onError: (error: Error) => {
      console.error("Erro na mutação createTransacao:", error);
      toast.error(`Erro ao criar transação: ${error.message}`);
    }
  });

  // Cálculos de totais apenas do dia atual
  const totais = transacoesHoje?.reduce(
    (acc, transacao) => {
      if (transacao.type === "receita") {
        acc.receitas += Number(transacao.value);
      } else {
        acc.despesas += Number(transacao.value);
      }
      acc.saldo = acc.receitas - acc.despesas;
      return acc;
    },
    { receitas: 0, despesas: 0, saldo: 0 }
  ) || { receitas: 0, despesas: 0, saldo: 0 };

  return {
    transacoes, // todas as transações para a tabela
    transacoesHoje, // transações apenas do dia atual
    isLoading,
    createTransacao,
    totais, // totais apenas do dia atual
  };
}
