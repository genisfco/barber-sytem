
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Comissao {
  id: string;
  barber_id: string;
  barber_name: string;
  appointment_id: string;
  client_name: string;
  service: string;
  service_amount: number;
  commission_amount: number;
  commission_rate: number;
  date: string;
  status: 'pendente' | 'pago';
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
      // Fazemos um JOIN entre as tabelas para obter todos os dados necessários
      const { data, error } = await supabase
        .from("barber_commissions")
        .select(`
          *,
          barbeiros:barbers(name),
          appointments(client_name, service)
        `)
        .eq("barber_id", barbeiroId)
        .gte("date", dataInicioFormatada)
        .lte("date", dataFimFormatada)
        .order("date", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar comissões");
        throw error;
      }

      // Transformamos os dados para o formato que precisamos
      const comissoesFormatadas = data.map((item: any) => ({
        id: item.id,
        barber_id: item.barber_id,
        barber_name: item.barbeiros.name,
        appointment_id: item.appointment_id,
        client_name: item.appointments.client_name,
        service: item.appointments.service,
        service_amount: item.service_amount,
        commission_amount: item.commission_amount,
        commission_rate: item.commission_rate,
        date: item.date,
        status: item.status
      }));

      return comissoesFormatadas as Comissao[];
    },
    enabled: Boolean(barbeiroId && dataInicio && dataFim),
  });

  // Calculamos o total de comissões
  const totalComissao = comissoes?.reduce(
    (total, comissao) => total + Number(comissao.commission_amount),
    0
  ) || 0;

  // Mutation para marcar comissão como paga
  const pagarComissao = useMutation({
    mutationFn: async (params: PayComissaoParams) => {
      if (params.isSingle) {
        // Pagar uma comissão específica
        const { error } = await supabase
          .from("barber_commissions")
          .update({ status: "pago" })
          .eq("id", params.id);

        if (error) throw error;
        return params.id;
      } else {
        // Pagar todas as comissões do barbeiro no período
        const { error } = await supabase
          .from("barber_commissions")
          .update({ status: "pago" })
          .eq("barber_id", params.id)
          .eq("status", "pendente")
          .gte("date", dataInicioFormatada)
          .lte("date", dataFimFormatada);

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
