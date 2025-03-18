
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Agendamento {
  id: string;
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber: string;
  service: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface CreateAgendamentoData {
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber: string;
  service: string;
}

export function useAgendamentos(date?: Date) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formattedDate = date?.toISOString().split('T')[0];

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos', formattedDate],
    queryFn: async () => {
      console.log("Buscando agendamentos para:", formattedDate);
      const query = supabase
        .from('appointments')
        .select('*')
        .order('time');

      if (formattedDate) {
        query.eq('date', formattedDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
        throw error;
      }

      return data as Agendamento[];
    },
  });

  const createAgendamento = useMutation({
    mutationFn: async (agendamento: CreateAgendamentoData) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(agendamento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: "Agendamento realizado com sucesso!",
        description: "O horário foi reservado.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao realizar agendamento",
        description: error.message || "Ocorreu um erro ao tentar agendar. Tente novamente.",
      });
    },
  });

  const updateAgendamento = useMutation({
    mutationFn: async (agendamento: Partial<Agendamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(agendamento)
        .eq('id', agendamento.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: "Agendamento atualizado com sucesso!",
        description: "As informações foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar agendamento",
        description: error.message || "Ocorreu um erro ao tentar atualizar. Tente novamente.",
      });
    },
  });

  const marcarComoAtendido = useMutation({
    mutationFn: async (appointment: Agendamento) => {
      // 1. Primeiro atualizamos o status do agendamento
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'atendido' })
        .eq('id', appointment.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Buscamos as informações do barbeiro para obter a taxa de comissão
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('commission_rate')
        .eq('id', appointment.barber_id)
        .single();

      if (barberError) throw barberError;

      // 3. Definimos um valor de serviço padrão (depois pode ser configurável)
      const serviceAmount = 35; // Valor padrão de serviço
      const commissionRate = barber.commission_rate;
      const commissionAmount = serviceAmount * (commissionRate / 100);

      // 4. Registramos a comissão
      const { error: commissionError } = await supabase
        .from('barber_commissions')
        .insert({
          barber_id: appointment.barber_id,
          appointment_id: appointment.id,
          service_amount: serviceAmount,
          commission_amount: commissionAmount,
          commission_rate: commissionRate,
          date: appointment.date,
          status: 'pendente'
        });

      if (commissionError) throw commissionError;

      return updatedAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: "Atendimento concluído!",
        description: "O agendamento foi marcado como atendido e a comissão foi registrada.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao marcar como atendido",
        description: error.message || "Ocorreu um erro ao tentar atualizar o status. Tente novamente.",
      });
    },
  });

  const deleteAgendamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: "Agendamento cancelado com sucesso!",
        description: "O horário foi liberado.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar agendamento",
        description: error.message || "Ocorreu um erro ao tentar cancelar. Tente novamente.",
      });
    },
  });

  return {
    agendamentos,
    isLoading,
    createAgendamento,
    updateAgendamento,
    marcarComoAtendido,
    deleteAgendamento,
  };
}
