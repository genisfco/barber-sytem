import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServicos } from "@/hooks/useServicos";

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

export function useAgendamentos(date?: Date, barbeiro_id?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { servicos } = useServicos();

  const formattedDate = date?.toISOString().split('T')[0];

  // Buscar indisponibilidades
  const { data: indisponibilidades } = useQuery({
    queryKey: ['indisponibilidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_unavailability')
        .select('*');

      if (error) {
        console.error("Erro ao buscar indisponibilidades:", error);
        throw error;
      }

      return data || [];
    }
  });

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos', formattedDate, barbeiro_id],
    queryFn: async () => {
      console.log("Buscando agendamentos para:", formattedDate, "barbeiro:", barbeiro_id);
      const query = supabase
        .from('appointments')
        .select('*')
        .order('time');

      if (formattedDate) {
        query.eq('date', formattedDate);
      }

      if (barbeiro_id) {
        query.eq('barber_id', barbeiro_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
        throw error;
      }

      console.log("Agendamentos encontrados:", data);
      return data as Agendamento[];
    },
    refetchInterval: 5000, // Refetch a cada 5 segundos
    refetchOnWindowFocus: true, // Refetch quando a janela receber foco
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
    onSuccess: (_, variables) => {
      // Invalida todas as queries de agendamentos relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['agendamentos']
      });
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
      try {
        // 1. Primeiro, verificamos o status atual do agendamento
        const { data: currentAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', agendamento.id)
          .single();

        if (fetchError) throw fetchError;

        // 2. Se o status atual era "atendido" e está sendo alterado para outro status
        if (currentAppointment.status === 'atendido' && agendamento.status !== 'atendido') {
          // Remove os lançamentos financeiros
          const { error: deleteTransactionsError } = await supabase
            .from('transactions')
            .delete()
            .eq('notes', `Referente ao agendamento ID: ${agendamento.id}`);

          if (deleteTransactionsError) throw deleteTransactionsError;

          // Remove o registro de comissão
          const { error: deleteCommissionError } = await supabase
            .from('barber_commissions')
            .delete()
            .eq('appointment_id', agendamento.id);

          if (deleteCommissionError) throw deleteCommissionError;
        }

        // 3. Se o agendamento está sendo cancelado, precisamos encontrar e cancelar todos os slots relacionados
        if (agendamento.status === 'cancelado') {
          // Encontra o serviço para obter sua duração
          const servico = servicos?.find(s => s.id === currentAppointment.service_id);
          const slotsNecessarios = servico ? Math.ceil(servico.duration / 30) : 1;

          // Se precisar de mais de um slot, atualiza todos os slots relacionados
          if (slotsNecessarios > 1) {
            const [hora, minuto] = currentAppointment.time.split(':').map(Number);
            const horariosParaAtualizar = [currentAppointment.time];

            // Adiciona os próximos horários se forem necessários
            for (let i = 1; i < slotsNecessarios; i++) {
              const proximoHorario = new Date();
              proximoHorario.setHours(hora, minuto + (i * 30), 0, 0);
              const proximoHorarioFormatado = `${proximoHorario.getHours().toString().padStart(2, '0')}:${proximoHorario.getMinutes().toString().padStart(2, '0')}`;
              horariosParaAtualizar.push(proximoHorarioFormatado);
            }

            // Atualiza o status de todos os slots relacionados
            for (const horario of horariosParaAtualizar) {
              const { error: updateError } = await supabase
                .from('appointments')
                .update({ status: 'cancelado' })
                .eq('date', currentAppointment.date)
                .eq('time', horario)
                .eq('client_id', currentAppointment.client_id)
                .eq('barber_id', currentAppointment.barber_id);

              if (updateError) throw updateError;
            }
          }
        }

        // 4. Atualiza o agendamento principal
        const { data, error } = await supabase
          .from('appointments')
          .update(agendamento)
          .eq('id', agendamento.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalida todas as queries de agendamentos relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['agendamentos']
      });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      toast({
        title: "Agendamento atualizado com sucesso!",
        description: "As informações foram atualizadas e os registros financeiros foram ajustados.",
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
      try {
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

        // 3. Encontrar o valor do serviço na lista de serviços
        const servicoInfo = servicos?.find(s => s.name === appointment.service);
        const serviceAmount = servicoInfo?.price || 35; // Usa valor padrão se não encontrar
        
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

        // 5. Lançamos a receita do serviço no sistema financeiro
        const { error: receitaError } = await supabase
          .from('transactions')
          .insert({
            type: 'receita',
            amount: serviceAmount,
            description: `Serviço: ${appointment.service} - Cliente: ${appointment.client_name}`,
            category: 'servico',
            date: appointment.date,
            notes: `Referente ao agendamento ID: ${appointment.id}`
          });

        if (receitaError) throw receitaError;

        // 6. Lançamos a despesa da comissão no sistema financeiro
        const { error: despesaError } = await supabase
          .from('transactions')
          .insert({
            type: 'despesa',
            amount: commissionAmount,
            description: `Comissão: ${appointment.barber} - Serviço: ${appointment.service}`,
            category: 'comissao',
            date: appointment.date,
            notes: `Referente ao agendamento ID: ${appointment.id}`
          });

        if (despesaError) throw despesaError;

        return updatedAppointment;
      } catch (error) {
        console.error("Erro ao marcar como atendido:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalida todas as queries de agendamentos relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['agendamentos']
      });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      toast({
        title: "Atendimento concluído!",
        description: "O agendamento foi marcado como atendido, a comissão foi registrada e os lançamentos financeiros foram criados.",
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

  const updateAgendamentosRelacionados = useMutation({
    mutationFn: async (data: { 
      client_id: string; 
      barber_id: string; 
      date: string; 
      status: string 
    }) => {
      // Busca todos os agendamentos relacionados com status cancelado
      const { data: agendamentos, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', data.client_id)
        .eq('barber_id', data.barber_id)
        .eq('date', data.date)
        .eq('status', 'cancelado');

      if (error) throw error;

      // Atualiza o status de todos os agendamentos encontrados
      if (agendamentos && agendamentos.length > 0) {
        const promises = agendamentos.map((agendamento) => 
          supabase
            .from('appointments')
            .update({ status: data.status })
            .eq('id', agendamento.id)
        );

        await Promise.all(promises);
      }

      return agendamentos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
    },
  });

  // Função para verificar se um barbeiro está disponível em uma data específica
  const verificarDisponibilidadeBarbeiro = (barbeiroId: string, data: string) => {
    // Verificar se o barbeiro está indisponível para o dia todo
    const indisponivelNaData = indisponibilidades?.some(
      indisponibilidade => 
        indisponibilidade.barber_id === barbeiroId && 
        indisponibilidade.date === data
    );
    
    // Se estiver indisponível para o dia todo, retorna false
    if (indisponivelNaData) return false;

    // Se não estiver indisponível para o dia todo, retorna true
    // A verificação de horários específicos é feita no componente AgendamentoGrid
    return true;
  };

  return {
    agendamentos,
    isLoading,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento,
    marcarComoAtendido,
    verificarDisponibilidadeBarbeiro,
    updateAgendamentosRelacionados,
  };
}
