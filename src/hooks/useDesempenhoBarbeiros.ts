import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { logError } from "@/utils/logger";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, getDaysInMonth } from "date-fns";

interface ServicoDetalhe {
  service_name: string;
  quantidade: number;
  valor_total: number;
}

interface ProdutoDetalhe {
  product_name: string;
  quantidade: number;
  valor_total: number;
}

interface DesempenhoBarbeiro {
  barber_id: string;
  barber_name: string;
  total_servicos: number;
  total_produtos: number;
  valor_servicos: number;
  valor_produtos: number;
  valor_total: number;
  agendamentos_atendidos: number;
  servicos_detalhes: ServicoDetalhe[];
  produtos_detalhes: ProdutoDetalhe[];
}

interface DesempenhoBarbeirosData {
  semana: DesempenhoBarbeiro[];
  quinzena: DesempenhoBarbeiro[];
  mes: DesempenhoBarbeiro[];
}

export function useDesempenhoBarbeiros() {
  const { selectedBarberShop } = useBarberShopContext();
  const today = new Date();

  // Funções para calcular períodos com offset
  function getSemanaComOffset(offset: number) {
    const base = new Date(today);
    base.setDate(base.getDate() + offset * 7);
    const inicio = startOfWeek(base, { weekStartsOn: 1 });
    const fim = endOfWeek(base, { weekStartsOn: 1 });
    return { inicio, fim };
  }

  function getMesComOffset(offset: number) {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const inicio = startOfMonth(base);
    const fim = endOfMonth(base);
    return { inicio, fim };
  }

  function getQuinzenaComOffset(offset: number) {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let quinzenaBase = 0;
    if (base.getDate() > 15) quinzenaBase = 1;
    let totalOffset = quinzenaBase + offset;
    let ano = base.getFullYear();
    let mes = base.getMonth();
    while (totalOffset < 0) {
      mes--;
      if (mes < 0) {
        mes = 11;
        ano--;
      }
      totalOffset += 2;
    }
    while (totalOffset > 1) {
      mes++;
      if (mes > 11) {
        mes = 0;
        ano++;
      }
      totalOffset -= 2;
    }
    const diasNoMes = getDaysInMonth(new Date(ano, mes));
    if (totalOffset === 0) {
      return {
        inicio: new Date(ano, mes, 1),
        fim: new Date(ano, mes, 15),
      };
    } else {
      return {
        inicio: new Date(ano, mes, 16),
        fim: new Date(ano, mes, diasNoMes),
      };
    }
  }

  const fetchDesempenhoBarbeiros = async (inicio: Date, fim: Date): Promise<DesempenhoBarbeiro[]> => {
    if (!selectedBarberShop?.id) {
      throw new Error('Barbearia não selecionada');
    }

    const inicioStr = format(inicio, 'yyyy-MM-dd');
    const fimStr = format(fim, 'yyyy-MM-dd');

    // Buscar agendamentos atendidos no período
    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('appointments')
      .select(`
        id,
        barber_id,
        barber_name,
        final_price,
        total_price,
        total_products_price
      `)
      .eq('barber_shop_id', selectedBarberShop.id)
      .eq('status', 'atendido')
      .gte('date', inicioStr)
      .lte('date', fimStr);

    if (agendamentosError) {
      logError(agendamentosError, 'Erro ao buscar agendamentos para desempenho dos barbeiros:');
      throw agendamentosError;
    }

    if (!agendamentos || agendamentos.length === 0) {
      return [];
    }

    // Buscar serviços e produtos para todos os agendamentos
    const appointmentIds = agendamentos.map(a => a.id);

    const { data: servicos, error: servicosError } = await supabase
      .from('appointment_services')
      .select('*')
      .in('appointment_id', appointmentIds);

    if (servicosError) {
      logError(servicosError, 'Erro ao buscar serviços dos agendamentos:');
      throw servicosError;
    }

    const { data: produtos, error: produtosError } = await supabase
      .from('appointment_products')
      .select('*')
      .in('appointment_id', appointmentIds);

    if (produtosError) {
      logError(produtosError, 'Erro ao buscar produtos dos agendamentos:');
      throw produtosError;
    }

    // Agrupar dados por barbeiro
    const desempenhoPorBarbeiro = new Map<string, DesempenhoBarbeiro>();

    agendamentos.forEach(agendamento => {
      const barberId = agendamento.barber_id;
      
      if (!desempenhoPorBarbeiro.has(barberId)) {
        desempenhoPorBarbeiro.set(barberId, {
          barber_id: barberId,
          barber_name: agendamento.barber_name,
          total_servicos: 0,
          total_produtos: 0,
          valor_servicos: 0,
          valor_produtos: 0,
          valor_total: 0,
          agendamentos_atendidos: 0,
          servicos_detalhes: [],
          produtos_detalhes: []
        });
      }

      const desempenho = desempenhoPorBarbeiro.get(barberId)!;
      desempenho.agendamentos_atendidos += 1;
      desempenho.valor_total += agendamento.final_price || 0;
      desempenho.valor_servicos += agendamento.total_price || 0;
      desempenho.valor_produtos += agendamento.total_products_price || 0;

      // Contar serviços deste agendamento
      const servicosAgendamento = servicos?.filter(s => s.appointment_id === agendamento.id) || [];
      desempenho.total_servicos += servicosAgendamento.length;

      // Contar produtos deste agendamento
      const produtosAgendamento = produtos?.filter(p => p.appointment_id === agendamento.id) || [];
      desempenho.total_produtos += produtosAgendamento.reduce((sum, p) => sum + p.quantity, 0);
    });

    // Agora vamos processar os detalhes dos serviços e produtos por barbeiro
    for (const [barberId, desempenho] of desempenhoPorBarbeiro) {
      const agendamentosBarbeiro = agendamentos.filter(a => a.barber_id === barberId);
      const appointmentIdsBarbeiro = agendamentosBarbeiro.map(a => a.id);

      // Processar detalhes dos serviços
      const servicosBarbeiro = servicos?.filter(s => appointmentIdsBarbeiro.includes(s.appointment_id)) || [];
      const servicosPorNome = new Map<string, ServicoDetalhe>();
      
      servicosBarbeiro.forEach(servico => {
        const nome = servico.service_name;
        if (!servicosPorNome.has(nome)) {
          servicosPorNome.set(nome, {
            service_name: nome,
            quantidade: 0,
            valor_total: 0
          });
        }
        const detalhe = servicosPorNome.get(nome)!;
        detalhe.quantidade += 1;
        detalhe.valor_total += servico.service_price;
      });
      
      desempenho.servicos_detalhes = Array.from(servicosPorNome.values())
        .sort((a, b) => b.valor_total - a.valor_total);

      // Processar detalhes dos produtos
      const produtosBarbeiro = produtos?.filter(p => appointmentIdsBarbeiro.includes(p.appointment_id)) || [];
      const produtosPorNome = new Map<string, ProdutoDetalhe>();
      
      produtosBarbeiro.forEach(produto => {
        const nome = produto.product_name;
        if (!produtosPorNome.has(nome)) {
          produtosPorNome.set(nome, {
            product_name: nome,
            quantidade: 0,
            valor_total: 0
          });
        }
        const detalhe = produtosPorNome.get(nome)!;
        detalhe.quantidade += produto.quantity;
        detalhe.valor_total += produto.product_price * produto.quantity;
      });
      
      desempenho.produtos_detalhes = Array.from(produtosPorNome.values())
        .sort((a, b) => b.valor_total - a.valor_total);
    }

    // Converter para array e ordenar por valor total
    return Array.from(desempenhoPorBarbeiro.values())
      .sort((a, b) => b.valor_total - a.valor_total);
  };

  const { data: desempenhoSemana, isLoading: isLoadingSemana } = useQuery({
    queryKey: ['desempenho-barbeiros', 'semana', selectedBarberShop?.id, getSemanaComOffset(0).inicio, getSemanaComOffset(0).fim],
    queryFn: () => fetchDesempenhoBarbeiros(getSemanaComOffset(0).inicio, getSemanaComOffset(0).fim),
    enabled: !!selectedBarberShop?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const { data: desempenhoQuinzena, isLoading: isLoadingQuinzena } = useQuery({
    queryKey: ['desempenho-barbeiros', 'quinzena', selectedBarberShop?.id, getQuinzenaComOffset(0).inicio, getQuinzenaComOffset(0).fim],
    queryFn: () => fetchDesempenhoBarbeiros(getQuinzenaComOffset(0).inicio, getQuinzenaComOffset(0).fim),
    enabled: !!selectedBarberShop?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const { data: desempenhoMes, isLoading: isLoadingMes } = useQuery({
    queryKey: ['desempenho-barbeiros', 'mes', selectedBarberShop?.id, getMesComOffset(0).inicio, getMesComOffset(0).fim],
    queryFn: () => fetchDesempenhoBarbeiros(getMesComOffset(0).inicio, getMesComOffset(0).fim),
    enabled: !!selectedBarberShop?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    desempenhoSemana: desempenhoSemana || [],
    desempenhoQuinzena: desempenhoQuinzena || [],
    desempenhoMes: desempenhoMes || [],
    isLoading: isLoadingSemana || isLoadingQuinzena || isLoadingMes,
    fetchDesempenhoBarbeiros,
    getSemanaComOffset,
    getMesComOffset,
    getQuinzenaComOffset
  };
} 