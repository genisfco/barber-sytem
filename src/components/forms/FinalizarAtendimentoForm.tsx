import React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useServicos } from "@/hooks/useServicos";
import { useProdutos } from "@/hooks/useProdutos";
import { useAssinaturaCliente } from "@/hooks/useAssinaturas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Agendamento } from "@/types/agendamento";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Crown, Gift, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useBarbers } from "@/hooks/useBarbers";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import type { Servico } from "@/types/servico";
import type { Produto } from "@/types/produto";

type PaymentMethod = "Dinheiro" | "Cartão_Crédito" | "Cartão_Débito" | "PIX";

const formSchema = z.object({
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  produtos: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1, "A quantidade deve ser maior que zero")
  })),
  payment_method: z.string().optional(),
});

interface FinalizarAtendimentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento;
}

export function FinalizarAtendimentoForm({
  open,
  onOpenChange,
  agendamento
}: FinalizarAtendimentoFormProps) {
  const { toast } = useToast();
  const { marcarComoAtendido } = useAgendamentos();
  const { servicos } = useServicos();
  const { produtos } = useProdutos();
  const { data: assinaturaCliente } = useAssinaturaCliente(agendamento.client_id);
  const [total, setTotal] = useState(0);
  const [totalOriginal, setTotalOriginal] = useState(0);
  const [descontoAssinatura, setDescontoAssinatura] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [alertaLimiteBeneficio, setAlertaLimiteBeneficio] = useState<{
    max: number;
    usados: number;
    tentandoUsar: number;
  } | null>(null);

  const [resumoComissao, setResumoComissao] = useState<{descricao: string, valor: number}[]>([]);
  const [totalComissao, setTotalComissao] = useState(0);

  const { barbers } = useBarbers();

  // Verificar se a assinatura é válida para o dia da semana do agendamento
  const isAssinaturaValidaParaData = () => {
    if (!assinaturaCliente || !assinaturaCliente.subscription_plans.available_days) {
      return false;
    }

    // Criar a data de forma mais robusta, evitando problemas de fuso horário
    const [ano, mes, dia] = agendamento.date.split('-').map(Number);
    const dataAgendamento = new Date(ano, mes - 1, dia); // mes - 1 porque getMonth() retorna 0-11
    const diaSemana = getDay(dataAgendamento); // 0 = Domingo, 1 = Segunda, etc.
    
    return assinaturaCliente.subscription_plans.available_days.includes(diaSemana);
  };

  const assinaturaValida = isAssinaturaValidaParaData();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      servicos: agendamento.servicos.map(s => s.service_id),
      produtos: agendamento.produtos.map(p => ({
        id: p.product_id,
        quantity: p.quantity
      })),
      payment_method: "Dinheiro" as PaymentMethod
    }
  });

  // Efeito para calcular o total inicial
  useEffect(() => {
    calcularTotal();
  }, [assinaturaCliente]);

  const calcularTotal = () => {
    const servicosSelecionados = form.getValues("servicos");
    const produtosSelecionados = form.getValues("produtos");

    let totalServicos = 0;
    let totalProdutos = 0;
    let descontoTotal = 0;

    // Calcular total de serviços com benefícios de assinatura
    servicosSelecionados.forEach(servicoId => {
      const servico = servicos?.find(s => s.id === servicoId) as Servico | undefined;
      if (!servico) return;

      const precoOriginal = servico.price;
      let precoFinal = precoOriginal;

      // Verificar se há benefício de assinatura para este serviço E se a assinatura é válida para a data
      if (assinaturaCliente && assinaturaValida) {
        const beneficioServico = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
          b => b.service_id === servicoId
        );

        if (beneficioServico) {
          const tipoBeneficio = beneficioServico.benefit_types.name;
          
          if (tipoBeneficio === 'servico_gratuito') {
            precoFinal = 0; // Serviço gratuito
            descontoTotal += precoOriginal;
          } else if (tipoBeneficio === 'servico_desconto' && beneficioServico.discount_percentage) {
            const desconto = (precoOriginal * beneficioServico.discount_percentage) / 100;
            precoFinal = precoOriginal - desconto;
            descontoTotal += desconto;
          }
        }
      }

      totalServicos += precoFinal;
    });

    // Calcular total de produtos com benefícios de assinatura
    produtosSelecionados.forEach(produto => {
      const produtoInfo = produtos?.find(p => p.id === produto.id) as Produto | undefined;
      if (!produtoInfo) return;

      const precoOriginal = produtoInfo.price * produto.quantity;
      let precoFinal = precoOriginal;

      // Verificar se há benefício de assinatura para este produto E se a assinatura é válida para a data
      if (assinaturaCliente && assinaturaValida) {
        const beneficioProduto = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
          b => b.product_id === produto.id
        );

        if (beneficioProduto) {
          const tipoBeneficio = beneficioProduto.benefit_types.name;
          
          if (tipoBeneficio === 'produto_gratuito') {
            // Para produtos gratuitos: primeira unidade gratuita, demais pelo preço normal
            const unidadesGratuitas = 1;
            const unidadesPagas = Math.max(0, produto.quantity - unidadesGratuitas);
            precoFinal = produtoInfo.price * unidadesPagas;
            descontoTotal += produtoInfo.price * unidadesGratuitas;
          } else if (tipoBeneficio === 'produto_desconto' && beneficioProduto.discount_percentage) {
            const desconto = (precoOriginal * beneficioProduto.discount_percentage) / 100;
            precoFinal = precoOriginal - desconto;
            descontoTotal += desconto;
          }
        }
      }

      totalProdutos += precoFinal;
    });

    const totalComDesconto = totalServicos + totalProdutos;
    const totalSemDesconto = servicosSelecionados.reduce((sum, servicoId) => {
      const servico = servicos?.find(s => s.id === servicoId);
      return sum + (servico?.price || 0);
    }, 0) + produtosSelecionados.reduce((sum, produto) => {
      const produtoInfo = produtos?.find(p => p.id === produto.id);
      return sum + ((produtoInfo?.price || 0) * produto.quantity);
    }, 0);

    setTotal(totalComDesconto);
    setTotalOriginal(totalSemDesconto);
    setDescontoAssinatura(descontoTotal);
  };

  // Função para verificar se um serviço tem benefício de assinatura
  const getBeneficioServico = (servicoId: string) => {
    if (!assinaturaCliente || !assinaturaValida) return null;
    
    return assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
      b => b.service_id === servicoId
    );
  };

  // Função para verificar se um produto tem benefício de assinatura
  const getBeneficioProduto = (produtoId: string) => {
    if (!assinaturaCliente || !assinaturaValida) return null;
    
    return assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
      b => b.product_id === produtoId
    );
  };

  // Função para verificar se um produto é gratuito
  const isProdutoGratuito = (produtoId: string) => {
    const beneficio = getBeneficioProduto(produtoId);
    return beneficio?.benefit_types.name === 'produto_gratuito';
  };

  // Função para verificar se um produto tem desconto
  const isProdutoComDesconto = (produtoId: string) => {
    const beneficio = getBeneficioProduto(produtoId);
    return beneficio?.benefit_types.name === 'produto_desconto';
  };

  // Função para calcular o preço com benefício
  const calcularPrecoComBeneficio = (precoOriginal: number, beneficio: any) => {
    if (!beneficio) return precoOriginal;

    const tipoBeneficio = beneficio.benefit_types.name;
    
    if (tipoBeneficio === 'servico_gratuito' || tipoBeneficio === 'produto_gratuito') {
      return 0;
    } else if (tipoBeneficio === 'servico_desconto' || tipoBeneficio === 'produto_desconto') {
      if (beneficio.discount_percentage) {
        return precoOriginal - (precoOriginal * beneficio.discount_percentage / 100);
      }
    }
    
    return precoOriginal;
  };

  // Função para calcular o preço de produtos com benefício considerando quantidade
  const calcularPrecoProdutoComBeneficio = (precoUnitario: number, quantidade: number, beneficio: any) => {
    if (!beneficio) return precoUnitario * quantidade;

    const tipoBeneficio = beneficio.benefit_types.name;
    
    if (tipoBeneficio === 'produto_gratuito') {
      // Primeira unidade gratuita, demais pelo preço normal
      const unidadesGratuitas = 1;
      const unidadesPagas = Math.max(0, quantidade - unidadesGratuitas);
      return precoUnitario * unidadesPagas;
    } else if (tipoBeneficio === 'produto_desconto' && beneficio.discount_percentage) {
      const precoComDesconto = precoUnitario - (precoUnitario * beneficio.discount_percentage / 100);
      return precoComDesconto * quantidade;
    }
    
    return precoUnitario * quantidade;
  };

  // Função para obter o nome do dia da semana
  const getNomeDiaSemana = (data: string) => {
    // Criar a data de forma mais robusta, evitando problemas de fuso horário
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia); // mes - 1 porque getMonth() retorna 0-11
    return format(dataObj, 'EEEE', { locale: ptBR });
  };

  // Função para obter os nomes dos dias permitidos
  const getDiasPermitidos = () => {
    if (!assinaturaCliente?.subscription_plans.available_days) return [];
    
    const nomesDias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return assinaturaCliente.subscription_plans.available_days.map(dia => nomesDias[dia]);
  };

  // Função para obter o último dia do mês
  function getUltimoDiaDoMes(ano: string, mes: string) {
    // Meses no JS são 0-11, então subtrai 1
    return new Date(Number(ano), Number(mes), 0).getDate();
  }

  // Função utilitária para checar o limite de benefícios usados no mês
  async function checarLimiteBeneficiosNoMes(client_subscription_id: string, dataAtendimento: string) {
    const [ano, mes] = dataAtendimento.split('-');
    const ultimoDia = getUltimoDiaDoMes(ano, mes);
    const inicioMes = `${ano}-${mes}-01`;
    const fimMes = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('subscription_benefits_usage')
      .select('id')
      .eq('client_subscription_id', client_subscription_id)
      .gte('created_at', inicioMes)
      .lte('created_at', fimMes);

    if (error) throw error;
    return data.length;
  }

  // Função auxiliar para calcular comissão de um item (igual backend)
  function calcularComissaoItem(
    item,
    valorFinal, // Valor após benefício
    taxaPadraoBarbeiro
  ) {
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
    const servico = item;
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
  function calcularComissaoProduto(
    produto: Produto,
    quantidade: number,
    beneficio: any,
    taxaPadraoBarbeiro: number
  ) {
    // Se não tem comissão, retorna 0
    if (produto.has_commission === false) {
      return 0;
    }

    let comissaoTotal = 0;

    // Para produtos gratuitos: comissão apenas nas unidades pagas (após a primeira)
    if (beneficio && beneficio.benefit_types.name === 'produto_gratuito') {
      const unidadesPagas = Math.max(0, quantidade - 1);
      
      if (unidadesPagas > 0) {
        if (produto.bonus_type === 'percentual' && produto.bonus_value) {
          // Comissão percentual sobre o valor das unidades pagas
          comissaoTotal = (produto.price * unidadesPagas) * (produto.bonus_value / 100);
        } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
          // Comissão fixa por unidade paga
          comissaoTotal = produto.bonus_value * unidadesPagas;
        }
      }
    }
    // Para produtos com desconto: comissão sobre o valor residual de todas as unidades
    else if (beneficio && beneficio.benefit_types.name === 'produto_desconto' && beneficio.discount_percentage) {
      const precoComDesconto = produto.price - (produto.price * beneficio.discount_percentage / 100);
      
      if (produto.bonus_type === 'percentual' && produto.bonus_value) {
        // Comissão percentual sobre o valor com desconto de todas as unidades
        comissaoTotal = (precoComDesconto * quantidade) * (produto.bonus_value / 100);
      } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
        // Comissão fixa por unidade
        comissaoTotal = produto.bonus_value * quantidade;
      }
    }
    // Para produtos sem benefício: comissão sobre o valor total
    else {
      if (produto.bonus_type === 'percentual' && produto.bonus_value) {
        // Comissão percentual sobre o valor total
        comissaoTotal = (produto.price * quantidade) * (produto.bonus_value / 100);
      } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
        // Comissão fixa por unidade
        comissaoTotal = produto.bonus_value * quantidade;
      }
    }

    return comissaoTotal;
  }

  // Função específica para calcular comissão de serviços com regras corretas
  function calcularComissaoServico(
    servico: Servico,
    beneficio: any,
    taxaPadraoBarbeiro: number
  ): number {
    // Se não tem comissão, retorna 0
    if (servico.has_commission === false) {
      return 0;
    }

    // Se o serviço é gratuito, não há comissão
    if (beneficio && beneficio.benefit_types.name === 'servico_gratuito') {
      return 0;
    }

    // Calcular preço final com benefício aplicado
    let precoFinal = servico.price;
    if (beneficio) {
      if (beneficio.benefit_types.name === 'servico_desconto' && beneficio.discount_percentage) {
        precoFinal = precoFinal - (precoFinal * beneficio.discount_percentage / 100);
      }
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

  // Calcular comissão sempre que serviços/produtos mudarem
  useEffect(() => {
    if (!servicos || !produtos || !barbers) return;
    const servicosSelecionados = form.getValues("servicos");
    const produtosSelecionados = form.getValues("produtos");
    let resumo: {descricao: string, valor: number}[] = [];
    let total = 0;
    // Buscar taxa padrão do barbeiro do agendamento
    const barbeiro = barbers.find(b => b.id === agendamento.barber_id);
    const taxaPadrao = barbeiro?.commission_rate || 0;
    // Serviços
    servicosSelecionados.forEach(servicoId => {
      const servico = servicos.find(s => s.id === servicoId) as Servico | undefined;
      if (!servico) return;
      const beneficio = getBeneficioServico(servicoId);
      const valorComissao = calcularComissaoServico(servico, beneficio, taxaPadrao);
      total += valorComissao;
      
      let tipo = 'Padrão';
      if (servico.has_commission === false) {
        tipo = 'Sem comissão';
      } else if (beneficio && beneficio.benefit_types.name === 'servico_gratuito') {
        tipo = 'Sem comissão (serviço gratuito)';
      } else if (servico.commission_type) {
        tipo = servico.commission_type === 'percentual' ? `${servico.commission_value}%` : `R$ ${servico.commission_value}`;
        if (beneficio && beneficio.benefit_types.name === 'servico_desconto') {
          tipo += ' (com desconto)';
        }
        // Só adicionar comissão extra se o serviço não for gratuito
        if (servico.commission_extra_type) {
          tipo += servico.commission_extra_type === 'percentual' ? ` + ${servico.commission_extra_value}%` : ` + R$ ${servico.commission_extra_value}`;
        }
      }
      resumo.push({descricao: `Serviço: ${servico.name} (${tipo})`, valor: valorComissao});
    });
    // Produtos
    produtosSelecionados.forEach(produtoSel => {
      const produto = produtos.find(p => p.id === produtoSel.id) as Produto | undefined;
      if (!produto) return;
      const beneficio = getBeneficioProduto(produto.id);
      const precoFinal = calcularPrecoProdutoComBeneficio(produto.price, produtoSel.quantity, beneficio);
      const valorComissaoProduto = calcularComissaoProduto(produto, produtoSel.quantity, beneficio, taxaPadrao);
      total += valorComissaoProduto;
      let tipo = 'Sem bonus';
      if (produto.has_commission === false) {
        tipo = 'Sem comissão';
      } else if (produto.bonus_type) {
        if (beneficio && beneficio.benefit_types.name === 'produto_gratuito') {
          const unidadesPagas = Math.max(0, produtoSel.quantity - 1);
          tipo = produto.bonus_type === 'percentual' 
            ? `Bonus: ${produto.bonus_value}% (${unidadesPagas} unid. pagas)` 
            : `Bonus: R$ ${produto.bonus_value} (${unidadesPagas} unid. pagas)`;
        } else if (beneficio && beneficio.benefit_types.name === 'produto_desconto') {
          tipo = produto.bonus_type === 'percentual' 
            ? `Bonus: ${produto.bonus_value}% (${produtoSel.quantity} unid. com desconto)` 
            : `Bonus: R$ ${produto.bonus_value} (${produtoSel.quantity} unid.)`;
        } else {
          tipo = produto.bonus_type === 'percentual' 
            ? `Bonus: ${produto.bonus_value}% (${produtoSel.quantity} unid.)` 
            : `Bonus: R$ ${produto.bonus_value} (${produtoSel.quantity} unid.)`;
        }
      }
      resumo.push({descricao: `Produto: ${produto.name} (${tipo})`, valor: valorComissaoProduto});
    });
    setResumoComissao(resumo);
    setTotalComissao(total);
  }, [form.watch('servicos'), form.watch('produtos'), servicos, produtos, assinaturaCliente, assinaturaValida, barbers]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (servicos === undefined || produtos === undefined) {
        throw new Error("Dados de serviços ou produtos ainda não carregados completamente.");
      }
      if (total > 0 && !values.payment_method) {
        throw new Error("Selecione a forma de pagamento.");
      }

      // Atualiza o agendamento com os serviços e produtos selecionados
      const servicosSelecionados = values.servicos.map(servicoId => {
        const servico = servicos.find(s => s.id === servicoId) as Servico | undefined;
        if (!servico) {
          throw new Error(`Serviço não encontrado: ${servicoId}`);
        }
        const beneficio = getBeneficioServico(servicoId);
        const isServicoGratuito = beneficio && beneficio.benefit_types.name === 'servico_gratuito';
        const precoFinal = calcularPrecoComBeneficio(servico.price, beneficio);
        return {
          appointment_id: agendamento.id,
          service_id: servicoId,
          service_name: servico.name,
          service_price: precoFinal, // Preço com benefício aplicado
          service_duration: servico.duration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Adicionar flag is_gratuito como propriedade adicional (não será salva no banco)
          is_gratuito: isServicoGratuito
        };
      });
      const produtosSelecionados = values.produtos.map(produto => {
        const produtoInfo = produtos.find(p => p.id === produto.id) as Produto | undefined;
        if (!produtoInfo) {
          throw new Error(`Produto não encontrado: ${produto.id}`);
        }
        const beneficio = getBeneficioProduto(produto.id);
        const isProdutoGratuito = beneficio && beneficio.benefit_types.name === 'produto_gratuito';
        
        // Para produtos gratuitos, armazenamos o preço unitário original
        // Para produtos com desconto, armazenamos o preço com desconto aplicado
        const precoUnitarioFinal = isProdutoGratuito 
          ? produtoInfo.price 
          : calcularPrecoComBeneficio(produtoInfo.price, beneficio);
        
        return {
          appointment_id: agendamento.id,
          product_id: produto.id,
          product_name: produtoInfo.name,
          product_price: precoUnitarioFinal, // Preço unitário (benefício será aplicado no backend)
          quantity: produto.quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Adicionar flag is_gratuito como propriedade adicional (não será salva no banco)
          is_gratuito: isProdutoGratuito
        };
      });
      const totalDuration = servicosSelecionados.reduce((sum, servico) => {
        const servicoInfo = servicos?.find(s => s.id === servico.service_id);
        return sum + (servicoInfo?.duration || 0);
      }, 0);
      const agendamentoAtualizado = {
        ...agendamento,
        servicos: servicosSelecionados,
        produtos: produtosSelecionados,
        payment_method: values.payment_method,
        total_duration: totalDuration,
        total_price: total,
        final_price: total,
        status: "atendido" as const,
        updated_at: new Date().toISOString(),
        payment_date: new Date().toISOString().slice(0, 10),
      };
      // Marca como atendido e lança os valores no financeiro
      await marcarComoAtendido.mutateAsync(agendamentoAtualizado);

      // Registro dos usos de benefícios na tabela subscription_benefits_usage
      if (assinaturaCliente && assinaturaValida) {
        const client_subscription_id = assinaturaCliente.id;
        const appointment_id = agendamento.id;
        // Serviços com benefício
        for (const servicoId of values.servicos) {
          const beneficio = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
            b => b.service_id === servicoId
          );
          if (beneficio) {
            const servico = servicos.find(s => s.id === servicoId) as Servico | undefined;
            const original_price = servico.price;
            const final_price = calcularPrecoComBeneficio(servico.price, beneficio);
            const discount_applied = original_price - final_price;
            await supabase.from('subscription_benefits_usage').insert({
              client_subscription_id,
              appointment_id,
              subscription_plan_benefit_id: beneficio.id,
              original_price,
              final_price,
              discount_applied,
              created_at: new Date().toISOString()
            });
          }
        }
        // Produtos com benefício
        for (const produto of values.produtos) {
          const beneficio = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
            b => b.product_id === produto.id
          );
          if (beneficio) {
            const produtoInfo = produtos.find(p => p.id === produto.id) as Produto | undefined;
            const original_price = produtoInfo.price;
            const final_price = calcularPrecoProdutoComBeneficio(produtoInfo.price, produto.quantity, beneficio);
            const discount_applied = (original_price * produto.quantity) - final_price;
            await supabase.from('subscription_benefits_usage').insert({
              client_subscription_id,
              appointment_id,
              subscription_plan_benefit_id: beneficio.id,
              original_price: original_price * produto.quantity,
              final_price,
              discount_applied,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      toast({
        variant: "success",
        title: "Atendimento finalizado!",
        description: `Atendimento do cliente ${agendamento.client_name} finalizado com sucesso.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao finalizar atendimento",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao tentar finalizar o atendimento. Tente novamente.",
      });
    }
  }

  const handleFinalizarClick = async () => {
    if (assinaturaCliente && assinaturaValida) {
      const client_subscription_id = assinaturaCliente.id;
      const max_benefits_per_month = assinaturaCliente.subscription_plans.max_benefits_per_month;
      const dataAtendimento = agendamento.date;
      let usosNoAtendimento = 0;
      // Pega os valores atuais do formulário
      const servicosSelecionados = form.getValues("servicos");
      const produtosSelecionados = form.getValues("produtos");
      servicosSelecionados.forEach(servicoId => {
        const beneficio = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
          b => b.service_id === servicoId
        );
        if (beneficio) usosNoAtendimento += 1;
      });
      produtosSelecionados.forEach(produto => {
        const beneficio = assinaturaCliente.subscription_plans.subscription_plan_benefits.find(
          b => b.product_id === (produto.id || produto)
        );
        if (beneficio) usosNoAtendimento += 1;
      });
      const usosNoMes = await checarLimiteBeneficiosNoMes(client_subscription_id, dataAtendimento);
      if (
        max_benefits_per_month > 0 &&
        (usosNoMes + usosNoAtendimento) > max_benefits_per_month
      ) {
        setAlertaLimiteBeneficio({
          max: max_benefits_per_month,
          usados: usosNoMes,
          tentandoUsar: usosNoAtendimento,
        });
        return;
      }
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmFinalizar = () => {
    setConfirmDialogOpen(false);
    onOpenChange(false);
    form.handleSubmit(onSubmit)();
  };

  const handleCancelFinalizar = () => {
    setConfirmDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[102vh] overflow-y-auto bg-secondary">
        <DialogHeader>
          <DialogTitle>Finalização e Checklist de Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-muted-foreground">Cliente</h3>
              <div className="flex items-center gap-2">
                <p className="text-lm">{agendamento.client_name}</p>
                {assinaturaCliente && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Crown className="w-3 h-3 mr-1" />
                    Assinante
                  </Badge>
                )}
              </div>
              {assinaturaCliente && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Plano: {assinaturaCliente.subscription_plans.name}
                  </p>
                  {!assinaturaValida && (
                    <Alert className="p-1 border-red-200 bg-red-100">                        
                      <AlertDescription className="text-red-700 text-sm ml-5">
                        Benefícios não disponíveis hoje
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-muted-foreground">Barbeiro</h3>
              <p>{agendamento.barber_name}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium mt-10 text-muted-foreground ">Serviços Realizados</h3>
                <div className="grid grid-cols-2 gap-3"> {/* Alterado para grid de 2 colunas */}
                  {servicos && servicos.length > 0 ? (
                    servicos.map((servico) => {
                      const beneficio = getBeneficioServico(servico.id);
                      const precoFinal = calcularPrecoComBeneficio(servico.price, beneficio);
                      const temBeneficio = beneficio && precoFinal < servico.price;
                      
                      return (
                        <FormField
                          key={servico.id}
                          control={form.control}
                          name="servicos"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(servico.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, servico.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== servico.id));
                                    }
                                    calcularTotal();
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                <div className="flex items-center gap-2">
                                  <span>{servico.name}</span>
                                  {temBeneficio && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <Gift className="w-3 h-3 mr-1" />
                                      {beneficio?.benefit_types.name === 'servico_gratuito' ? 'Grátis' : `${beneficio?.discount_percentage}% OFF`}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  {temBeneficio ? (
                                    <>
                                      <span className="line-through text-muted-foreground">R$ {servico.price.toFixed(2)}</span>
                                      <span className="text-green-600 font-medium">R$ {precoFinal.toFixed(2)}</span>
                                    </>
                                  ) : (
                                    <span>R$ {servico.price.toFixed(2)}</span>
                                  )}
                                </div>
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      Não há serviços ativos disponíveis.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium mt-10 text-muted-foreground">Produtos</h3>
                <div className="grid gap-3"> {/* Grid de uma coluna para melhor layout em mobile */}
                  {produtos && produtos.length > 0 ? (
                    produtos.map((produto) => {
                      const beneficio = getBeneficioProduto(produto.id);
                      const precoUnitarioFinal = calcularPrecoComBeneficio(produto.price, beneficio);
                      const temBeneficio = beneficio && precoUnitarioFinal < produto.price;
                      const isGratuito = isProdutoGratuito(produto.id);
                      const isComDesconto = isProdutoComDesconto(produto.id);
                      
                      return (
                        <FormField
                          key={produto.id}
                          control={form.control}
                          name="produtos"
                          render={({ field }) => (
                                                    <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.some(p => p.id === produto.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  // Adiciona com quantidade 1 para qualquer produto
                                  field.onChange([...current, { id: produto.id, quantity: 1 }]);
                                } else {
                                  field.onChange(current.filter(p => p.id !== produto.id));
                                }
                                calcularTotal();
                              }}
                              disabled={produto.stock === 0}
                            />
                          </FormControl>
                          <div className="flex-1 min-w-0">
                            <FormLabel className={`font-normal ${produto.stock === 0 ? 'text-muted-foreground' : ''}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{produto.name}</span>
                                {temBeneficio && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <Gift className="w-3 h-3 mr-1" />
                                    {isGratuito ? '1ª unidade grátis' : `${beneficio?.discount_percentage}% OFF`}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                {temBeneficio ? (
                                  <>
                                    <span className="line-through text-muted-foreground">R$ {produto.price.toFixed(2)}</span>
                                    <span className="text-green-600 font-medium">
                                      {isGratuito ? '1ª grátis, demais R$ ' + produto.price.toFixed(2) : `R$ ${precoUnitarioFinal.toFixed(2)}`}
                                    </span>
                                  </>
                                ) : (
                                  <span>R$ {produto.price.toFixed(2)}</span>
                                )}
                                <span className="text-muted-foreground">
                                  (Estoque: {produto.stock})
                                </span>
                              </div>
                            </FormLabel>
                          </div>
                                                            {field.value?.some(p => p.id === produto.id) && (
                                <div className="flex-shrink-0">
                                  <QuantitySelector
                                    value={field.value.find(p => p.id === produto.id)?.quantity || 1}
                                    onChange={(quantidade) => {
                                      // Validação de estoque para todos os produtos
                                      if (quantidade > produto.stock) return;
                                      
                                      const current = field.value || [];
                                      field.onChange(current.map(p => 
                                          p.id === produto.id 
                                            ? { ...p, quantity: quantidade } 
                                            : p
                                      ));
                                      calcularTotal();
                                    }}
                                    min={1}
                                    max={produto.stock}
                                  />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      Não há produtos ativos disponíveis.
                    </div>
                  )}
                </div>
              </div>

              {total > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium mt-10 text-muted-foreground">Forma de Pagamento</h3>
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a forma de pagamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Cartão_Crédito">Cartão_Crédito</SelectItem>
                            <SelectItem value="Cartão_Débito">Cartão_Débito</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Total</h3>
                  <div className="space-y-1">
                    {assinaturaCliente && descontoAssinatura > 0 && assinaturaValida && (
                      <div className="text-sm text-muted-foreground">
                        <span className="line-through">R$ {totalOriginal.toFixed(2)}</span>
                        <span className="ml-2 text-green-600">- R$ {descontoAssinatura.toFixed(2)} (Assinatura)</span>
                      </div>
                    )}
                    <p className="text-2xl font-bold">R$ {total.toFixed(2)}</p>
                  </div>
                </div>
                <Button type="button" onClick={handleFinalizarClick}>Finalizar Atendimento</Button>
              </div>
            </form>
          </Form>
        </div>

        <AlertDialog open={!!alertaLimiteBeneficio} onOpenChange={v => { if (!v) setAlertaLimiteBeneficio(null); }}>
          <AlertDialogContent className="bg-red-500 border-red-500">
            <AlertDialogHeader>
              <AlertDialogTitle>Atenção: Limite de Benefícios atingido!</AlertDialogTitle>
              <AlertDialogDescription className="text-white">
                <div>
                  Limite de Benefícios no mês: {alertaLimiteBeneficio?.max} <br />
                  Qtde que deseja usar agora: {alertaLimiteBeneficio?.tentandoUsar} <br />
                  Qtde já utilizada no mês: {alertaLimiteBeneficio?.usados} <br /><br />
                  Informe ao cliente que ele já atingiu o limite de benefícios do mês <br />                  
                  Retire algum benefício e tente finalizar o atendimento novamente.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className="bg-secondary" onClick={() => setAlertaLimiteBeneficio(null)}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent className="bg-green-50 border-green-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-green-800 text-center">Confirmar Finalização</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 text-center">
                <p className="text-green-700">
                  Tem certeza que deseja finalizar o atendimento do cliente <span className="font-bold">{agendamento.client_name}</span>?
                </p>
                {/* Resumo da comissão do barbeiro */}
                <div className="text-left bg-green-100 p-3 rounded-lg mb-2">
                  <p className="font-medium text-green-800 mb-1">Resumo da Comissão do Barbeiro:</p>
                  <ul className="text-green-900 text-sm mb-2">
                    {resumoComissao.map((item, idx) => (
                      <li key={idx} className="flex justify-between border-b border-green-200 py-1">
                        <span>{item.descricao}</span>
                        <span>R$ {item.valor.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="font-bold text-green-800 flex justify-between">
                    <span>Total da Comissão:</span>
                    <span>R$ {totalComissao.toFixed(2)}</span>
                  </div>
                </div>
                {/* Fim resumo comissão */}
                {assinaturaCliente && descontoAssinatura > 0 && assinaturaValida && (
                  <div className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                    <p className="font-medium">Benefícios da Assinatura Aplicados:</p>
                    <p>Desconto total: R$ {descontoAssinatura.toFixed(2)}</p>
                    <p>Plano: {assinaturaCliente.subscription_plans.name}</p>
                  </div>
                )}
                {assinaturaCliente && !assinaturaValida && (
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    <p className="font-medium">Benefícios da Assinatura não aplicados:</p>
                    <p>({getNomeDiaSemana(agendamento.date)}) não está nos dias permitidos do plano.</p>                    
                  </div>
                )}
                <p className="text-2xl font-bold text-green-700">
                  Total a Pagar: R$ {total.toFixed(2)}
                </p>
                <div className="text-sm text-green-600 bg-green-100 p-4 rounded-lg space-y-2">
                  <p>Confirme a finalização apenas se o cliente já pagou o valor total do atendimento.</p>                  
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-red-500 hover:bg-red-700">Não</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmFinalizar}
                className="bg-green-700 text-white hover:bg-green-900"
              >
                Sim, Finalizar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}