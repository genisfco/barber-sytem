import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServicos } from "@/hooks/useServicos";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

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
  barber_name: string;
  barber_shop_id: string;
  services: Omit<ServicoAgendamento, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>[];
  products?: Omit<ProdutoAgendamento, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>[];
}

export function useAgendamentos(date?: Date, barbeiro_id?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();
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
        logError(error, "Erro ao buscar indisponibilidades:");
        throw error;
      }

      return data || [];
    }
  });

  // Buscar agendamentos
  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos', formattedDate, barbeiro_id],
    queryFn: async () => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

      const query = supabase
        .from('appointments')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('time');

      if (formattedDate) {
        query.eq('date', formattedDate);
      }

      if (barbeiro_id) {
        query.eq('barber_id', barbeiro_id);
      }

      const { data: appointments, error } = await query;

      if (error) {
        logError(error, "Erro ao buscar agendamentos:");
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

      return agendamentosCompletos;
    },
    enabled: !!formattedDate && !!selectedBarberShop?.id,
    staleTime: 1000 * 60,
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const createAgendamento = useMutation({
    mutationFn: async (agendamento: CreateAgendamentoData) => {
      if (!selectedBarberShop?.id) {
        throw new Error('Barbearia não selecionada');
      }

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
          barber_name: agendamento.barber_name,
          barber_shop_id: selectedBarberShop.id,
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
        logError(error, "Erro ao atualizar agendamento:");
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
      barber_name: string;
      barber_id: string;
    }) => {
      try {
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
          logError(statusError, '❌ Erro ao atualizar status:');
          throw statusError;
        }

        // 2. Removemos os serviços e produtos existentes
        const { error: deleteServicesError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointment.id);

        if (deleteServicesError) {
          logError(deleteServicesError, '❌ Erro ao deletar serviços:');
          throw deleteServicesError;
        }

        const { error: deleteProductsError } = await supabase
          .from('appointment_products')
          .delete()
          .eq('appointment_id', appointment.id);

        if (deleteProductsError) {
          logError(deleteProductsError, '❌ Erro ao deletar produtos:');
          throw deleteProductsError;
        }

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
            logError(servicesError, '❌ Erro ao inserir serviços:');
            throw servicesError;
          }
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
            logError(productsError, '❌ Erro ao inserir produtos:');
            throw productsError;
          }

          // 4.1 Atualizamos o estoque dos produtos vendidos
          for (const produto of appointment.produtos) {
            // Primeiro buscamos o produto atual para pegar o estoque
            const { data: produtoAtual, error: fetchError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', produto.product_id)
              .single();

            if (fetchError) {
              logError(fetchError, `❌ Erro ao buscar produto ${produto.product_id}:`);
              throw fetchError;
            }

            // Calculamos o novo estoque
            const novoEstoque = produtoAtual.stock - produto.quantity;

            // Atualizamos o produto com o novo estoque
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                stock: novoEstoque,
                updated_at: new Date().toISOString()
              })
              .eq('id', produto.product_id);

            if (updateError) {
              logError(updateError, `❌ Erro ao atualizar estoque do produto ${produto.product_id}:`);
              throw updateError;
            }
          }
        }

        // 5. Calculamos os totais
        const totalServiceAmount = appointment.servicos.reduce((sum, service) => sum + service.service_price, 0);
        const totalProductsAmount = appointment.produtos.reduce((sum, produto) => 
          sum + (produto.product_price * produto.quantity), 0);
        const finalPrice = totalServiceAmount + totalProductsAmount;

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
          logError(updateError, '❌ Erro ao atualizar agendamento:');
          throw updateError;
        }

        // 7. Buscamos as informações do barbeiro
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('commission_rate')
          .eq('id', appointment.barber_id)
          .single();

        if (barberError) {
          logError(barberError, '❌ Erro ao buscar informações do barbeiro:');
          throw barberError;
        }

        const commissionRate = barber.commission_rate;
        const commissionAmount = totalServiceAmount * (commissionRate / 100);

        // 8. Verificamos se já existe uma comissão para este agendamento
        if (commissionAmount > 0) {
          const { data: existingCommission, error: searchError } = await supabase
            .from('barber_commissions')
            .select()
            .eq('appointment_id', appointment.id)
            .single();

          if (searchError && searchError.code !== 'PGRST116') { // PGRST116 é o código para "não encontrado"
            logError(searchError, '❌ Erro ao buscar comissão existente:');
            throw searchError;
          }

          if (existingCommission) {
            // Atualiza a comissão existente
            const { error: updateError } = await supabase
              .from('barber_commissions')
              .update({
                total_price: totalServiceAmount,
                total_commission: commissionAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingCommission.id);

            if (updateError) {
              logError(updateError, '❌ Erro ao atualizar comissão:');
              throw updateError;
            }
          } else {
            // Cria uma nova comissão
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
              logError(commissionError, '❌ Erro ao registrar comissão:');
              throw commissionError;
            }
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
              payment_method: appointment.payment_method || 'Dinheiro',
              category: 'servicos',
              payment_date: new Date().toISOString().slice(0, 10),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (receitaError) {
            logError(receitaError, '❌ Erro ao registrar receita de serviços:');
            throw receitaError;
          }
        }

        // 10. Se houver produtos, lançamos a receita
        if (totalProductsAmount > 0) {
          const { error: produtosError } = await supabase
            .from('transactions')
            .insert({
              appointment_id: appointment.id,
              type: 'receita',
              value: totalProductsAmount,
              description: `Produtos: ${appointment.produtos.map(p => `(${p.quantity}x) ${p.product_name}`).join(', ')} - Cliente: ${appointment.client_name}`,
              payment_method: appointment.payment_method || 'Dinheiro',
              category: 'produtos',
              payment_date: new Date().toISOString().slice(0, 10),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (produtosError) {
            logError(produtosError, '❌ Erro ao registrar receita de produtos:');
            throw produtosError;
          }
        }

        return updatedAppointment;
      } catch (error) {
        logError(error, "❌ Erro ao marcar como atendido:");
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
      // Busca todos os agendamentos relacionados com status pendente ou cancelado
      const { data: agendamentos, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', data.client_id)
        .eq('barber_id', data.barber_id)
        .eq('date', data.date)
        .in('status', ['pendente', 'cancelado']);

      if (error) {
        throw error;
      }

      // Atualiza o status de todos os agendamentos encontrados
      if (agendamentos && agendamentos.length > 0) {
        const promises = agendamentos.map((agendamento) => {
          return supabase
            .from('appointments')
            .update({ status: data.status })
            .eq('id', agendamento.id);
        });

        await Promise.all(promises);
      }

      return agendamentos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
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
