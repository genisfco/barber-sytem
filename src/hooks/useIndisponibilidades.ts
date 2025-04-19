import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Indisponibilidade {
  id?: string;
  barber_id: string;
  date: string;
  reason?: string;
  created_at?: string;
  start_time?: string;
  end_time?: string;
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

  // Verificar se um barbeiro está indisponível em um horário específico
  const verificarIndisponibilidade = (barbeiroId: string, data: Date, horario?: string) => {
    if (!data || !indisponibilidades) return false;
    
    const formattedDate = format(data, "yyyy-MM-dd");
    
    return indisponibilidades.some((indisponibilidade) => {
      if (indisponibilidade.barber_id !== barbeiroId || indisponibilidade.date !== formattedDate) {
        return false;
      }

      // Se não foi especificado um horário, verifica se está indisponível para o dia todo
      if (!horario) {
        return !indisponibilidade.start_time && !indisponibilidade.end_time;
      }

      // Se foi especificado um horário, verifica se está dentro do período de indisponibilidade
      if (indisponibilidade.start_time && indisponibilidade.end_time) {
        const [horaVerificar, minutoVerificar] = horario.split(':').map(Number);
        const [horaInicial, minutoInicial] = indisponibilidade.start_time.split(':').map(Number);
        const [horaFinal, minutoFinal] = indisponibilidade.end_time.split(':').map(Number);
        
        const minutosVerificar = horaVerificar * 60 + minutoVerificar;
        const minutosInicial = horaInicial * 60 + minutoInicial;
        const minutosFinal = horaFinal * 60 + minutoFinal;
        
        return minutosVerificar >= minutosInicial && minutosVerificar < minutosFinal;
      }

      return false;
    });
  };

  const registrarIndisponibilidade = useMutation({
    mutationFn: async ({ 
      barbeiroId, 
      data, 
      horarioInicial, 
      horarioFinal, 
      motivo 
    }: { 
      barbeiroId: string;       
      data: Date;
      horarioInicial?: string;
      horarioFinal?: string;
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
          date: formattedDate,
          reason: motivo || 'Indisponível',
          start_time: horarioInicial,
          end_time: horarioFinal
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
        description: "O barbeiro foi marcado como indisponível para o período selecionado.",
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
    mutationFn: async ({ 
      barbeiroId, 
      data,
      horarioInicial,
      horarioFinal 
    }: { 
      barbeiroId: string; 
      data: Date;
      horarioInicial?: string;
      horarioFinal?: string;
    }) => {
      const formattedDate = format(data, "yyyy-MM-dd");
      
      // Se não houver horários específicos, remove todas as indisponibilidades do dia
      if (!horarioInicial || !horarioFinal) {
        const { error } = await supabase
          .from('barber_unavailability')
          .delete()
          .eq('barber_id', barbeiroId)
          .eq('date', formattedDate);

        if (error) throw error;
        return;
      }

      // Busca todas as indisponibilidades do dia
      const { data: indisponibilidades, error: fetchError } = await supabase
        .from('barber_unavailability')
        .select('*')
        .eq('barber_id', barbeiroId)
        .eq('date', formattedDate);

      if (fetchError) throw fetchError;

      if (!indisponibilidades || indisponibilidades.length === 0) {
        throw new Error('Nenhuma indisponibilidade encontrada');
      }

      // Encontra a indisponibilidade específica que contém o horário a ser removido
      const indisponibilidadeAlvo = indisponibilidades.find(indisponibilidade => {
        if (!indisponibilidade.start_time || !indisponibilidade.end_time) {
          return true; // Se não tem horário específico, é uma indisponibilidade para o dia todo
        }

        const [horaInicial, minutoInicial] = horarioInicial.split(':').map(Number);
        const [horaFinal, minutoFinal] = horarioFinal.split(':').map(Number);
        const [horaRegistroInicial, minutoRegistroInicial] = indisponibilidade.start_time.split(':').map(Number);
        const [horaRegistroFinal, minutoRegistroFinal] = indisponibilidade.end_time.split(':').map(Number);

        const minutosInicial = horaInicial * 60 + minutoInicial;
        const minutosFinal = horaFinal * 60 + minutoFinal;
        const minutosRegistroInicial = horaRegistroInicial * 60 + minutoRegistroInicial;
        const minutosRegistroFinal = horaRegistroFinal * 60 + minutoRegistroFinal;

        return minutosInicial >= minutosRegistroInicial && minutosFinal <= minutosRegistroFinal;
      });

      if (!indisponibilidadeAlvo) {
        throw new Error('Período de indisponibilidade não encontrado');
      }

      // Se for uma indisponibilidade para o dia todo ou exatamente o mesmo período
      if (!indisponibilidadeAlvo.start_time || !indisponibilidadeAlvo.end_time ||
          (indisponibilidadeAlvo.start_time === horarioInicial && indisponibilidadeAlvo.end_time === horarioFinal)) {
        const { error } = await supabase
          .from('barber_unavailability')
          .delete()
          .eq('id', indisponibilidadeAlvo.id);

        if (error) throw error;
        return;
      }

      // Se o período a ser removido está no início ou fim
      const [horaInicial, minutoInicial] = horarioInicial.split(':').map(Number);
      const [horaFinal, minutoFinal] = horarioFinal.split(':').map(Number);
      const [horaRegistroInicial, minutoRegistroInicial] = indisponibilidadeAlvo.start_time.split(':').map(Number);
      const [horaRegistroFinal, minutoRegistroFinal] = indisponibilidadeAlvo.end_time.split(':').map(Number);

      const minutosInicial = horaInicial * 60 + minutoInicial;
      const minutosFinal = horaFinal * 60 + minutoFinal;
      const minutosRegistroInicial = horaRegistroInicial * 60 + minutoRegistroInicial;
      const minutosRegistroFinal = horaRegistroFinal * 60 + minutoRegistroFinal;

      if (minutosInicial === minutosRegistroInicial || minutosFinal === minutosRegistroFinal) {
        const { error } = await supabase
          .from('barber_unavailability')
          .update({
            start_time: minutosInicial === minutosRegistroInicial ? horarioFinal : indisponibilidadeAlvo.start_time,
            end_time: minutosFinal === minutosRegistroFinal ? horarioInicial : indisponibilidadeAlvo.end_time
          })
          .eq('id', indisponibilidadeAlvo.id);

        if (error) throw error;
        return;
      }

      // Se o período a ser removido está no meio
      if (minutosInicial > minutosRegistroInicial && minutosFinal < minutosRegistroFinal) {
        // Cria um novo registro para o período após o que está sendo removido
        const { error: insertError } = await supabase
          .from('barber_unavailability')
          .insert({
            barber_id: barbeiroId,
            date: formattedDate,
            reason: indisponibilidadeAlvo.reason,
            start_time: horarioFinal,
            end_time: indisponibilidadeAlvo.end_time
          });

        if (insertError) throw insertError;

        // Atualiza o registro existente para terminar antes do período que está sendo removido
        const { error: updateError } = await supabase
          .from('barber_unavailability')
          .update({
            end_time: horarioInicial
          })
          .eq('id', indisponibilidadeAlvo.id);

        if (updateError) throw updateError;
        return;
      }

      throw new Error('Não foi possível remover o período selecionado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades"] });
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast({
        title: "Indisponibilidade removida com sucesso!",
        description: "O barbeiro está disponível para o período selecionado.",
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