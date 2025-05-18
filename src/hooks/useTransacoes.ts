import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

export type Transacao = {
  id: string;
  barber_shop_id: string;
  appointment_id?: string;
  type: "receita" | "despesa";
  value: number;
  description: string;
  payment_method?: string;
  category: "servicos" | "produtos" | "assinaturas" | "comissoes" | "despesas_fixas" | "outros";
  notes?: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
};

export function useTransacoes() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { selectedBarberShop } = useBarberShopContext();

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["transacoes", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("barber_shop_id", selectedBarberShop.id)
        .order("payment_date", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar transações");
        throw error;
      }

      return data as Transacao[];
    },
    enabled: !!selectedBarberShop
  });

  const { data: transacoesHoje } = useQuery({
    queryKey: ["transacoes-hoje", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("barber_shop_id", selectedBarberShop.id)
        .gte("payment_date", `${today}`)
        .lte("payment_date", `${today}`);

      if (error) {
        toast.error("Erro ao carregar transações do dia");
        throw error;
      }

      return data as Transacao[];
    },
    enabled: !!selectedBarberShop
  });

  const createTransacao = useMutation({
    mutationFn: async (transacao: Omit<Transacao, "id" | "created_at" | "updated_at" | "barber_shop_id">) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Validar o tipo da transação
      if (transacao.type !== "receita" && transacao.type !== "despesa") {
        throw new Error(`Tipo de transação inválido: ${transacao.type}`);
      }

      // Validar o valor
      if (typeof transacao.value !== "number" || transacao.value <= 0) {
        throw new Error(`Valor inválido: ${transacao.value}`);
      }

      // Garantir que payment_date está presente
      if (!transacao.payment_date) {
        throw new Error("A data do pagamento é obrigatória.");
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          ...transacao,
          barber_shop_id: selectedBarberShop.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23514") { // Violação de check constraint
          throw new Error("Erro na validação do tipo de transação. Por favor, entre em contato com o suporte.");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar transação: ${error.message}`);
    }
  });

  const updateTransacao = useMutation({
    mutationFn: async (transacao: Partial<Transacao> & { id: string }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Validar o tipo da transação se estiver sendo alterado
      if (transacao.type && transacao.type !== "receita" && transacao.type !== "despesa") {
        throw new Error(`Tipo de transação inválido: ${transacao.type}`);
      }

      // Validar o valor se estiver sendo alterado
      if (transacao.value && (typeof transacao.value !== "number" || transacao.value <= 0)) {
        throw new Error(`Valor inválido: ${transacao.value}`);
      }

      // Garantir que payment_date está presente
      if (!transacao.payment_date) {
        throw new Error("A data do pagamento é obrigatória.");
      }

      const { data, error } = await supabase
        .from("transactions")
        .update({
          ...transacao,
          updated_at: new Date().toISOString()
        })
        .eq("id", transacao.id)
        .eq("barber_shop_id", selectedBarberShop.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Se for uma transação de assinatura, atualize o pagamento vinculado
      if (data?.category === 'assinaturas') {
        await supabase.from('subscription_payments').update({
          amount: data.value,
          payment_method: data.payment_method,
          // description não existe em subscription_payments, então não atualiza
        }).eq('transaction_id', data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
      toast.success("Transação atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar transação: ${error.message}`);
    }
  });

  const deleteTransacao = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Buscar a transação para saber se é de assinatura
      const { data: transacao } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('barber_shop_id', selectedBarberShop.id)
        .single();

      // Se for de assinatura, exclua o pagamento vinculado
      if (transacao?.category === 'assinaturas') {
        await supabase.from('subscription_payments').delete().eq('transaction_id', id);
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("barber_shop_id", selectedBarberShop.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
      toast.success("Transação excluída com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir transação: ${error.message}`);
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
    updateTransacao,
    deleteTransacao,
    totais, // totais apenas do dia atual
  };
}
