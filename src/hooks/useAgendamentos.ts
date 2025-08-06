import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServicos } from "@/hooks/useServicos";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

type Agendamento = Database['public']['Tables']['appointments']['Row'];
type ServicoAgendamento = Database['public']['Tables']['appointment_services']['Row'] & {
  is_gratuito?: boolean; // Flag para identificar serviços gratuitos
};
type ProdutoAgendamento = Database['public']['Tables']['appointment_products']['Row'] & {
  is_gratuito?: boolean; // Flag para identificar produtos gratuitos
};

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

// Tipos para serviços e produtos com campos de comissão
interface ServicoComComissao {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  commission_type?: 'percentual' | 'fixo' | null;
  commission_value?: number | null;
  commission_extra_type?: 'percentual' | 'fixo' | null;
  commission_extra_value?: number | null;
  has_commission?: boolean;
}

interface ProdutoComComissao {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  bonus_type?: 'percentual' | 'fixo' | null;
  bonus_value?: number | null;
  has_commission?: boolean;
}

// Função auxiliar para calcular comissão de um item (serviço ou produto)
function calcularComissaoItem(
  item: ServicoComComissao | ProdutoComComissao,
  valorFinal: number, // Valor após aplicação de benefícios de assinatura
  taxaPadraoBarbeiro: number
): number {
  // Se não tem comissão, retorna 0
  if (item.has_commission === false) {
    return 0;
  }

  // Para produtos (lógica simplificada)
  if ('bonus_type' in item) {
    // Produtos só podem ter bonus (comissão adicional)
    if (item.bonus_type === 'percentual' && item.bonus_value) {
      return valorFinal * (item.bonus_value / 100);
    } else if (item.bonus_type === 'fixo' && item.bonus_value) {
      return item.bonus_value;
    }
    return 0; // Sem bonus
  }

  // Para serviços (lógica original)
  const servico = item as ServicoComComissao;
  let comissaoPrincipal = 0;
  let comissaoAdicional = 0;

  // Calcular comissão principal
  if (servico.commission_type === 'percentual' && servico.commission_value) {
    comissaoPrincipal = valorFinal * (servico.commission_value / 100);
  } else if (servico.commission_type === 'fixo' && servico.commission_value) {
    comissaoPrincipal = servico.commission_value;
  } else {
    // Usar taxa padrão do barbeiro
    comissaoPrincipal = valorFinal * (taxaPadraoBarbeiro / 100);
  }

  // Calcular comissão adicional
  if (servico.commission_extra_type === 'percentual' && servico.commission_extra_value) {
    comissaoAdicional = valorFinal * (servico.commission_extra_value / 100);
  } else if (servico.commission_extra_type === 'fixo' && servico.commission_extra_value) {
    comissaoAdicional = servico.commission_extra_value;
  }

  return comissaoPrincipal + comissaoAdicional;
}

// Função específica para calcular comissão de produtos com regras corretas
function calcularComissaoProdutoBackend(
  produto: ProdutoComComissao,
  quantidade: number,
  precoUnitarioOriginal: number,
  precoUnitarioFinal: number, // Preço após benefícios
  taxaPadraoBarbeiro: number,
  isProdutoGratuito: boolean = false // Flag para identificar produtos gratuitos
): number {
  // Se não tem comissão, retorna 0
  if (produto.has_commission === false) {
    return 0;
  }

  let comissaoTotal = 0;

  if (isProdutoGratuito) {
    // Para produtos gratuitos: comissão apenas nas unidades pagas (após a primeira)
    const unidadesPagas = Math.max(0, quantidade - 1);
    
    if (unidadesPagas > 0) {
      if (produto.bonus_type === 'percentual' && produto.bonus_value) {
        // Comissão percentual sobre o valor das unidades pagas
        comissaoTotal = (precoUnitarioOriginal * unidadesPagas) * (produto.bonus_value / 100);
      } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
        // Comissão fixa por unidade paga
        comissaoTotal = produto.bonus_value * unidadesPagas;
      }
    }
  }
  // Para produtos com desconto: comissão sobre o valor residual de todas as unidades
  else if (precoUnitarioFinal < precoUnitarioOriginal) {
    if (produto.bonus_type === 'percentual' && produto.bonus_value) {
      // Comissão percentual sobre o valor com desconto de todas as unidades
      comissaoTotal = (precoUnitarioFinal * quantidade) * (produto.bonus_value / 100);
    } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
      // Comissão fixa por unidade
      comissaoTotal = produto.bonus_value * quantidade;
    }
  }
  // Para produtos sem benefício: comissão sobre o valor total
  else {
    if (produto.bonus_type === 'percentual' && produto.bonus_value) {
      // Comissão percentual sobre o valor total
      comissaoTotal = (precoUnitarioOriginal * quantidade) * (produto.bonus_value / 100);
    } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
      // Comissão fixa por unidade
      comissaoTotal = produto.bonus_value * quantidade;
    }
  }

  return comissaoTotal;
}

// Função específica para calcular comissão de serviços com regras corretas
function calcularComissaoServicoBackend(
  servico: ServicoComComissao,
  precoOriginal: number,
  precoFinal: number, // Preço após benefícios
  taxaPadraoBarbeiro: number,
  isServicoGratuito: boolean = false // Flag para identificar serviços gratuitos
): number {
  // Se não tem comissão, retorna 0
  if (servico.has_commission === false) {
    return 0;
  }

  // Se o serviço é gratuito, não há comissão
  if (isServicoGratuito) {
    return 0;
  }

  let comissaoPrincipal = 0;
  let comissaoAdicional = 0;

  // Calcular comissão principal
  if (servico.commission_type === 'percentual' && servico.commission_value) {
    comissaoPrincipal = precoFinal * (servico.commission_value / 100);
  } else if (servico.commission_type === 'fixo' && servico.commission_value) {
    comissaoPrincipal = servico.commission_value;
  } else {
    // Usar taxa padrão do barbeiro
    comissaoPrincipal = precoFinal * (taxaPadraoBarbeiro / 100);
  }

  // Calcular comissão adicional
  if (servico.commission_extra_type === 'percentual' && servico.commission_extra_value) {
    comissaoAdicional = precoFinal * (servico.commission_extra_value / 100);
  } else if (servico.commission_extra_type === 'fixo' && servico.commission_extra_value) {
    comissaoAdicional = servico.commission_extra_value;
  }

  return comissaoPrincipal + comissaoAdicional;
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
        .select(`
          *,
          barber:barbers (
            id,
            name,
            active
          )
        `)
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
        appointments?.map(async (agendamento) => {
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
          // Usar a duração total já armazenada no agendamento
          const duracaoTotal = currentAppointment.total_duration || 0;
          const slotsNecessarios = Math.ceil(duracaoTotal / 15);

          // Se precisar de mais de um slot, atualiza todos os slots relacionados
          if (slotsNecessarios > 1) {
            const [hora, minuto] = currentAppointment.time.split(':').map(Number);
            const horariosParaAtualizar = [currentAppointment.time];

            // Adiciona os próximos horários se forem necessários
            for (let i = 1; i < slotsNecessarios; i++) {
              const proximoMinuto = minuto + (i * 15);
              const proximaHora = hora + Math.floor(proximoMinuto / 60);
              const minutoFinal = proximoMinuto % 60;
              
              const proximoHorarioFormatado = `${proximaHora.toString().padStart(2, '0')}:${minutoFinal.toString().padStart(2, '0')}`;
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
      servicos: Omit<ServicoAgendamento, 'id'>[];
      produtos: Omit<ProdutoAgendamento, 'id'>[];
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
            .insert(appointment.servicos.map(servico => {
              // Remover a propriedade is_gratuito antes de salvar no banco
              const { is_gratuito, ...servicoParaSalvar } = servico;
              return {
                ...servicoParaSalvar,
                appointment_id: appointment.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }));

          if (servicesError) {
            logError(servicesError, '❌ Erro ao inserir serviços:');
            throw servicesError;
          }
        }

        // 4. Inserimos os novos produtos
        if (appointment.produtos.length > 0) {
          const { error: productsError } = await supabase
            .from('appointment_products')
            .insert(appointment.produtos.map(produto => {
              // Remover a propriedade is_gratuito antes de salvar no banco
              const { is_gratuito, ...produtoParaSalvar } = produto;
              return {
                ...produtoParaSalvar,
                appointment_id: appointment.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }));

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
        // Calcular duração real do atendimento em minutos
        const [ano, mes, dia] = appointment.date.split('-').map(Number);
        const [hora, minuto] = appointment.time.split(':').map(Number);
        // Meses em JS começam do zero!
        const dataAgendamento = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
        const dataFinalizacao = new Date();
        const diffMs = dataFinalizacao.getTime() - dataAgendamento.getTime();
        const diffMinutos = Math.max(1, Math.round(diffMs / 60000)); // Garante pelo menos 1 minuto

        const totalServiceAmount = appointment.servicos.reduce((sum, service) => sum + service.service_price, 0);
        
        // Calcular valor real dos produtos considerando benefícios
        const totalProductsAmount = appointment.produtos.reduce((sum, produto) => {
          const isProdutoGratuito = produto.is_gratuito === true;
          
          if (isProdutoGratuito) {
            // Para produtos gratuitos: primeira unidade gratuita, demais pelo preço original
            const unidadesPagas = Math.max(0, produto.quantity - 1);
            return sum + (produto.product_price * unidadesPagas);
          } else {
            // Para produtos com desconto ou sem benefício, usar o preço que já vem com benefício aplicado
            return sum + (produto.product_price * produto.quantity);
          }
        }, 0);
        
        const finalPrice = totalServiceAmount + totalProductsAmount;

        // 6. Atualizamos o agendamento com os valores finais
        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'atendido',
            total_duration: diffMinutos,
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

        // 7. Buscamos as informações do barbeiro e calculamos comissões
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('commission_rate')
          .eq('id', appointment.barber_id)
          .single();

        if (barberError) {
          logError(barberError, '❌ Erro ao buscar informações do barbeiro para comissão:');
          // Continuar mesmo se não conseguir buscar o barbeiro, a comissão será 0
        }

        const commissionRate = barber?.commission_rate ?? 0; // Usar 0 se null ou undefined

        // Buscar informações completas dos serviços e produtos para cálculo de comissão
        const servicosIds = appointment.servicos.map(s => s.service_id);
        const produtosIds = appointment.produtos.map(p => p.product_id);

        // Buscar serviços com informações de comissão
        const { data: servicosComComissao, error: servicosError } = await supabase
          .from('services')
          .select('*')
          .in('id', servicosIds);

        if (servicosError) {
          logError(servicosError, '❌ Erro ao buscar informações de comissão dos serviços:');
          throw servicosError;
        }

        // Buscar produtos com informações de comissão
        const { data: produtosComComissao, error: produtosError } = await supabase
          .from('products')
          .select('*')
          .in('id', produtosIds);

        if (produtosError) {
          logError(produtosError, '❌ Erro ao buscar informações de comissão dos produtos:');
          throw produtosError;
        }

        // Calcular comissões para cada serviço
        let totalComissao = 0;
        
        for (const servicoAgendamento of appointment.servicos) {
          const servicoInfo = servicosComComissao?.find(s => s.id === servicoAgendamento.service_id);
          if (servicoInfo) {
            const isServicoGratuito = servicoAgendamento.is_gratuito === true;
            const comissaoServico = calcularComissaoServicoBackend(
              servicoInfo,
              servicoInfo.price, // Preço original do serviço
              servicoAgendamento.service_price, // Preço final após benefícios
              commissionRate,
              isServicoGratuito
            );
            totalComissao += comissaoServico;
          }
        }

        // Calcular comissões para cada produto
        for (const produtoAgendamento of appointment.produtos) {
          const produtoInfo = produtosComComissao?.find(p => p.id === produtoAgendamento.product_id);
          if (produtoInfo) {
            // Usar a flag is_gratuito enviada pelo frontend
            const isProdutoGratuito = produtoAgendamento.is_gratuito === true;
            
            if (isProdutoGratuito) {
              // Para produtos gratuitos, usar o preço original do produto para cálculo de comissão
              const comissaoProduto = calcularComissaoProdutoBackend(
                produtoInfo,
                produtoAgendamento.quantity,
                produtoInfo.price, // Preço original do produto
                0, // Preço final (gratuito)
                commissionRate,
                true // isProdutoGratuito
              );
              totalComissao += comissaoProduto;
            } else {
              // Para produtos com preço, usar o preço que já vem com benefício aplicado
              const comissaoProduto = calcularComissaoProdutoBackend(
                produtoInfo,
                produtoAgendamento.quantity,
                produtoInfo.price, // Preço original do produto
                produtoAgendamento.product_price, // Preço final após benefícios
                commissionRate,
                false // isProdutoGratuito
              );
              totalComissao += comissaoProduto;
            }
          }
        }

        // 8. Verificamos se já existe uma comissão para este agendamento
        const { data: existingCommission, error: searchError } = await supabase
          .from('barber_commissions')
          .select()
          .eq('appointment_id', appointment.id)
          .single();

        if (searchError && searchError.code !== 'PGRST116') { // PGRST116 é o código para "não encontrado"
          logError(searchError, '❌ Erro ao buscar comissão existente:');
          throw searchError;
        }

        if (totalComissao > 0) {
          if (existingCommission) {
            // Atualiza a comissão existente
            const { error: updateError } = await supabase
              .from('barber_commissions')
              .update({
                total_price: finalPrice, // Valor total real (serviços + produtos após benefícios)
                total_commission: totalComissao,
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
                total_price: finalPrice, // Valor total real (serviços + produtos após benefícios)
                total_commission: totalComissao,
                status: 'pendente',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (commissionError) {
              logError(commissionError, '❌ Erro ao registrar comissão:');
              throw commissionError;
            }
          }
        } else {
          // Se não há comissão (totalComissao = 0), removemos o registro existente se houver
          if (existingCommission) {
            const { error: deleteError } = await supabase
              .from('barber_commissions')
              .delete()
              .eq('id', existingCommission.id);

            if (deleteError) {
              logError(deleteError, '❌ Erro ao deletar comissão existente:');
              throw deleteError;
            }
          }
        }

        // 9. Removemos transações existentes para este agendamento (se houver)
        const { error: deleteTransactionsError } = await supabase
          .from('transactions')
          .delete()
          .eq('appointment_id', appointment.id);

        if (deleteTransactionsError) {
          logError(deleteTransactionsError, '❌ Erro ao deletar transações existentes:');
          throw deleteTransactionsError;
        }

        // 10. Lançamos a receita dos serviços
        if (totalServiceAmount > 0) {
          const { error: receitaError } = await supabase
            .from('transactions')
            .insert({
              appointment_id: appointment.id,
              type: 'receita',
              value: totalServiceAmount,
              description: `${appointment.servicos.map(s => s.service_name).join(', ')}`,
              payment_method: appointment.payment_method || 'Dinheiro',
              category: 'servicos',
              payment_date: appointment.date,
              barber_shop_id: appointment.barber_shop_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (receitaError) {
            logError(receitaError, '❌ Erro ao registrar receita de serviços:');
            throw receitaError;
          }
        }

        // 11. Se houver produtos, lançamos a receita
        if (totalProductsAmount > 0) {
          const { error: produtosError } = await supabase
            .from('transactions')
            .insert({
              appointment_id: appointment.id,
              type: 'receita',
              value: totalProductsAmount,
              description: `${appointment.produtos.map(p => `(${p.quantity}x) ${p.product_name}`).join(', ')}`,
              payment_method: appointment.payment_method || 'Dinheiro',
              category: 'produtos',
              payment_date: appointment.date,
              barber_shop_id: appointment.barber_shop_id,
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
