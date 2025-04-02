import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { horarios } from "@/constants/horarios";

export function useIndisponibilidades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registrarIndisponibilidade = useMutation({
    mutationFn: async ({ barbeiroId, barbeiroName, data }: { barbeiroId: string; barbeiroName: string; data: Date }) => {
      const formattedDate = format(data, "yyyy-MM-dd");
      
      const agendamentosIndisponivel = horarios.map(horario => ({
        date: formattedDate,
        time: horario,
        barber_id: barbeiroId,
        status: "indisponivel",
        client_id: null,
        service_id: null,
        client_name: "Indisponível",
        service: "Indisponível",
        barber: barbeiroName,
        client_email: "indisponivel@barbershop.com",
        client_phone: "0000000000"
      }));

      const { error } = await supabase
        .from('appointments')
        .insert(agendamentosIndisponivel);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Indisponibilidade registrada com sucesso!",
        description: "Os horários foram bloqueados para o dia selecionado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar indisponibilidade",
        description: error.message || "Ocorreu um erro ao tentar registrar a indisponibilidade.",
        variant: "destructive",
      });
    },
  });

  const removerIndisponibilidade = useMutation({
    mutationFn: async ({ barbeiroId, data }: { barbeiroId: string; data: Date }) => {
      const formattedDate = format(data, "yyyy-MM-dd");
      
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'liberado' })
        .eq('barber_id', barbeiroId)
        .eq('date', formattedDate)
        .eq('status', 'indisponivel');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Indisponibilidade removida com sucesso!",
        description: "Os horários foram liberados para o dia selecionado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover indisponibilidade",
        description: error.message || "Ocorreu um erro ao tentar remover a indisponibilidade.",
        variant: "destructive",
      });
    },
  });

  return {
    registrarIndisponibilidade,
    removerIndisponibilidade,
  };
} 