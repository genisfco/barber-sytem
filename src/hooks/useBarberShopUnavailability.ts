import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useBarbers } from "./useBarbers";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

export function useBarberShopUnavailability() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { barbers } = useBarbers();
  const { selectedBarberShop } = useBarberShopContext();

  const indisponibilizarBarbearia = useMutation({
    mutationFn: async ({ data, motivo }: { data: Date; motivo?: string }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      if (!barbers || barbers.length === 0) {
        throw new Error("Nenhum barbeiro encontrado na barbearia");
      }

      const formattedDate = format(data, "yyyy-MM-dd");
      const reason = motivo || "Loja Fechada";

      // Verificar se já existe indisponibilidade 'Loja Fechada' para todos os barbeiros nesta data
      const { data: indisponibilidadesExistentes, error: errorConsulta } = await supabase
        .from('barber_unavailability')
        .select('barber_id')
        .eq('date', formattedDate)
        .eq('reason', reason);

      if (errorConsulta) throw errorConsulta;

      // Se já existe indisponibilidade para todos os barbeiros, não cria novamente
      if (indisponibilidadesExistentes && indisponibilidadesExistentes.length === barbers.length) {
        return { message: "Barbearia já está indisponível para esta data" };
      }

      // Criar indisponibilidade 'Loja Fechada' para TODOS os barbeiros (ativos e inativos), sem remover as existentes
      for (const barber of barbers) {
        // Verifica se já existe registro de 'Loja Fechada' para este barbeiro
        const jaTemLojaFechada = indisponibilidadesExistentes?.some(i => i.barber_id === barber.id);
        if (!jaTemLojaFechada) {
          const { error: insertError } = await supabase
            .from('barber_unavailability')
            .insert({
              barber_id: barber.id,
              date: formattedDate,
              reason: reason
            });
          if (insertError) throw insertError;
        }
      }
      
      return { message: "Barbearia indisponibilizada com sucesso" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Barbearia indisponibilizada!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao indisponibilizar barbearia",
        description: error.message || "Ocorreu um erro ao tentar indisponibilizar a barbearia.",
        variant: "destructive",
      });
    },
  });

  const disponibilizarBarbearia = useMutation({
    mutationFn: async ({ data }: { data: Date }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const formattedDate = format(data, "yyyy-MM-dd");

      // Remover apenas as indisponibilidades da data com motivo "Loja Fechada"
      const { error } = await supabase
        .from('barber_unavailability')
        .delete()
        .eq('date', formattedDate)
        .eq('reason', 'Loja Fechada');

      if (error) throw error;
      
      return { message: "Barbearia disponibilizada com sucesso" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Barbearia disponibilizada!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao disponibilizar barbearia",
        description: error.message || "Ocorreu um erro ao tentar disponibilizar a barbearia.",
        variant: "destructive",
      });
    },
  });

  const verificarSeBarbeariaIndisponivel = async (data: Date): Promise<boolean> => {
    if (!selectedBarberShop || !barbers) return false;

    const formattedDate = format(data, "yyyy-MM-dd");
    
    const { data: indisponibilidades, error } = await supabase
      .from('barber_unavailability')
      .select('barber_id')
      .eq('date', formattedDate)
      .eq('reason', 'Loja Fechada');

    if (error) return false;

    // Verifica se TODOS os barbeiros estão indisponíveis (ativos e inativos)
    return indisponibilidades && indisponibilidades.length === barbers.length;
  };

  return {
    indisponibilizarBarbearia,
    disponibilizarBarbearia,
    verificarSeBarbeariaIndisponivel,
  };
} 