import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Comissao {
  id: string;
  barber_id: string;
  appointment_id: string;
  service_price: number;
  commission_percentage: number;
  commission_value: number;
  status: 'pendente' | 'pago' | 'cancelado';
  created_at?: string;
  updated_at?: string;
}

// Define a type for the mutate function parameters
type PayComissaoParams = {
  id: string;
  isSingle?: boolean;
}

export function useComissoes(
  barbeiroId: string,
  dataInicio: Date,
  dataFim: Date
) {
  const queryClient = useQueryClient();
  
  const dataInicioFormatada = format(dataInicio, "yyyy-MM-dd");
  const dataFimFormatada = format(dataFim, "yyyy-MM-dd");

  const { data: comissoes, isLoading } = useQuery({
    queryKey: ["comissoes", barbeiroId, dataInicioFormatada, dataFimFormatada],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barber_commissions")
        .select(`
          *,
          appointments (
            client_name,
            service,
            service_duration
          )
        `)
        .eq("barber_id", barbeiroId)
        .gte("created_at", dataInicioFormatada)
        .lte("created_at", dataFimFormatada)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar comissões");
        throw error;
      }

      return data as Comissao[];
    },
    enabled: Boolean(barbeiroId && dataInicio && dataFim),
  });

  const totalComissao = comissoes?.reduce(
    (total, comissao) => total + Number(comissao.commission_value),
    0
  ) || 0;

  const pagarComissao = useMutation({
    mutationFn: async (params: PayComissaoParams) => {
      if (params.isSingle) {
        const { error } = await supabase
          .from("barber_commissions")
          .update({ status: "pago" })
          .eq("id", params.id);

        if (error) throw error;
        return params.id;
      } else {
        const { error } = await supabase
          .from("barber_commissions")
          .update({ status: "pago" })
          .eq("barber_id", params.id)
          .eq("status", "pendente")
          .gte("created_at", dataInicioFormatada)
          .lte("created_at", dataFimFormatada);

        if (error) throw error;
        return params.id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comissoes", barbeiroId, dataInicioFormatada, dataFimFormatada],
      });
      
      if (variables.isSingle) {
        toast.success("Comissão marcada como paga");
      } else {
        toast.success("Todas as comissões marcadas como pagas");
      }
    },
    onError: (error) => {
      console.error("Erro ao pagar comissão:", error);
      toast.error("Erro ao atualizar status da comissão");
    },
  });

  return {
    comissoes,
    isLoading,
    totalComissao,
    pagarComissao,
  };
}
