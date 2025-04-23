import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServicos } from "@/hooks/useServicos";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Agendamento = Database['public']['Tables']['appointments']['Row'];
type ServicoAgendamento = Database['public']['Tables']['appointment_services']['Row'];
type ProdutoAgendamento = Database['public']['Tables']['appointment_products']['Row'];

interface CreateAgendamentoData {
  date: string;
  time: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  barber_id: string;
  barber: string;
  services: Omit<ServicoAgendamento, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>[];
  products?: Omit<ProdutoAgendamento, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>[];
}

export function useAgendamentos(date?: Date, barbeiro_id?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { servicos } = useServicos();

  // Formata a data para o formato YYYY-MM-DD
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

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

  // Buscar agendamentos
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

      const { data: appointments, error } = await query;

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
        throw error;
      }

      // Buscar serviços e produtos para cada agendamento
      const agendamentosCompletos = await Promise.all(
        (appointments || []).map(async (agendamento) => {
          const { data: servicos } = await supabase
            .from('appointment_services')
            .select('*')
            .eq('appointment_id', agendamento.id);

          const { data: produtos } = await supabase
            .from('appointment_products')
            .select('*')
            .eq('appointment_id', agendamento.id);

          return {
            ...agendamento,
            servicos: servicos || [],
            produtos: produtos || []
          };
        })
      );

      console.log("Agendamentos completos encontrados:", agendamentosCompletos);
      return agendamentosCompletos;
    },
    enabled: !!formattedDate, // Só executa a query se tiver uma data
    staleTime: 1000 * 60, // Considera os dados frescos por 1 minuto
    refetchInterval: 5000, // Recarrega a cada 5 segundos
    refetchOnWindowFocus: true // Recarrega quando a janela ganha foco
  });

  const createAgendamento = useMutation({
    mutationFn: async (agendamento: CreateAgendamentoData) => {
      // Calcular totais
      const totalPrice = agendamento.services.reduce((sum, service) => sum + service.service_price, 0);
      const totalDuration = agendamento.services.reduce((sum, service) => sum + service.service_duration, 0);
      const totalProductsPrice = agendamento.products?.reduce((sum, product) => sum + (product.product_price * product.quantity), 0) || 0;
      const finalPrice = totalPrice + totalProductsPrice;

      // Criar o agendamento principal
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          date: agendamento.date,
          time: agendamento.time,
          client_id: agendamento.client_id,
          client_name: agendamento.client_name,
          client_email: agendamento.client_email,
          client_phone: agendamento.client_phone,
          barber_id: agendamento.barber_id,
          barber: agendamento.barber,
          total_duration: totalDuration,
          total_price: totalPrice,
          total_products_price: totalProductsPrice,
          final_price: finalPrice,
          status: 'pendente'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Inserir serviços do agendamento
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(
          agendamento.services.map(service => ({
            appointment_id: appointment.id,
            service_id: service.service_id,
            service_name: service.service_name,
            service_price: service.service_price,
            service_duration: service.service_duration
          }))
        );

      if (servicesError) throw servicesError;

      // Inserir produtos do agendamento, se houver
      if (agendamento.products && agendamento.products.length > 0) {
        const { error: productsError } = await supabase
          .from('appointment_products')
          .insert(
            agendamento.products.map(product => ({
              appointment_id: appointment.id,
              product_id: product.product_id,
              product_name: product.product_name,
              product_price: product.product_price,
              quantity: product.quantity
            }))
          );

        if (productsError) throw productsError;
      }

      return appointment;
    },
    onSuccess: (_, variables) => {
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
    mutationFn: async (appointment: Partial<Agendamento> & { 
      id: string;
      servicos: ServicoAgendamento[]; 
      produtos: ProdutoAgendamento[];
      payment_method?: string;
      client_name: string;
      barber: string;
      barber_id: string;
    }) => {
      try {
        console.log('🚀 Iniciando processo de finalização do atendimento:', {
          id: appointment.id,
          cliente: appointment.client_name,
          servicos: appointment.servicos.length,
          produtos: appointment.produtos.length,
          status_atual: appointment.status,
          forma_pagamento: appointment.payment_method
        });

        // 1. Primeiro atualizamos o status do agendamento para "atendido"
        const { data: statusUpdate, error: statusError } = await supabase
          .from('appointments')
          .update({ 
            status: 'atendido',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)
          .select()
          .single();

        if (statusError) {
          console.error('❌ Erro ao atualizar status:', statusError);
          throw statusError;
        }

        console.log('✅ Status atualizado para atendido');

        // 2. Removemos os serviços e produtos existentes
        const { error: deleteServicesError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointment.id);

        if (deleteServicesError) {
          console.error('❌ Erro ao deletar serviços:', deleteServicesError);
          throw deleteServicesError;
        }

        console.log('✅ Serviços anteriores removidos');

        const { error: deleteProductsError } = await supabase
          .from('appointment_products')
          .delete()
          .eq('appointment_id', appointment.id);

        if (deleteProductsError) {
          console.error('❌ Erro ao deletar produtos:', deleteProductsError);
          throw deleteProductsError;
        }

        console.log('✅ Produtos anteriores removidos');

        // 3. Inserimos os novos serviços
        if (appointment.servicos.length > 0) {
          const { error: servicesError } = await supabase
            .from('appointment_services')
            .insert(appointment.servicos.map(servico => ({
              ...servico,
              appointment_id: appointment.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));

          if (servicesError) {
            console.error('❌ Erro ao inserir serviços:', servicesError);
            throw servicesError;
          }

          console.log('✅ Novos serviços inseridos:', appointment.servicos.length);
        }

        // 4. Inserimos os novos produtos
        if (appointment.produtos.length > 0) {
          const { error: productsError } = await supabase
            .from('appointment_products')
            .insert(appointment.produtos.map(produto => ({
              ...produto,
              appointment_id: appointment.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));

          if (productsError) {
            console.error('❌ Erro ao inserir produtos:', productsError);
            throw productsError;
          }

          console.log('✅ Novos produtos inseridos:', appointment.produtos.length);
        }

        // 5. Calculamos os totais
        const totalServiceAmount = appointment.servicos.reduce((sum, service) => sum + service.service_price, 0);
        const totalProductsAmount = appointment.produtos.reduce((sum, produto) => 
          sum + (produto.product_price * produto.quantity), 0);
        const finalPrice = totalServiceAmount + totalProductsAmount;

        console.log('💰 Totais calculados:', {
          servicos: totalServiceAmount,
          produtos: totalProductsAmount,
          final: finalPrice
        });

        // 6. Atualizamos o agendamento com os valores finais
        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'atendido',
            total_price: totalServiceAmount,
            total_products_price: totalProductsAmount,
            final_price: finalPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar agendamento:', updateError);
          throw updateError;
        }

        console.log('✅ Agendamento atualizado com valores finais');

        // 7. Buscamos as informações do barbeiro
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('commission_rate')
          .eq('id', appointment.barber_id)
          .single();

        if (barberError) {
          console.error('❌ Erro ao buscar informações do barbeiro:', barberError);
          throw barberError;
        }

        const commissionRate = barber.commission_rate;
        const commissionAmount = totalServiceAmount * (commissionRate / 100);

        console.log('💼 Comissão calculada:', {
          taxa: commissionRate,
          valor: commissionAmount
        });

        // 8. Verificamos se já existe uma comissão para este agendamento
        if (commissionAmount > 0) {
          const { data: existingCommission, error: searchError } = await supabase
            .from('barber_commissions')
            .select()
            .eq('appointment_id', appointment.id)
            .single();

          if (searchError && searchError.code !== 'PGRST116') { // PGRST116 é o código para "não encontrado"
            console.error('❌ Erro ao buscar comissão existente:', searchError);
            throw searchError;
          }

          if (existingCommission) {
            // Atualiza a comissão existente
            console.log('🔄 Atualizando comissão existente');
            const { error: updateError } = await supabase
              .from('barber_commissions')
              .update({
                total_price: totalServiceAmount,
                total_commission: commissionAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingCommission.id);

            if (updateError) {
              console.error('❌ Erro ao atualizar comissão:', updateError);
              throw updateError;
            }

            console.log('✅ Comissão atualizada');
          } else {
            // Cria uma nova comissão
            console.log('📝 Criando nova comissão');
            const { error: commissionError } = await supabase
              .from('barber_commissions')
              .insert({
                barber_id: appointment.barber_id,
                appointment_id: appointment.id,
                total_price: totalServiceAmount,
                total_commission: commissionAmount,
                status: 'pendente',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (commissionError) {
              console.error('❌ Erro ao registrar comissão:', commissionError);
              throw commissionError;
            }

            console.log('✅ Nova comissão registrada');
          }
        }

        // 9. Lançamos a receita dos serviços
        if (totalServiceAmount > 0) {
          const { error: receitaError } = await supabase
            .from('transactions')
            .insert({
              appointment_id: appointment.id,
              type: 'receita',
              value: totalServiceAmount,
              description: `Serviços: ${appointment.servicos.map(s => s.service_name).join(', ')} - Cliente: ${appointment.client_name}`,
              payment_method: appointment.payment_method || 'dinheiro',
              status: 'pendente',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (receitaError) {
            console.error('❌ Erro ao registrar receita de serviços:', receitaError);
            throw receitaError;
          }

          console.log('✅ Receita de serviços lançada');
        }

        // 10. Se houver produtos, lançamos a receita
        if (totalProductsAmount > 0) {
          const { error: produtosError } = await supabase
            .from('transactions')
            .insert({
              appointment_id: appointment.id,
              type: 'receita',
              value: totalProductsAmount,
              description: `Produtos: ${appointment.produtos.map(p => `${p.product_name} (${p.quantity}x)`).join(', ')} - Cliente: ${appointment.client_name}`,
              payment_method: appointment.payment_method || 'dinheiro',
              status: 'pendente',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (produtosError) {
            console.error('❌ Erro ao registrar receita de produtos:', produtosError);
            throw produtosError;
          }

          console.log('✅ Receita de produtos lançada');
        }

        console.log('🎉 Processo de finalização concluído com sucesso!');
        return updatedAppointment;
      } catch (error) {
        console.error("❌ Erro ao marcar como atendido:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
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
      console.log('==================================');
      console.log('🔍 INICIANDO BUSCA DE AGENDAMENTOS');
      console.log('==================================');
      console.log('Filtros:', {
        client_id: data.client_id,
        barber_id: data.barber_id,
        date: data.date,
        status: ['pendente', 'cancelado']
      });

      // Busca todos os agendamentos relacionados com status pendente ou cancelado
      const { data: agendamentos, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', data.client_id)
        .eq('barber_id', data.barber_id)
        .eq('date', data.date)
        .in('status', ['pendente', 'cancelado']);

      if (error) {
        console.error('❌ ERRO NA BUSCA:', error);
        throw error;
      }

      console.log('==================================');
      console.log('✨ AGENDAMENTOS ENCONTRADOS:', agendamentos?.length || 0);
      console.log('==================================');
      console.log(JSON.stringify(agendamentos, null, 2));

      // Atualiza o status de todos os agendamentos encontrados
      if (agendamentos && agendamentos.length > 0) {
        console.log('==================================');
        console.log('🔄 INICIANDO ATUALIZAÇÕES');
        console.log('==================================');
        
        const promises = agendamentos.map((agendamento) => {
          console.log('📝 Atualizando:', {
            id: agendamento.id,
            cliente: agendamento.client_name,
            barbeiro: agendamento.barber,
            servico: agendamento.service,
            de_status: agendamento.status,
            para_status: data.status
          });
          
          return supabase
            .from('appointments')
            .update({ status: data.status })
            .eq('id', agendamento.id);
        });

        await Promise.all(promises);
        console.log('✅ TODAS AS ATUALIZAÇÕES CONCLUÍDAS COM SUCESSO');
      } else {
        console.log('⚠️ NENHUM AGENDAMENTO ENCONTRADO PARA ATUALIZAR');
      }

      console.log('==================================');
      return agendamentos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      console.log('🔄 CACHE ATUALIZADO');
    },
  });

  // Função para verificar se um barbeiro está disponível em uma data específica
  const verificarDisponibilidadeBarbeiro = (barbeiroId: string, data: string, horario?: string) => {
    // Verifica se o barbeiro está indisponível para o dia/horário
    const indisponibilidade = indisponibilidades?.find(
      (indisponibilidade) => 
        indisponibilidade.barber_id === barbeiroId && 
        indisponibilidade.date === data
    );

    if (!indisponibilidade) {
      return true; // Se não houver indisponibilidade, está disponível
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
      
      return !(minutosVerificar >= minutosInicial && minutosVerificar <= minutosFinal);
    }

    return true; // Se não houver horários específicos, está disponível
  };

  // Verificar se o cliente já tem agendamento no mesmo dia
  const verificarAgendamentoCliente = (clientId: string, date: string, agendamentoId?: string) => {
    if (!agendamentos) return false;
    
    return agendamentos.some(
      (agendamento) => 
        agendamento.client_id === clientId && 
        agendamento.date === date &&
        agendamento.id !== agendamentoId &&
        ["pendente", "confirmado"].includes(agendamento.status)
    );
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
    verificarAgendamentoCliente,
  };
}
