import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Indisponibilidade {
  id?: string;
  barber_id: string;
  barber_name: string;
  date: string;
  motivo?: string;
  created_at?: string;
}

export function useIndisponibilidades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar indisponibilidades - agora usando a tabela real
  const { data: indisponibilidades, isLoading } = useQuery({
    queryKey: ["indisponibilidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_unavailability')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });

  // Verificar se um barbeiro está indisponível
  const verificarIndisponibilidade = (barbeiroId: string, data: Date) => {
    if (!data || !indisponibilidades) return false;
    
    const formattedDate = format(data, "yyyy-MM-dd");
    
    return indisponibilidades.some(
      (indisponibilidade) => 
        indisponibilidade.barber_id === barbeiroId && 
        indisponibilidade.date === formattedDate
    );
  };

  const registrarIndisponibilidade = useMutation({
    mutationFn: async ({ barbeiroId, barbeiroName, data, motivo }: { 
      barbeiroId: string; 
      barbeiroName: string; 
      data: Date;
      motivo?: string;
    }) => {
      const formattedDate = format(data, "yyyy-MM-dd");
      
      // Verificar se já existe indisponibilidade para este barbeiro nesta data
      const { data: existente, error: errorConsulta } = await supabase
        .from('barber_unavailability')
        .select('id')
        .eq('barber_id', barbeiroId)
        .eq('date', formattedDate)
        .maybeSingle();
      
      if (errorConsulta) throw errorConsulta;
      
      // Se já existe, não cria novamente
      if (existente) {
        return existente;
      }
      
      // Criar um registro na nova tabela
      const { data: novaIndisponibilidade, error } = await supabase
        .from('barber_unavailability')
        .insert({
          barber_id: barbeiroId,
          barber_name: barbeiroName,
          date: formattedDate,
          motivo: motivo || 'Indisponível'
        })
        .select()
        .single();

      if (error) throw error;
      
      return novaIndisponibilidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Indisponibilidade registrada com sucesso!",
        description: "O barbeiro foi marcado como indisponível para o dia selecionado.",
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
      
      // Remover da tabela de indisponibilidades
      const { error } = await supabase
        .from('barber_unavailability')
        .delete()
        .eq('barber_id', barbeiroId)
        .eq('date', formattedDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Indisponibilidade removida com sucesso!",
        description: "O barbeiro está disponível para o dia selecionado.",
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
    indisponibilidades,
    isLoading,
    verificarIndisponibilidade,
    registrarIndisponibilidade,
    removerIndisponibilidade,
  };
} 