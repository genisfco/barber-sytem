import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Comissao } from "@/types/comissao";

// Define a type for the mutate function parameters
type PayComissaoParams = {
  id: string;
  isSingle?: boolean;
}

export function useComissoes(
  barbeiroId: string,
  tipoBusca: "dataEspecifica" | "periodo",
  dataEspecifica: Date | null,
  dataInicio: Date | null,
  dataFim: Date | null,
  status: "pendente" | "pago" | "cancelado" | "todos" = "todos"
) {
  const queryClient = useQueryClient();
  
  const dataInicioFormatada = dataInicio 
    ? format(dataInicio, "yyyy-MM-dd HH:mm:ss")
    : null;
  
  const dataFimFormatada = dataFim
    ? format(dataFim, "yyyy-MM-dd HH:mm:ss")
    : null;

  const { data: comissoes, isLoading } = useQuery({
    queryKey: ["comissoes", barbeiroId, tipoBusca, dataInicioFormatada, dataFimFormatada, status],
    queryFn: async () => {
      console.log("🔍 Buscando comissões:", {
        barbeiroId,
        tipoBusca,
        dataInicio: dataInicioFormatada,
        dataFim: dataFimFormatada,
        status
      });

      let query = supabase
        .from("barber_commissions")
        .select(`
          *,
          appointment:appointments (
            id,
            client_name,
            date,
            time,
            appointment_services (
              service_name,
              service_price
            )
          )
        `)
        .eq("barber_id", barbeiroId);

      if (dataInicioFormatada && dataFimFormatada) {
        // Primeiro, buscamos os IDs dos appointments do período
        const { data: appointmentIds, error: appointmentError } = await supabase
          .from('appointments')
          .select('id')
          .eq('barber_id', barbeiroId)
          .gte('date', format(dataInicio!, 'yyyy-MM-dd'))
          .lte('date', format(dataFim!, 'yyyy-MM-dd'));

        if (appointmentError) {
          console.error('❌ Erro ao buscar appointments:', appointmentError);
          throw appointmentError;
        }

        // Depois filtramos as comissões pelos IDs dos appointments encontrados
        if (appointmentIds && appointmentIds.length > 0) {
          query = query.in('appointment_id', appointmentIds.map(a => a.id));
        } else {
          // Se não encontrar appointments no período, retorna array vazio
          return [];
        }
      }

      if (status !== "todos") {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar comissões:", error);
        toast.error("Erro ao carregar comissões");
        throw error;
      }

      console.log("✅ Comissões encontradas:", data);

      return data as Comissao[];
    },
    enabled: Boolean(barbeiroId && dataInicio && dataFim),
  });

  const totalComissao = comissoes?.reduce(
    (total, comissao) => total + Number(comissao.total_commission),
    0
  ) || 0;

  const pagarComissao = useMutation({
    mutationFn: async (params: PayComissaoParams) => {
      if (params.isSingle) {
        // Para uma única comissão
        const { data: comissao, error: fetchError } = await supabase
          .from("barber_commissions")
          .select('*, barbers(name)')
          .eq("id", params.id)
          .single();

        if (fetchError) throw fetchError;

        // Atualiza o status da comissão
        const { error } = await supabase
          .from("barber_commissions")
          .update({ 
            status: "pago",
            updated_at: new Date().toISOString()
          })
          .eq("id", params.id);

        if (error) throw error;

        // Lança a despesa da comissão
        const { error: despesaError } = await supabase
          .from('transactions')
          .insert({
            type: 'despesa',
            value: comissao.total_commission,
            description: `Comissão: ${comissao.barbers.name} - Atendimento: ${comissao.appointment?.client_name}`,
            category: 'comissoes',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (despesaError) throw despesaError;

        return params.id;
      } else {
        // Para todas as comissões do período
        const { data: comissoes, error: fetchError } = await supabase
          .from("barber_commissions")
          .select('*, barbers(name)')
          .eq("barber_id", params.id)
          .eq("status", "pendente")
          .gte("created_at", dataInicioFormatada)
          .lte("created_at", dataFimFormatada);

        if (fetchError) throw fetchError;

        // Atualiza o status de todas as comissões
        const { error } = await supabase
          .from("barber_commissions")
          .update({ 
            status: "pago",
            updated_at: new Date().toISOString()
          })
          .eq("barber_id", params.id)
          .eq("status", "pendente")
          .gte("created_at", dataInicioFormatada)
          .lte("created_at", dataFimFormatada);

        if (error) throw error;

        // Calcula o total de comissões
        const totalComissao = comissoes.reduce((sum, comissao) => sum + comissao.total_commission, 0);

        // Lança a despesa total das comissões
        const { error: despesaError } = await supabase
          .from('transactions')
          .insert({
            type: 'despesa',
            value: totalComissao,
            description: `Comissão: ${comissoes[0].barbers.name} - Período: ${format(new Date(dataInicioFormatada), 'dd/MM/yyyy')} a ${format(new Date(dataFimFormatada), 'dd/MM/yyyy')}`,
            category: 'comissoes',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (despesaError) throw despesaError;

        return params.id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comissoes", barbeiroId, tipoBusca, dataInicioFormatada, dataFimFormatada, status],
      });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-hoje'] });
      
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
