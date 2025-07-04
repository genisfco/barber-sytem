import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Trash2, Eye, Edit, XCircle, PauseCircle, Plus, Power } from "lucide-react";
import type { Subscription } from "@/types/subscription";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { atualizarStatusAssinatura, renovarCiclosAssinaturas } from "@/lib/subscriptionStatusManager";
import { toast } from "sonner";
import { addMonths, parseISO, format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClientes } from "@/hooks/useClientes";
import { useServicos } from "@/hooks/useServicos";
import { useProdutos } from "@/hooks/useProdutos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";

interface SubscriptionWithDetails extends Subscription {
  client_name?: string;
  plan_name?: string;
}

interface PlanoType {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  active: boolean;
  barber_shop_id: string;
  max_benefits_per_month: number;
  available_days: number[]; // novo campo array
  service_benefits?: {
    [key: string]: {
      type: "" | "gratuito" | "desconto";
      discount?: number;
    };
  };
  product_benefits?: {
    [key: string]: {
      type: "" | "gratuito" | "desconto";
      discount?: number;
    };
  };
}

// Adicionar o schema do formulário
const planoFormSchema = z.object({
  id: z.string().optional(), // Adicionado para edição
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço deve ser maior que zero"),
  duration_months: z.coerce.number().min(1, "Duração é obrigatória"),
  active: z.boolean().default(true),
  service_benefits: z.record(z.object({
    type: z.enum(["", "gratuito", "desconto"] as const),
    discount: z.coerce.number().min(0).max(100).optional()
  })).optional(),
  product_benefits: z.record(z.object({
    type: z.enum(["", "gratuito", "desconto"] as const),
    discount: z.coerce.number().min(0).max(100).optional()
  })).optional(),
  max_benefits_per_month: z.coerce.number().min(0).optional()
});

type PlanoFormData = z.infer<typeof planoFormSchema>;

const Assinaturas = () => {
  const { selectedBarberShop } = useBarberShopContext();
  const queryClient = useQueryClient();
  const [openSubscription, setOpenSubscription] = useState(false);
  const [openPlano, setOpenPlano] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoType | null>(null);
  const [deletingPlano, setDeletingPlano] = useState<PlanoType | null>(null);
  const [confirmDesativarPlano, setConfirmDesativarPlano] = useState<PlanoType | null>(null);

  // Buscar tipos de benefícios
  const { data: benefitTypes, isLoading: isLoadingBenefitTypes } = useQuery<any[]>({
    queryKey: ["benefit-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefit_types")
        .select("id, name");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: assinaturas, isLoading } = useQuery<SubscriptionWithDetails[]>({
    queryKey: ["assinaturas", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }
      // Busca assinaturas com detalhes do cliente e do plano
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          clients(name),
          subscription_plans!inner(
            name,
            barber_shop_id
          )
        `) // join
        .eq('subscription_plans.barber_shop_id', selectedBarberShop.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Ajusta para facilitar o uso no front
      return (data || []).map((row: any) => ({
        ...row,
        client_name: row.clients?.name,
        plan_name: row.subscription_plans?.name,
      }));
    },
    enabled: !!selectedBarberShop
  });

  // Buscar clientes ativos
  const { data: clientes, isLoading: isLoadingClientes } = useQuery<any[]>({
    queryKey: ["clientes-ativos", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("active", true)
        .eq("barber_shop_id", selectedBarberShop.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberShop
  });

  // Buscar planos ativos (já existe, mas vamos buscar todos para exibir no topo)
  const { data: planos, isLoading: isLoadingPlanos, refetch: refetchPlanos } = useQuery<PlanoType[]>({
    queryKey: ["planos-ativos", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop || !benefitTypes) {
        throw new Error("Barbearia não selecionada ou tipos de benefício não carregados");
      }
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(`*, subscription_plan_benefits(*)`)
        .eq('barber_shop_id', selectedBarberShop.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((plano: any) => {
        const service_benefits: PlanoType['service_benefits'] = {};
        const product_benefits: PlanoType['product_benefits'] = {};
        plano.subscription_plan_benefits.forEach((benefit: any) => {
          const benefitTypeName = benefitTypes.find((bt: any) => bt.id === benefit.benefit_type_id)?.name;
          if (benefit.service_id) {
            if (benefitTypeName === 'servico_gratuito') {
              service_benefits[benefit.service_id] = { type: 'gratuito' };
            } else if (benefitTypeName === 'servico_desconto') {
              service_benefits[benefit.service_id] = { type: 'desconto', discount: benefit.discount_percentage || undefined };
            }
          } else if (benefit.product_id) {
            if (benefitTypeName === 'produto_gratuito') {
              product_benefits[benefit.product_id] = { type: 'gratuito' };
            } else if (benefitTypeName === 'produto_desconto') {
              product_benefits[benefit.product_id] = { type: 'desconto', discount: benefit.discount_percentage || undefined };
            }
          }
        });
        const { subscription_plan_benefits, ...rest } = plano;
        return {
          ...rest,
          service_benefits,
          product_benefits,
          available_days: plano.available_days || []
        } as PlanoType;
      });
    },
    enabled: !!selectedBarberShop && !!benefitTypes
  });

  // Buscar pagamentos das assinaturas
  const { data: pagamentos, isLoading: isLoadingPagamentos } = useQuery<any[]>({
    queryKey: ["pagamentos-assinaturas", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }
      const { data, error } = await supabase
        .from("subscription_payments")
        .select(`
          id,
          client_subscription_id,
          status,
          payment_date,
          amount,
          payment_method,
          cycle_start_date,
          cycle_end_date,
          client_subscriptions!inner(
            subscription_plans!inner(
              barber_shop_id
            )
          )
        `)
        .eq('client_subscriptions.subscription_plans.barber_shop_id', selectedBarberShop.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberShop
  });

  // Formulário principal
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      client_id: "",
      subscription_plan_id: "",
      start_date: getHojeISO(),
      end_date: "",
      status: "ativa"
    }
  });

  // Formulário do plano
  const { 
    register: registerPlano, 
    handleSubmit: handleSubmitPlano, 
    reset: resetPlano, 
    setValue: setValuePlano,
    watch: watchPlano,
    formState: { isSubmitting: isSubmittingPlano } 
  } = useForm<PlanoFormData>({
    resolver: zodResolver(planoFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration_months: 1,
      active: true,
      service_benefits: {},
      product_benefits: {},
      max_benefits_per_month: 0
    }
  });

  // Atualizar data de término automaticamente ao selecionar plano ou data de início
  const selectedPlanId = watch("subscription_plan_id");
  const startDate = watch("start_date");
  useEffect(() => {
    if (!selectedPlanId || !startDate) return;
    const plano = planos?.find((p) => p.id === selectedPlanId);
    if (plano && plano.duration_months) {
      const start = parseISO(startDate);
      const end = subDays(addMonths(start, Number(plano.duration_months)), 1);
      setValue("end_date", format(end, "yyyy-MM-dd"));
    }
  }, [selectedPlanId, startDate, planos, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: assinaturaCriada, error } = await supabase
        .from("client_subscriptions")
        .insert({
          client_id: data.client_id,
          subscription_plan_id: data.subscription_plan_id,
          start_date: data.start_date,
          end_date: data.end_date || null,
          status: data.status
        })
        .select()
        .single();
      if (error) throw error;
      return assinaturaCriada;
    },
    onSuccess: (assinaturaCriada) => {
      queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
      setOpenSubscription(false);
      reset();
      // Buscar valor padrão do plano
      const plano = planos?.find((p) => p.id === assinaturaCriada.subscription_plan_id);
      setAssinaturaParaPagamento({
        id: assinaturaCriada.id,
        valorPadrao: plano?.price || ""
      });
      setOpenPagamento(true);
    }
  });

  function onSubmit(data: any) {
    mutation.mutate(data);
  }

  const mutationPlano = useMutation({
    mutationFn: async (data: PlanoFormData & { diasSelecionados: number[] }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }
      // Inserir plano com available_days
      const { data: planoInserido, error: errorPlano } = await supabase
        .from("subscription_plans")
        .insert({
          name: data.name,
          description: data.description,
          price: Number(data.price),
          duration_months: Number(data.duration_months),
          active: data.active,
          barber_shop_id: selectedBarberShop.id,
          max_benefits_per_month: Number(data.max_benefits_per_month),
          available_days: data.diasSelecionados
        })
        .select()
        .single();
      if (errorPlano) throw errorPlano;

      // Inserir benefícios de serviços
      if (data.service_benefits) {
        const serviceBenefits = Object.entries(data.service_benefits)
          .filter(([_, benefit]) => benefit.type !== "")
          .map(([serviceId, benefit]) => {
            const benefitTypeId = benefit.type === "gratuito"
              ? benefitTypes?.find(bt => bt.name === "servico_gratuito")?.id
              : benefitTypes?.find(bt => bt.name === "servico_desconto")?.id;

            if (!benefitTypeId) {
              throw new Error(`Tipo de benefício de serviço ${benefit.type} não encontrado.`);
            }
            return {
              subscription_plan_id: planoInserido.id,
              benefit_type_id: benefitTypeId,
              service_id: serviceId,
              discount_percentage: benefit.type === "desconto" ? (benefit.discount === undefined ? null : benefit.discount) : null,
              is_unlimited: true
            };
          });

        if (serviceBenefits.length > 0) {
          const { error: errorServiceBenefits } = await supabase
            .from("subscription_plan_benefits")
            .insert(serviceBenefits);
          
          if (errorServiceBenefits) {
            throw errorServiceBenefits;
          }
        }
      }

      // Inserir benefícios de produtos
      if (data.product_benefits) {
        const productBenefits = Object.entries(data.product_benefits)
          .filter(([_, benefit]) => benefit.type !== "")
          .map(([productId, benefit]) => {
            const benefitTypeId = benefit.type === "gratuito"
              ? benefitTypes?.find(bt => bt.name === "produto_gratuito")?.id
              : benefitTypes?.find(bt => bt.name === "produto_desconto")?.id;

            if (!benefitTypeId) {
              throw new Error(`Tipo de benefício de produto ${benefit.type} não encontrado.`);
            }
            return {
              subscription_plan_id: planoInserido.id,
              benefit_type_id: benefitTypeId,
              product_id: productId,
              discount_percentage: benefit.type === "desconto" ? (benefit.discount === undefined ? null : benefit.discount) : null,
              is_unlimited: true
            };
          });

        if (productBenefits.length > 0) {
          const { error: errorProductBenefits } = await supabase
            .from("subscription_plan_benefits")
            .insert(productBenefits);
          
          if (errorProductBenefits) {
            throw errorProductBenefits;
          }
        }
      }      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
      resetPlano();
      setDiasSelecionados([]);
      setOpenPlano(false);
      toast.success("Plano criado com sucesso!");
      refetchPlanos();
    },
    onError: (error) => {
      toast.error("Erro ao salvar o plano. Verifique o console para mais detalhes.");
    }
  });
  function onSubmitPlano(data: PlanoFormData & { diasSelecionados: number[] }) {
    mutationPlano.mutate(data);
  }

  const mutationEditPlano = useMutation({
    mutationFn: async (data: PlanoFormData & { diasSelecionados: number[] }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }
      // Atualizar plano com available_days
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: data.name,
          description: data.description,
          price: Number(data.price),
          duration_months: Number(data.duration_months),
          active: data.active,
          max_benefits_per_month: Number(data.max_benefits_per_month),
          available_days: data.diasSelecionados
        })
        .eq("id", data.id)
        .eq("barber_shop_id", selectedBarberShop.id);
      if (error) throw error;

      // --- NOVO: Remover benefícios antigos que não estão mais presentes ---
      // Buscar benefícios atuais do plano
      const { data: beneficiosAtuais, error: errorBuscaBeneficios } = await supabase
        .from("subscription_plan_benefits")
        .select("id, service_id, product_id")
        .eq("subscription_plan_id", data.id);
      if (errorBuscaBeneficios) throw errorBuscaBeneficios;

      // IDs dos benefícios que devem permanecer (do formulário)
      const idsServicosNovos = Object.keys(data.service_benefits || {}).filter(
        (id) => data.service_benefits[id].type !== ""
      );
      const idsProdutosNovos = Object.keys(data.product_benefits || {}).filter(
        (id) => data.product_benefits[id].type !== ""
      );

      // Identificar benefícios a remover
      const idsParaRemover = (beneficiosAtuais || []).filter((beneficio) => {
        if (beneficio.service_id && !idsServicosNovos.includes(beneficio.service_id)) return true;
        if (beneficio.product_id && !idsProdutosNovos.includes(beneficio.product_id)) return true;
        return false;
      }).map((b) => b.id);

      // Deletar benefícios removidos
      if (idsParaRemover.length > 0) {
        const { error: errorDelete } = await supabase
          .from("subscription_plan_benefits")
          .delete()
          .in("id", idsParaRemover);
        if (errorDelete) throw errorDelete;
      }
      // --- FIM NOVO ---

      // Inserir benefícios de serviços (reutilizando lógica da mutação de criação)
      if (data.service_benefits) {
        const serviceBenefits = Object.entries(data.service_benefits)
          .filter(([_, benefit]) => benefit.type !== "")
          .map(([serviceId, benefit]) => {
            const benefitTypeId = benefit.type === "gratuito"
              ? benefitTypes?.find(bt => bt.name === "servico_gratuito")?.id
              : benefitTypes?.find(bt => bt.name === "servico_desconto")?.id;

            if (!benefitTypeId) {
              throw new Error(`Tipo de benefício de serviço ${benefit.type} não encontrado.`);
            }
            return {
              subscription_plan_id: data.id,
              benefit_type_id: benefitTypeId,
              service_id: serviceId,
              discount_percentage: benefit.type === "desconto" ? (benefit.discount === undefined ? null : benefit.discount) : null,
              is_unlimited: true
            };
          });

        if (serviceBenefits.length > 0) {
          const { error: errorServiceBenefits } = await supabase
            .from("subscription_plan_benefits")
            .insert(serviceBenefits);
          
          if (errorServiceBenefits) {
            throw errorServiceBenefits;
          }
        }
      }

      // Inserir benefícios de produtos (reutilizando lógica da mutação de criação)
      if (data.product_benefits) {
        const productBenefits = Object.entries(data.product_benefits)
          .filter(([_, benefit]) => benefit.type !== "")
          .map(([productId, benefit]) => {
            const benefitTypeId = benefit.type === "gratuito"
              ? benefitTypes?.find(bt => bt.name === "produto_gratuito")?.id
              : benefitTypes?.find(bt => bt.name === "produto_desconto")?.id;

            if (!benefitTypeId) {
              throw new Error(`Tipo de benefício de produto ${benefit.type} não encontrado.`);
            }
            return {
              subscription_plan_id: data.id,
              benefit_type_id: benefitTypeId,
              product_id: productId,
              discount_percentage: benefit.type === "desconto" ? (benefit.discount === undefined ? null : benefit.discount) : null,
              is_unlimited: true
            };
          });

        if (productBenefits.length > 0) {
          const { error: errorProductBenefits } = await supabase
            .from("subscription_plan_benefits")
            .insert(productBenefits);
          
          if (errorProductBenefits) {
            throw errorProductBenefits;
          }
        }
      }      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
      setEditingPlano(null);
      setOpenPlano(false);
      resetPlano();
      setDiasSelecionados([]);
      toast.success("Plano editado com sucesso!");
      refetchPlanos();
    },
    onError: (error) => {
      toast.error("Erro ao editar o plano. Verifique o console para mais detalhes.");
    }
  });
  function onSubmitPlanoEdit(data: PlanoFormData & { diasSelecionados: number[] }) {
    if (!selectedBarberShop) {
      toast.error("Barbearia não selecionada");
      return;
    }

    const dataToMutate: PlanoFormData & { diasSelecionados: number[] } = {
      ...data,
      id: editingPlano?.id, // Garante que o ID do plano em edição seja usado
    };

    mutationEditPlano.mutate(dataToMutate);
  }

  const mutationDeletePlano = useMutation({
    mutationFn: async (plano: PlanoType) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from("subscription_plans")
        .update({ active: false })
        .eq("id", plano.id)
        .eq("barber_shop_id", selectedBarberShop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
      setDeletingPlano(null);
      refetchPlanos();
    }
  });

  // Estado para modal de pagamento
  const [openPagamento, setOpenPagamento] = useState(false);
  const [assinaturaParaPagamento, setAssinaturaParaPagamento] = useState<any | null>(null);
  const pagamentoFormRef = useRef<any>(null);

  // Formulário de pagamento
  const { register: registerPagamento, handleSubmit: handleSubmitPagamento, reset: resetPagamento, setValue: setValuePagamento, formState: { isSubmitting: isSubmittingPagamento } } = useForm({
    defaultValues: {
      client_subscription_id: "",
      payment_date: getHojeISO(),
      amount: "",
      status: "pago",
      payment_method: ""
    }
  });

  // Buscar clientes para nome no lançamento financeiro
  const { clientes: clientesAll } = useClientes ? useClientes() : { clientes: [] };

  const mutationPagamento = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // 1. Registrar o pagamento sempre como 'pendente' (exceto se for 'falhou')
      const statusPagamento = data.status === 'falhou' ? 'falhou' : 'pendente';
      const assinatura = assinaturas?.find(a => a.id === data.client_subscription_id);
      const cliente = clientesAll?.find(c => c.id === assinatura?.client_id);
      const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
      // Calcular ciclo vigente
      let cicloInicio = assinatura?.start_date ? parseISO(assinatura.start_date) : null;
      let cicloFim = null;
      if (cicloInicio && plano?.duration_months) {
        cicloFim = subDays(addMonths(cicloInicio, Number(plano.duration_months)), 1);
      }
      const { data: pagamentoCriado, error: errorPagamento } = await supabase
        .from("subscription_payments")
        .insert({
          client_subscription_id: data.client_subscription_id,
          payment_date: data.payment_date,
          amount: Number(data.amount),
          status: statusPagamento,
          payment_method: data.payment_method,
          cycle_start_date: cicloInicio ? cicloInicio.toISOString().slice(0, 10) : null,
          cycle_end_date: cicloFim ? cicloFim.toISOString().slice(0, 10) : null
        })
        .select()
        .single();
      if (errorPagamento) throw errorPagamento;

      // 2. Lançar no financeiro normalmente
      const { data: transacaoCriada, error: errorTransacao } = await supabase.from("transactions").insert({
        type: "receita",
        value: Number(data.amount),
        description: `Pagamento de assinatura de ${cliente?.name || "Cliente"} - ${plano?.name || "Plano"}`,
        payment_method: data.payment_method,
        category: "assinaturas",
        payment_date: data.payment_date,
        barber_shop_id: selectedBarberShop.id
      }).select().single();
      if (errorTransacao) throw errorTransacao;
      // Atualizar o pagamento com o id da transação
      if (transacaoCriada && pagamentoCriado) {
        await supabase.from("subscription_payments").update({ transaction_id: transacaoCriada.id }).eq("id", pagamentoCriado.id);
      }

      // Atualizar status da assinatura e dos pagamentos do ciclo
      const assinaturaAtualizada = assinaturas?.find(a => a.id === data.client_subscription_id);
      const planoAtualizado = planos?.find(p => p.id === assinaturaAtualizada?.subscription_plan_id);
      const { data: pagamentosAtualizados } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("client_subscription_id", data.client_subscription_id);
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados && selectedBarberShop) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado, selectedBarberShop.id);
      }
    },
    onSuccess: () => {
      setOpenPagamento(false);
      setAssinaturaParaPagamento(null);
      resetPagamento();
      queryClient.invalidateQueries({ queryKey: ["assinaturas", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
    }
  });

  function podeRegistrarPagamento(assinatura, pagamentosAssinatura, plano, valorNovoPagamento) {
    if (!assinatura || !plano) return false;
    // Filtrar pagamentos do ciclo atual usando os campos de ciclo
    const pagamentosCicloAtual = pagamentosAssinatura.filter(
      p => p.cycle_start_date === assinatura.start_date && p.cycle_end_date === assinatura.end_date
    );
    const somaPagamentos = pagamentosCicloAtual.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    // Não permitir se soma + novo pagamento ultrapassar o valor do ciclo
    return somaPagamentos + Number(valorNovoPagamento) <= Number(plano.price);
  }

  // Adicionar estados para modais de alerta/confirmacao
  const [modalDuplicidade, setModalDuplicidade] = useState(false);
  const [modalRetroativo, setModalRetroativo] = useState<{ open: boolean, data: any } | null>(null);

  function onSubmitPagamento(data: any) {
    // Buscar assinatura, plano e pagamentos do ciclo
    const assinatura = assinaturas?.find(a => a.id === data.client_subscription_id);
    const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
    const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === data.client_subscription_id) || [];

    // 1. Verificar duplicidade de pagamento
    const existeDuplicado = pagamentosAssinatura.some(p =>
      Number(p.amount) === Number(data.amount) &&
      p.payment_date === data.payment_date &&
      p.payment_method === data.payment_method
    );
    if (existeDuplicado) {
      setModalDuplicidade(true);
      return;
    }

    // 2. Alerta para data retroativa
    const hoje = getHojeISO();
    if (data.payment_date !== hoje) {
      setModalRetroativo({ open: true, data });
      return;
    }

    if (!podeRegistrarPagamento(assinatura, pagamentosAssinatura, plano, data.amount)) {
      toast.error("O valor total dos pagamentos não pode ultrapassar o valor do ciclo da assinatura.");
      return;
    }
    mutationPagamento.mutate(data);
  }

  // Ao criar nova adesão, abrir modal de pagamento
  useEffect(() => {
    if (assinaturaParaPagamento && openPagamento) {
      // Preencher o id da assinatura no form
      setValuePagamento("client_subscription_id", assinaturaParaPagamento.id);
      setValuePagamento("amount", assinaturaParaPagamento.valorPadrao || "");
    }
  }, [assinaturaParaPagamento, openPagamento, setValuePagamento]);

  const [modalPagamentos, setModalPagamentos] = useState<{ assinaturaId: string | null }>({ assinaturaId: null });

  // Mutation para editar pagamento
  const mutationEditarPagamento = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Buscar o pagamento antes da edição
      const { data: pagamentoAntes } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("id", data.id)
        .single();

      const { error } = await supabase
        .from("subscription_payments")
        .update({
          payment_date: data.payment_date,
          amount: Number(data.amount),
          status: data.status,
          payment_method: data.payment_method
        })
        .eq("id", data.id);
      if (error) throw error;

      // Se o pagamento possui transaction_id, atualizar a transação financeira correspondente
      if (pagamentoAntes?.transaction_id) {
        // Buscar assinatura, cliente e plano para atualizar a descrição
        const assinatura = assinaturas?.find(a => a.id === data.client_subscription_id);
        const cliente = clientes?.find(c => c.id === assinatura?.client_id);
        const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
        await supabase
          .from("transactions")
          .update({
            value: Number(data.amount),
            payment_method: data.payment_method,
            description: `Pagamento de assinatura de ${cliente?.name || "Cliente"} - ${plano?.name || "Plano"}`,
            payment_date: data.payment_date
          })
          .eq("id", pagamentoAntes.transaction_id)
          .eq("barber_shop_id", selectedBarberShop.id);
      }

      // Se status foi alterado para 'pago' e não existe transaction_id, criar lançamento financeiro
      if (data.status === 'pago' && (!pagamentoAntes?.transaction_id || pagamentoAntes.status !== 'pago')) {
        const assinatura = assinaturas?.find(a => a.id === data.client_subscription_id);
        const cliente = clientes?.find(c => c.id === assinatura?.client_id);
        const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
        const { data: transacaoCriada, error: errorTransacao } = await supabase.from("transactions").insert({
          type: "receita",
          value: Number(data.amount),
          description: `Pagamento de assinatura de ${cliente?.name || "Cliente"} - ${plano?.name || "Plano"}`,
          payment_method: data.payment_method,
          category: "assinaturas",
          payment_date: data.payment_date,
          barber_shop_id: selectedBarberShop.id
        }).select().single();
        if (errorTransacao) throw errorTransacao;
        if (transacaoCriada) {
          await supabase.from("subscription_payments").update({ transaction_id: transacaoCriada.id }).eq("id", data.id);
        }
      }

      // Atualizar status da assinatura automaticamente
      const assinaturaAtualizada = assinaturas?.find(a => a.id === data.client_subscription_id);
      const planoAtualizado = planos?.find(p => p.id === assinaturaAtualizada?.subscription_plan_id);
      const { data: pagamentosAtualizados } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("client_subscription_id", data.client_subscription_id);
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados && selectedBarberShop) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado, selectedBarberShop.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinaturas", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
    }
  });

  // Mutation para remover pagamento
  const mutationRemoverPagamento = useMutation({
    mutationFn: async (data: { id: string, client_subscription_id: string }) => {
      // Buscar o pagamento antes de remover
      const { data: pagamentoRemovido } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("id", data.id)
        .single();

      const { error } = await supabase
        .from("subscription_payments")
        .delete()
        .eq("id", data.id);
      if (error) throw error;

      // Se o pagamento tinha transaction_id, remover a transação financeira correspondente
      if (pagamentoRemovido && pagamentoRemovido.transaction_id) {
        await supabase.from("transactions").delete().eq("id", pagamentoRemovido.transaction_id);
      }

      // Atualizar status da assinatura automaticamente
      const assinaturaAtualizada = assinaturas?.find(a => a.id === data.client_subscription_id);
      const planoAtualizado = planos?.find(p => p.id === assinaturaAtualizada?.subscription_plan_id);
      const { data: pagamentosAtualizados } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("client_subscription_id", data.client_subscription_id);
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados && selectedBarberShop) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado, selectedBarberShop.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    }
  });

  // Estado para edição de pagamento
  const [pagamentoEditando, setPagamentoEditando] = useState<any | null>(null);
  const [assinaturaEditando, setAssinaturaEditando] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  // Função para atualizar status manualmente
  async function atualizarStatusManual(assinaturaId: string, status: string) {
    if (!selectedBarberShop) {
      toast.error("Barbearia não selecionada");
      return;
    }
    setLoadingStatus(assinaturaId + status);
    // Primeiro, verificar se a assinatura pertence à barbearia
    const { data: assinatura } = await supabase
      .from('client_subscriptions')
      .select('*, subscription_plans!inner(barber_shop_id)')
      .eq('id', assinaturaId)
      .single();

    if (!assinatura || assinatura.subscription_plans.barber_shop_id !== selectedBarberShop.id) {
      toast.error("Assinatura não encontrada ou não pertence a esta barbearia");
      setLoadingStatus(null);
      return;
    }

    await supabase.from('client_subscriptions').update({ status }).eq('id', assinaturaId);
    setLoadingStatus(null);
    queryClient.invalidateQueries({ queryKey: ["assinaturas", selectedBarberShop?.id] });
  }

  // Estado para controlar o pagamento a ser removido
  const [pagamentoParaRemover, setPagamentoParaRemover] = useState<any | null>(null);

  // Atualizar status de todas as assinaturas ao carregar a tela
  useEffect(() => {
    async function atualizarTodosStatus() {
      if (!assinaturas || !planos || !selectedBarberShop) return;
      // 1. Atualizar status de todas as assinaturas
      for (const assinatura of assinaturas) {
        const plano = planos.find(p => p.id === assinatura.subscription_plan_id);
        if (plano) {
          const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === assinatura.id) || [];
          await atualizarStatusAssinatura(assinatura, pagamentosAssinatura, plano, selectedBarberShop.id);
        }
      }
      // 2. Só depois, renovar ciclos das assinaturas
      await renovarCiclosAssinaturas(selectedBarberShop.id);
      queryClient.invalidateQueries({ queryKey: ["assinaturas", selectedBarberShop.id] });
    }
    if (assinaturas && planos) {
      atualizarTodosStatus();
    }
    // eslint-disable-next-line
  }, [assinaturas, planos, selectedBarberShop]);

  const [modalRenovar, setModalRenovar] = useState<{ assinatura: any | null }>({ assinatura: null });
  const [renovarCobranca, setRenovarCobranca] = useState<'cobrar' | 'perdoar' | null>(null);
  const [valorCobranca, setValorCobranca] = useState<number>(0);

  // Função para calcular valor devido do ciclo anterior
  function calcularValorDevido(assinatura, pagamentosAssinatura, plano) {
    if (!assinatura || !plano) return 0;
    // Pagamentos do ciclo anterior (start_date e end_date atuais)
    const pagamentosCiclo = pagamentosAssinatura.filter(
      p => p.cycle_start_date === assinatura.start_date && p.cycle_end_date === assinatura.end_date
    );
    const somaPagamentos = pagamentosCiclo.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return Math.max(0, Number(plano.price) - somaPagamentos);
  }

  // Função para renovar assinatura (perdoar dívida)
  async function handleRenovarPerdoar() {
    const assinatura = modalRenovar.assinatura;
    if (!assinatura) return;
    const plano = planos?.find(p => p.id === assinatura.subscription_plan_id);
    if (!plano) return;
    const hoje = new Date();
    const novoStart = hoje.toISOString().slice(0, 10);
    const novoEnd = format(subDays(addMonths(hoje, Number(plano.duration_months)), 1), "yyyy-MM-dd");
    // Atualizar assinatura para ativa e novo ciclo
    await supabase.from('client_subscriptions').update({
      status: 'ativa',
      start_date: novoStart,
      end_date: novoEnd
    }).eq('id', assinatura.id);
    setModalRenovar({ assinatura: null });
    setRenovarCobranca(null);
    // Abrir modal de pagamento do novo ciclo
    setAssinaturaParaPagamento({ id: assinatura.id, valorPadrao: plano.price });
    setOpenPagamento(true);
    queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
    queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas"] });
  }

  // Função para renovar assinatura (cobrar dívida)
  async function handleRenovarCobrarPagamento(pagamentoData) {
    if (!selectedBarberShop) {
      toast.error("Barbearia não selecionada");
      return;
    }

    const assinatura = modalRenovar.assinatura;
    if (!assinatura) return;
    const plano = planos?.find(p => p.id === assinatura.subscription_plan_id);
    if (!plano) return;
    const cliente = clientes?.find(c => c.id === assinatura.client_id);
    const hoje = new Date();
    const novoStart = hoje.toISOString().slice(0, 10);
    const novoEnd = format(subDays(addMonths(hoje, Number(plano.duration_months)), 1), "yyyy-MM-dd");
    // 1. Registrar pagamento do ciclo anterior
    const { data: pagamentoCriado, error: errorPagamento } = await supabase
      .from("subscription_payments")
      .insert({
        client_subscription_id: assinatura.id,
        payment_date: pagamentoData.payment_date,
        amount: Number(pagamentoData.amount),
        status: 'pago',
        payment_method: pagamentoData.payment_method,
        cycle_start_date: assinatura.start_date,
        cycle_end_date: assinatura.end_date
      })
      .select()
      .single();
    if (errorPagamento) {
      toast.error("Erro ao registrar pagamento do ciclo anterior");
      return;
    }
    // 2. Lançar transação financeira
    const { data: transacaoCriada, error: errorTransacao } = await supabase.from("transactions").insert({
      type: "receita",
      value: Number(pagamentoData.amount),
      description: `Pagamento de Pendência de Assinatura - ${cliente?.name || "Cliente"} - ${plano?.name || "Plano"}`,
      payment_method: pagamentoData.payment_method,
      category: "assinaturas",
      payment_date: pagamentoData.payment_date,
      barber_shop_id: selectedBarberShop.id
    }).select().single();
    if (errorTransacao) {
      toast.error("Erro ao lançar transação financeira");
      return;
    }
    // 3. Atualizar pagamento com id da transação
    if (transacaoCriada && pagamentoCriado) {
      await supabase.from("subscription_payments").update({ transaction_id: transacaoCriada.id }).eq("id", pagamentoCriado.id);
    }
    // 4. Renovar assinatura para novo ciclo
    await supabase.from('client_subscriptions').update({
      status: 'ativa',
      start_date: novoStart,
      end_date: novoEnd
    }).eq('id', assinatura.id);
    setModalRenovar({ assinatura: null });
    setRenovarCobranca(null);
    toast.success("Assinatura renovada e pendência quitada!");
    queryClient.invalidateQueries({ queryKey: ["assinaturas", selectedBarberShop?.id] });
    queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas", selectedBarberShop?.id] });
    queryClient.invalidateQueries({ queryKey: ["transacoes", selectedBarberShop?.id] });
    queryClient.invalidateQueries({ queryKey: ["transacoes-hoje", selectedBarberShop?.id] });
  }

  // Utilitário para obter data de hoje no formato yyyy-MM-dd
  function getHojeISO() {
    const hoje = new Date();
    const year = hoje.getFullYear();
    const month = String(hoje.getMonth() + 1).padStart(2, '0');
    const day = String(hoje.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Estado para controlar o modal de confirmação de status
  const [confirmarStatus, setConfirmarStatus] = useState<{ id: string, status: 'suspensa' | 'cancelada' | 'ativa' | null } | null>(null);

  const handleOpenPlanoDialog = (plano?: PlanoType) => {
    setEditingPlano(plano || null);
    setOpenPlano(true);
  };

  const handleClosePlanoDialog = () => {
    setOpenPlano(false);
    setEditingPlano(null);
    resetPlano();
    setDiasSelecionados([]);
  };

  // Efeito para preencher o formulário quando um plano é selecionado para edição
  useEffect(() => {
    if (editingPlano) {
      setValuePlano("name", editingPlano.name);
      setValuePlano("description", editingPlano.description || "");
      setValuePlano("price", Number(editingPlano.price));
      setValuePlano("duration_months", Number(editingPlano.duration_months));
      setValuePlano("active", editingPlano.active);
      setValuePlano("max_benefits_per_month", Number(editingPlano.max_benefits_per_month));

      // Preencher benefícios de serviços
      if (editingPlano.service_benefits) {
        Object.entries(editingPlano.service_benefits).forEach(([serviceId, benefit]: [string, { type: "" | "gratuito" | "desconto"; discount?: number; }]) => {
          setValuePlano(`service_benefits.${serviceId}.type`, benefit.type);
          if (benefit.discount) {
            setValuePlano(`service_benefits.${serviceId}.discount`, Number(benefit.discount));
          }
        });
      }

      // Preencher benefícios de produtos
      if (editingPlano.product_benefits) {
        Object.entries(editingPlano.product_benefits).forEach(([productId, benefit]: [string, { type: "" | "gratuito" | "desconto"; discount?: number; }]) => {
          setValuePlano(`product_benefits.${productId}.type`, benefit.type);
          if (benefit.discount) {
            setValuePlano(`product_benefits.${productId}.discount`, Number(benefit.discount));
          }
        });
      }
    } else {
      resetPlano();
    }
  }, [editingPlano, setValuePlano, resetPlano]);

  const formatName = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handlePlanoNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatName(e.target.value);
    setValuePlano('name', formattedValue);
  };

  const { servicos } = useServicos();
  const { produtos } = useProdutos();

  // Dias da semana para seleção
  const DIAS_SEMANA = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
  ];

  // Estado para dias selecionados (criação/edição)
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);

  // Atualiza automaticamente o campo de limite de benefícios conforme seleção
  useEffect(() => {
    const serviceBenefits = watchPlano("service_benefits") || {};
    const productBenefits = watchPlano("product_benefits") || {};
    const countSelected = [
      ...Object.values(serviceBenefits),
      ...Object.values(productBenefits)
    ].filter((benefit: any) => benefit && benefit.type && benefit.type !== "").length;
    // Só atualiza se não for ilimitado
    if (watchPlano("max_benefits_per_month") !== 0) {
      setValuePlano("max_benefits_per_month", countSelected * 5);
    }
  }, [
    watchPlano("service_benefits"),
    watchPlano("product_benefits"),
    watchPlano("max_benefits_per_month"),
    setValuePlano
  ]);

  // Preencher diasSelecionados ao editar um plano
  useEffect(() => {
    if (editingPlano) {
      setValuePlano("name", editingPlano.name);
      setValuePlano("description", editingPlano.description || "");
      setValuePlano("price", Number(editingPlano.price));
      setValuePlano("duration_months", Number(editingPlano.duration_months));
      setValuePlano("active", editingPlano.active);
      setValuePlano("max_benefits_per_month", Number(editingPlano.max_benefits_per_month));
      // Preencher benefícios de serviços
      if (editingPlano.service_benefits) {
        Object.entries(editingPlano.service_benefits).forEach(([serviceId, benefit]: [string, { type: "" | "gratuito" | "desconto"; discount?: number; }]) => {
          setValuePlano(`service_benefits.${serviceId}.type`, benefit.type);
          if (benefit.discount) {
            setValuePlano(`service_benefits.${serviceId}.discount`, Number(benefit.discount));
          }
        });
      }
      // Preencher benefícios de produtos
      if (editingPlano.product_benefits) {
        Object.entries(editingPlano.product_benefits).forEach(([productId, benefit]: [string, { type: "" | "gratuito" | "desconto"; discount?: number; }]) => {
          setValuePlano(`product_benefits.${productId}.type`, benefit.type);
          if (benefit.discount) {
            setValuePlano(`product_benefits.${productId}.discount`, Number(benefit.discount));
          }
        });
      }
      // Preencher dias selecionados a partir do array
      setDiasSelecionados(editingPlano.available_days || []);
    } else {
      resetPlano();
      setDiasSelecionados([]);
    }
  }, [editingPlano, setValuePlano, resetPlano]);

  // Renderização condicional para loading
  if (isLoading || isLoadingPlanos || isLoadingPagamentos) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Planos de assinatura no topo */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display text-barber-dark">Planos</h1>
          {/* Dialog de criação de plano */}
          <Dialog open={openPlano} onOpenChange={setOpenPlano}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Plano</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
              <DialogHeader>
                <DialogTitle>Criar Novo Plano de Assinatura</DialogTitle>
                <DialogDescription>
                  Preencha os dados do plano de assinatura
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitPlano((data) => {
                if (diasSelecionados.length === 0) {
                  toast.error("Selecione ao menos um dia da semana para o plano.");
                  return;
                }
                const formData = {
                  ...data,
                  price: Number(data.price),
                  duration_months: Number(data.duration_months),
                  max_benefits_per_month: Number(data.max_benefits_per_month),
                  service_benefits: Object.fromEntries(
                    Object.entries(data.service_benefits || {}).map(([key, value]) => [
                      key,
                      {
                        ...value,
                        discount: value.discount ? Number(value.discount) : undefined
                      }
                    ])
                  ),
                  product_benefits: Object.fromEntries(
                    Object.entries(data.product_benefits || {}).map(([key, value]) => [
                      key,
                      {
                        ...value,
                        discount: value.discount ? Number(value.discount) : undefined
                      }
                    ])
                  ),
                  diasSelecionados
                };
                mutationPlano.mutate(formData);
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Plano</Label>
                    <Input 
                      id="name" 
                      className="bg-background"
                      {...registerPlano("name", { required: true })} 
                      onChange={handlePlanoNameChange} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      step="0.01" 
                      className="bg-background"
                      {...registerPlano("price", { required: true })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input 
                    id="description" 
                    className="bg-background"
                    {...registerPlano("description")} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration_months">Duração e Renovação do Plano (meses)</Label>
                    <select
                      id="duration_months"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...registerPlano("duration_months", { required: true })}
                    >
                      <option value="1">1 mês</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                </div>

                {/* Seção de Benefícios de Serviços */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Benefícios de Serviços</h3>
                  <div className="space-y-2">
                    {servicos?.map((servico) => (
                      <div key={servico.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>{servico.name}</Label>
                          <p className="text-sm text-muted-foreground">R$ {servico.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            {...registerPlano(`service_benefits.${servico.id}.type`)}
                          >
                            <option value="">Não incluso</option>
                            <option value="gratuito">Gratuito</option>
                            <option value="desconto">Desconto</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-20 bg-background"
                            placeholder="%"
                            {...registerPlano(`service_benefits.${servico.id}.discount`)}
                            disabled={watchPlano(`service_benefits.${servico.id}.type`) !== 'desconto'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção de Benefícios de Produtos */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Benefícios de Produtos</h3>
                  <div className="space-y-2">
                    {produtos?.map((produto) => (
                      <div key={produto.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>{produto.name}</Label>
                          <p className="text-sm text-muted-foreground">R$ {produto.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            {...registerPlano(`product_benefits.${produto.id}.type`)}
                          >
                            <option value="">Não incluso</option>
                            <option value="gratuito">Gratuito</option>
                            <option value="desconto">Desconto</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-20 bg-background"
                            placeholder="%"
                            {...registerPlano(`product_benefits.${produto.id}.discount`)}
                            disabled={watchPlano(`product_benefits.${produto.id}.type`) !== 'desconto'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limites de Benefícios */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Limite de Uso Mensal dos Benefícios</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="benefits_unlimited" 
                        checked={watchPlano("max_benefits_per_month") === 0}
                        onCheckedChange={(checked) => {
                          setValuePlano("max_benefits_per_month", checked ? 0 : 1);
                        }}
                      />
                      <Label htmlFor="benefits_unlimited">Sem limites de uso mensal</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_benefits_per_month">Máximo de benefícios por mês</Label>
                      <p className="text-sm text-muted-foreground">Este limite se renova mensalmente durante todo o período da assinatura</p>
                      <Input
                        id="max_benefits_per_month"
                        type="number"
                        min="1"
                        className="bg-background"
                        disabled={watchPlano("max_benefits_per_month") === 0}
                        {...registerPlano("max_benefits_per_month")}
                      />
                    </div>
                  </div>
                </div>

                {/* Adicionar campo de seleção de dias no formulário de criação de plano */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Dias Permitidos para Uso da Assinatura</h3>
                  <div className="flex flex-wrap gap-4 items-center mb-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={diasSelecionados.length === DIAS_SEMANA.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setDiasSelecionados(DIAS_SEMANA.map(d => d.value));
                          } else {
                            setDiasSelecionados([]);
                          }
                        }}
                      />
                      Todos os dias
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {DIAS_SEMANA.map((dia) => (
                      <label key={dia.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={diasSelecionados.includes(dia.value)}
                          onChange={e => {
                            if (e.target.checked) {
                              setDiasSelecionados([...diasSelecionados, dia.value]);
                            } else {
                              setDiasSelecionados(diasSelecionados.filter(d => d !== dia.value));
                            }
                          }}
                        />
                        {dia.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenPlano(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmittingPlano}>
                    {isSubmittingPlano ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {/* Dialog de edição de plano */}
          <Dialog open={!!editingPlano} onOpenChange={(v) => { if (!v) { setEditingPlano(null); resetPlano(); } }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
              <DialogHeader>
                <DialogTitle>Editar Plano de Assinatura</DialogTitle>
                <DialogDescription>
                  Edite os dados do plano de assinatura
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitPlano((data) => {
                if (diasSelecionados.length === 0) {
                  toast.error("Selecione ao menos um dia da semana para o plano.");
                  return;
                }
                const formData = { ...data, diasSelecionados };
                onSubmitPlanoEdit(formData);
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Plano</Label>
                    <Input 
                      id="name" 
                      className="bg-background"
                      {...registerPlano("name", { required: true })}
                      onChange={handlePlanoNameChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      step="0.01" 
                      className="bg-background"
                      {...registerPlano("price", { required: true })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input 
                    id="description" 
                    className="bg-background"
                    {...registerPlano("description")} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration_months">Duração e Renovação do Plano (meses)</Label>
                    <select
                      id="duration_months"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...registerPlano("duration_months", { required: true })}
                    >
                      <option value="1">1 mês</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                </div>

                {/* Seção de Benefícios de Serviços */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Benefícios de Serviços</h3>
                  <div className="space-y-2">
                    {servicos?.map((servico) => (
                      <div key={servico.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>{servico.name}</Label>
                          <p className="text-sm text-muted-foreground">R$ {servico.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            {...registerPlano(`service_benefits.${servico.id}.type`)}
                          >
                            <option value="">Não incluso</option>
                            <option value="gratuito">Gratuito</option>
                            <option value="desconto">Desconto</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-20 bg-background"
                            placeholder="%"
                            {...registerPlano(`service_benefits.${servico.id}.discount`)}
                            disabled={watchPlano(`service_benefits.${servico.id}.type`) !== 'desconto'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção de Benefícios de Produtos */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Benefícios de Produtos</h3>
                  <div className="space-y-2">
                    {produtos?.map((produto) => (
                      <div key={produto.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>{produto.name}</Label>
                          <p className="text-sm text-muted-foreground">R$ {produto.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            {...registerPlano(`product_benefits.${produto.id}.type`)}
                          >
                            <option value="">Não incluso</option>
                            <option value="gratuito">Gratuito</option>
                            <option value="desconto">Desconto</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-20 bg-background"
                            placeholder="%"
                            {...registerPlano(`product_benefits.${produto.id}.discount`)}
                            disabled={watchPlano(`product_benefits.${produto.id}.type`) !== 'desconto'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limites de Benefícios */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Limite de Uso Mensal dos Benefícios</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="benefits_unlimited" 
                        checked={watchPlano("max_benefits_per_month") === 0}
                        onCheckedChange={(checked) => {
                          setValuePlano("max_benefits_per_month", checked ? 0 : 1);
                        }}
                      />
                      <Label htmlFor="benefits_unlimited">Sem limites de uso mensal</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_benefits_per_month">Máximo de benefícios por mês</Label>
                      <p className="text-sm text-muted-foreground">Este limite se renova mensalmente durante todo o período da assinatura</p>
                      <Input
                        id="max_benefits_per_month"
                        type="number"
                        min="1"
                        className="bg-background"
                        disabled={watchPlano("max_benefits_per_month") === 0}
                        {...registerPlano("max_benefits_per_month")}
                      />
                    </div>
                  </div>
                </div>

                {/* Adicionar campo de seleção de dias no formulário de criação de plano */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="font-medium">Dias Permitidos para Uso da Assinatura</h3>
                  <div className="flex flex-wrap gap-4 items-center mb-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={diasSelecionados.length === DIAS_SEMANA.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setDiasSelecionados(DIAS_SEMANA.map(d => d.value));
                          } else {
                            setDiasSelecionados([]);
                          }
                        }}
                      />
                      Todos os dias
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {DIAS_SEMANA.map((dia) => (
                      <label key={dia.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={diasSelecionados.includes(dia.value)}
                          onChange={e => {
                            if (e.target.checked) {
                              setDiasSelecionados([...diasSelecionados, dia.value]);
                            } else {
                              setDiasSelecionados(diasSelecionados.filter(d => d !== dia.value));
                            }
                          }}
                        />
                        {dia.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => { setEditingPlano(null); resetPlano(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmittingPlano || mutationEditPlano.isPending}>
                    {isSubmittingPlano || mutationEditPlano.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {isLoadingPlanos ? (
            <div className="col-span-full flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : planos?.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              Nenhum plano cadastrado
            </div>
          ) : (
            planos?.map((plano) => (
              <Card key={plano.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex flex-col gap-1">
                    <span>{plano.name}</span>
                    <span className="text-sm text-muted-foreground">R$ {Number(plano.price).toFixed(2)} / {plano.duration_months} mês(es)</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPlano(plano)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                      onClick={() => setConfirmDesativarPlano(plano)}
                      className={plano.active ? "text-red-500 hover:text-red-700 hover:bg-red-100" : "text-green-500 hover:text-green-700 hover:bg-green-100"}
                      title={plano.active ? "Desativar Plano" : "Ativar Plano"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{plano.description}</p>
                    <p>Status: <b className={plano.active ? 'text-green-600' : 'text-red-600'}>{plano.active ? 'Ativo' : 'Inativo'}</b></p>
                    
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assinaturas de clientes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display text-barber-dark">Assinaturas</h1>
          <Dialog open={openSubscription} onOpenChange={setOpenSubscription}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Adesão</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
              <DialogHeader>
                <DialogTitle>Nova Adesão de Assinatura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente</Label>
                  <select
                    id="client_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("client_id", { required: true })}
                    disabled={isLoadingClientes}
                  >
                    <option value="">Selecione o cliente</option>
                    {clientes?.map((c) => {
                      const jaTemRestrita = assinaturas?.some(
                        (ass) => ass.client_id === c.id && ['ativa', 'inadimplente', 'suspensa'].includes(ass.status)
                      );
                      return (
                        <option key={c.id} value={c.id} disabled={jaTemRestrita}>
                          {c.name} {jaTemRestrita ? '(Já possui uma Assinatura)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription_plan_id">Plano de Assinatura</Label>
                  <select
                    id="subscription_plan_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("subscription_plan_id", { required: true })}
                    disabled={isLoadingPlanos}
                  >
                    <option value="">Selecione o plano</option>
                    {planos?.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.active}>
                        {p.name} {p.active ? '' : '(Inativo)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register("start_date", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Término (opcional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...register("end_date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("status", { required: true })}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="suspensa">Suspensa</option>
                    <option value="expirada">Expirada</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenSubscription(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                    {isSubmitting || mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : assinaturas?.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              Nenhuma assinatura encontrada
            </div>
          ) : (
            assinaturas?.map((assinatura) => {
              // Buscar todos os pagamentos para esta assinatura
              const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === assinatura.id) || [];
              const plano = planos?.find(p => p.id === assinatura.subscription_plan_id);
              const hoje = new Date();
              
              // Filtrar pagamentos do ciclo atual
              const pagamentosCicloAtual = pagamentosAssinatura.filter(
                p => p.cycle_start_date === assinatura.start_date && p.cycle_end_date === assinatura.end_date
              );

              // Novo cálculo do status do pagamento do ciclo
              let statusPagamento = "Sem pagamento";
              let corStatus = "text-muted-foreground";
              if (plano && pagamentosCicloAtual.length > 0) {
                const somaPagamentosCiclo = pagamentosCicloAtual.reduce((acc, p) => acc + Number(p.amount), 0);
                if (somaPagamentosCiclo >= Number(plano.price)) {
                  statusPagamento = "Pago";
                  corStatus = "text-green-600 font-bold";
                } else if (somaPagamentosCiclo > 0) {
                  statusPagamento = "Pendente";
                  corStatus = "text-orange-400 font-semibold";
                } else {
                  statusPagamento = "Aguardando";
                  corStatus = "text-muted-foreground";
                }
              }

              // Botão de Renovar Assinatura para expirada/cancelada
              const podeRenovar = assinatura.status === 'expirada' || 
                                 (assinatura.status === 'cancelada' && assinatura.end_date && isAfter(hoje, parseISO(assinatura.end_date)));

              return (
                <Card key={assinatura.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium flex flex-col gap-1">                        
                        <span>{assinatura.client_name || 'Cliente'}</span>
                        <span className="text-lg text-muted-foreground">{assinatura.plan_name || 'Plano'}</span>
                      </CardTitle>
                      {/* Botão de registrar pagamento só aparece se status assinatura = ativa ou inadimplente e statusPagamento = Pendente ou Aguardando ou Sem pagamento*/}
                      {(assinatura.status === 'ativa' || assinatura.status === 'inadimplente') && (statusPagamento === 'Pendente' || statusPagamento === 'Aguardando' || statusPagamento === 'Sem pagamento') && podeRegistrarPagamento(assinatura, pagamentosAssinatura, plano, 1) && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setAssinaturaParaPagamento({ id: assinatura.id, valorPadrao: planos?.find(p => p.id === assinatura.subscription_plan_id)?.price || "" });
                            setOpenPagamento(true);
                          }}
                        >
                          Registrar Pagamento
                        </Button>
                      )}
                      {/* Botão de Renovar Assinatura */}
                      {podeRenovar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-blue-500 border-blue-400"
                          onClick={() => setModalRenovar({ assinatura })}
                        >
                          Renovar Assinatura
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Botão para ativar manualmente a assinatura */}
                      {assinatura.status !== 'ativa' && assinatura.status !== 'inadimplente' && (
                        <Button size="icon" variant="ghost" onClick={() => setConfirmarStatus({ id: assinatura.id, status: 'ativa' })} title="Ativar Assinatura" className="text-green-600 hover:text-green-700 hover:bg-green-100">
                          <span className="sr-only">Ativar Assinatura</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setConfirmarStatus({ id: assinatura.id, status: 'suspensa' })} title="Suspender Assinatura" disabled={assinatura.status === 'suspensa' || loadingStatus === assinatura.id + 'suspensa'}>
                        <PauseCircle className={assinatura.status === 'suspensa' ? 'text-orange-600' : ''} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmarStatus({ id: assinatura.id, status: 'cancelada' })} title="Cancelar Assinatura" disabled={assinatura.status === 'cancelada' || loadingStatus === assinatura.id + 'cancelada'}>
                        <XCircle className={assinatura.status === 'cancelada' ? 'text-red-600' : ''} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {assinatura.status === 'inadimplente' && (
                        <div className="mb-2 p-2 rounded bg-orange-100 border border-orange-300 text-orange-700 font-semibold flex items-center gap-2">
                          <span>⚠️ Assinatura inadimplente! Regularize os pagamentos para evitar expiração ou cancelamento.</span>
                        </div>
                      )}
                      <p>Status: <b className={
                        assinatura.status === 'ativa' ? 'text-green-600 font-semibold' :
                        //assinatura.status === 'inadimplente' ? 'text-orange-400 font-semibold' :
                        ['suspensa', 'cancelada'].includes(assinatura.status) ? 'text-red-600 font-semibold' :
                        ''
                      }>{assinatura.status}</b></p>
                      <p>Status do Pagamento: <b className={corStatus}>{statusPagamento}</b></p>
                      {/* Valor restante ou total pago */}
                      {(() => {
                        if (!plano || pagamentosCicloAtual.length === 0) return null;
                        const somaPagamentosCiclo = pagamentosCicloAtual.reduce((acc, p) => acc + Number(p.amount), 0);
                        if (somaPagamentosCiclo >= Number(plano.price)) {
                          return (
                            <p className="text-green-600 font-semibold">Total pago: R$ {Number(somaPagamentosCiclo).toFixed(2)}</p>
                          );
                        } else {
                          const falta = Number(plano.price) - somaPagamentosCiclo;
                          return (
                            <p className="text-orange-400 font-semibold">Falta pagar: R$ {falta.toFixed(2)}</p>
                          );
                        }
                      })()}
                      <p>Início: {assinatura.start_date ? format(parseISO(assinatura.start_date), "dd-MM-yyyy") : '-'}</p>
                      <p>Fim: {assinatura.end_date ? format(parseISO(assinatura.end_date), "dd-MM-yyyy") : '-'}</p>
                    </div>
                    {/* Histórico de Pagamentos */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-barber-dark text-sm">Histórico de Pagamentos</span>
                        <Button size="icon" variant="ghost" onClick={() => setModalPagamentos({ assinaturaId: assinatura.id })} title="Ver todos os pagamentos">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          {/*<thead>
                            <tr className="border-b border-muted">
                              <th className="py-1 pr-2 font-semibold">Data</th>
                              <th className="py-1 pr-2 font-semibold">Valor</th>
                              <th className="py-1 pr-2 font-semibold">Pgto Total</th>
                              <th className="py-1 pr-2 font-semibold">Método</th>
                              
                              
                            </tr>
                          </thead>*/}
                          <tbody>
                            {pagamentosCicloAtual
                              .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
                              .slice(0, 3)
                              .map((p) => (
                                <tr key={p.id} className="border-b border-muted last:border-b-0">
                                  <td className="py-1 pr-2">{p.payment_date ? format(parseISO(p.payment_date), "dd-MM-yyyy") : '-'}</td>
                                  <td className="py-1 pr-2">R$ {p.amount ? Number(p.amount).toFixed(2) : '-'}</td>
                                  <td className={
                                    'py-1 pr-2 ' + (
                                      p.status === 'pago' ? 'text-green-600' :
                                      p.status === 'pendente' ? 'text-yellow-600' :
                                      p.status === 'falhou' ? 'text-red-600' : 'text-muted-foreground'
                                    )
                                  }>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</td>
                                  <td className="py-1 pr-2">{p.payment_method || '-'}</td>
                                  
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deletingPlano} onOpenChange={(v) => { if (!v) setDeletingPlano(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
          </AlertDialogHeader>
          <p>Certeza que deseja excluir o Plano <b>{deletingPlano?.name}</b>? <br></br>Detalhe: O Plano será apenas desativado.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPlano && mutationDeletePlano.mutate(deletingPlano)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de pagamento */}
      <Dialog open={openPagamento} onOpenChange={(v) => { setOpenPagamento(v); if (!v) { setAssinaturaParaPagamento(null); resetPagamento(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Assinatura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPagamento(onSubmitPagamento)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" step="0.01" {...registerPagamento("amount", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data do Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                {...registerPagamento("payment_date", { required: true })}
                min={(() => {
                  // Buscar assinatura para pegar start_date
                  const assinatura = assinaturas?.find(a => a.id === assinaturaParaPagamento?.id);
                  return assinatura?.start_date?.slice(0, 10) || getHojeISO();
                })()}
                max={getHojeISO()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pagamento</Label>
              <select
                id="payment_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                {...registerPagamento("payment_method", { required: true })}
              >
                <option value="">Selecione o método</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Pix">Pix</option>                
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => { setOpenPagamento(false); setAssinaturaParaPagamento(null); resetPagamento(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingPagamento || mutationPagamento.isPending}>
                {isSubmittingPagamento || mutationPagamento.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Salvar Pagamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes de pagamentos */}
      <Dialog open={!!modalPagamentos.assinaturaId} onOpenChange={(v) => v ? null : setModalPagamentos({ assinaturaId: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Todos os Pagamentos da Assinatura</DialogTitle>
          </DialogHeader>
          {(() => {
            const assinatura = assinaturas?.find(a => a.id === modalPagamentos.assinaturaId);
            const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
            const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === assinatura?.id) || [];
            // Agrupar pagamentos por ciclo
            const ciclosMap = new Map();
            pagamentosAssinatura.forEach(p => {
              const cicloKey = `${p.cycle_start_date || ''}|${p.cycle_end_date || ''}`;
              if (!ciclosMap.has(cicloKey)) {
                ciclosMap.set(cicloKey, []);
              }
              ciclosMap.get(cicloKey).push(p);
            });
            // Ordenar ciclos do mais recente para o mais antigo
            const ciclosOrdenados = Array.from(ciclosMap.entries()).sort((a, b) => {
              // Ordenar pelo cycle_start_date decrescente
              const aStart = a[1][0]?.cycle_start_date || '';
              const bStart = b[1][0]?.cycle_start_date || '';
              return bStart.localeCompare(aStart);
            });
            // Renderizar agrupamento
            if (ciclosOrdenados.length === 0) {
              return <div className="text-muted-foreground text-sm py-2">Nenhum pagamento registrado.</div>;
            }
            return (
              <div className="overflow-x-auto">
                {ciclosOrdenados.map(([cicloKey, pagamentosCiclo]) => {
                  const [cicloStart, cicloEnd] = cicloKey.split('|');
                  // Ordenar pagamentos do ciclo por data de pagamento decrescente
                  const pagamentosOrdenados = pagamentosCiclo.sort((a, b) => (b.payment_date > a.payment_date ? 1 : -1));
                  // Calcular soma dos pagamentos do ciclo
                  const somaPagamentosCiclo = pagamentosCiclo.reduce((acc, p) => acc + Number(p.amount || 0), 0);
                  // Descobrir valor do plano (pega do primeiro pagamento do ciclo)
                  const valorPlano = plano?.price ? Number(plano.price) : 0;
                  // Definir cor do ciclo
                  let corCiclo = 'text-barber-dark';
                  if (valorPlano > 0) {
                    if (somaPagamentosCiclo >= valorPlano) {
                      corCiclo = 'text-green-600';
                    } else {
                      corCiclo = 'text-orange-400 font-semibold';
                    }
                  }
                  return (
                    <div key={cicloKey} className="mb-6">
                      <div className={`font-semibold text-sm mb-2 ${corCiclo} flex items-center gap-4`}>
                        Ciclo: {cicloStart && cicloEnd ? (
                          <span>
                            {format(parseISO(cicloStart), 'dd MMM yyyy', { locale: ptBR }).toUpperCase()}
                            {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0até\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                            {format(parseISO(cicloEnd), 'dd MMM yyyy', { locale: ptBR }).toUpperCase()}
                          </span>
                        ) : 'Sem ciclo definido'}
                        <span className={somaPagamentosCiclo >= valorPlano ? 'text-green-600 ml-8' : 'text-orange-500 ml-8'}>
                          {somaPagamentosCiclo >= valorPlano ? 'Assinatura Paga' : 'Pagamento Pendente'}
                        </span>
                      </div>
                      <table className="min-w-full text-xs text-left mb-2">
                        <thead>
                          <tr className="border-b border-muted">
                            <th className="py-1 pr-2 font-semibold">Data</th>
                            <th className="py-1 pr-2 font-semibold">Valor</th>
                            <th className="py-1 pr-2 font-semibold">Pgto Total</th>
                            <th className="py-1 pr-2 font-semibold">Método</th>
                            <th className="py-1 pr-2 font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagamentosOrdenados.map((p) => (
                            <tr key={p.id} className="border-b border-muted last:border-b-0">
                              <td className="py-1 pr-2">{p.payment_date ? format(parseISO(p.payment_date), "dd-MM-yyyy") : '-'}</td>
                              <td className="py-1 pr-2">R$ {p.amount ? Number(p.amount).toFixed(2) : '-'}</td>
                              <td className={
                                'py-1 pr-2 ' + (
                                  p.status === 'pago' ? 'text-green-600' :
                                  p.status === 'pendente' ? 'text-yellow-600' :
                                  p.status === 'falhou' ? 'text-red-600' : 'text-muted-foreground'
                                )
                              }>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</td>
                              <td className="py-1 pr-2">{p.payment_method || '-'}</td>
                              <td className="py-1 pr-2 flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => setPagamentoEditando(p)} title="Editar Pagamento"><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setPagamentoParaRemover(p)} title="Remover Pagamento"><Trash2 className="h-4 w-4" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Modal de edição de pagamento */}
          <Dialog open={!!pagamentoEditando} onOpenChange={(v) => { if (!v) setPagamentoEditando(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Pagamento</DialogTitle>
              </DialogHeader>
              {pagamentoEditando && (
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  mutationEditarPagamento.mutate({
                    ...pagamentoEditando,
                    amount: pagamentoEditando.amount,
                    payment_date: pagamentoEditando.payment_date,
                    payment_method: pagamentoEditando.payment_method,
                    client_subscription_id: pagamentoEditando.client_subscription_id,
                    id: pagamentoEditando.id
                  });
                  setPagamentoEditando(null);
                }}>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input type="number" step="0.01" value={pagamentoEditando.amount} onChange={e => setPagamentoEditando({ ...pagamentoEditando, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data do Pagamento</Label>
                    <Input type="date" value={pagamentoEditando.payment_date?.slice(0, 10)} onChange={e => setPagamentoEditando({ ...pagamentoEditando, payment_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Pagamento</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={pagamentoEditando.payment_method} onChange={e => setPagamentoEditando({ ...pagamentoEditando, payment_method: e.target.value })}>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Pix">Pix</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setPagamentoEditando(null)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão de pagamento */}
      <AlertDialog open={!!pagamentoParaRemover} onOpenChange={(v) => { if (!v) setPagamentoParaRemover(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mb-4">
            Tem certeza que deseja excluir este pagamento de assinatura?
            <br />
            <span className="text-sm text-muted-foreground">O lançamento financeiro correspondente também será excluído do sistema.</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPagamentoParaRemover(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pagamentoParaRemover) {
                mutationRemoverPagamento.mutate({ id: pagamentoParaRemover.id, client_subscription_id: pagamentoParaRemover.client_subscription_id });
              }
              setPagamentoParaRemover(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Renovação de Assinatura */}
      <Dialog open={!!modalRenovar.assinatura} onOpenChange={(v) => { if (!v) { setModalRenovar({ assinatura: null }); setRenovarCobranca(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Assinatura</DialogTitle>
          </DialogHeader>
          {modalRenovar.assinatura && !renovarCobranca && (
            <div className="space-y-4">
              <DialogDescription>
                Deseja cobrar o valor do ciclo anterior (pendente) ou perdoar a dívida?<br />
                Se escolher cobrar, será lançado o pagamento do ciclo anterior antes de renovar.<br />
                Se escolher perdoar, o ciclo anterior será ignorado e a renovação será feita normalmente.
              </DialogDescription>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setRenovarCobranca('perdoar'); }}>Perdoar Dívida</Button>
                <Button onClick={() => { setRenovarCobranca('cobrar'); }}>Cobrar Ciclo Anterior</Button>
              </div>
            </div>
          )}
          {/* Fluxo de perdão: só renovar e abrir modal de pagamento do novo ciclo */}
          {modalRenovar.assinatura && renovarCobranca === 'perdoar' && (
            <div className="space-y-4">
              <DialogDescription>
                O ciclo anterior será ignorado. Um novo ciclo será iniciado a partir de hoje.<br />
                Deseja continuar?
              </DialogDescription>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setRenovarCobranca(null); }}>Cancelar</Button>
                <Button onClick={handleRenovarPerdoar}>Renovar e Registrar Pagamento do Novo Ciclo</Button>
              </div>
            </div>
          )}
          {/* Fluxo de cobrança: mostrar valor devido e formulário de pagamento */}
          {modalRenovar.assinatura && renovarCobranca === 'cobrar' && (() => {
            const assinatura = modalRenovar.assinatura;
            const plano = planos?.find(p => p.id === assinatura.subscription_plan_id);
            const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === assinatura.id) || [];
            const valorDevido = calcularValorDevido(assinatura, pagamentosAssinatura, plano);
            if (valorDevido <= 0) {
              return (
                <div className="space-y-4">
                  <DialogDescription>Não há valor pendente a ser cobrado do ciclo anterior.</DialogDescription>
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleRenovarPerdoar}>Renovar normalmente</Button>
                  </div>
                </div>
              );
            }
            // Formulário de pagamento do ciclo anterior
            return (
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const payment_method = form.payment_method.value;
                const payment_date = form.payment_date.value;
                await handleRenovarCobrarPagamento({
                  amount: valorDevido,
                  payment_method,
                  payment_date
                });
              }}>
                <DialogDescription>
                  Valor devido do ciclo anterior: <b>R$ {valorDevido.toFixed(2)}</b><br />
                  Preencha os dados do pagamento para quitar a pendência e renovar a assinatura.
                </DialogDescription>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Data do Pagamento</label>
                  <Input
                    name="payment_date"
                    type="date"
                    required
                    min={assinatura.start_date}
                    max={getHojeISO()}
                    defaultValue={getHojeISO()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Método de Pagamento</label>
                  <select name="payment_method" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required>
                    <option value="">Selecione o método</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Pix">Pix</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" type="button" onClick={() => { setRenovarCobranca(null); }}>Cancelar</Button>
                  <Button type="submit">Quitar Pendência e Renovar</Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para suspender/cancelar/ativar assinatura */}
      <AlertDialog open={!!confirmarStatus} onOpenChange={(v) => { if (!v) setConfirmarStatus(null); }}>
        <AlertDialogContent className={confirmarStatus?.status === 'ativa' ? 'bg-white' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmarStatus?.status === 'ativa' ? 'text-green-600' : 'text-red-600'}>
              {confirmarStatus?.status === 'suspensa' && 'Suspender Assinatura'}
              {confirmarStatus?.status === 'cancelada' && 'Cancelar Assinatura'}
              {confirmarStatus?.status === 'ativa' && 'Ativar Assinatura'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className={confirmarStatus?.status === 'ativa' ? 'mb-4 text-green-700' : 'mb-4 text-red-700'}>
            {confirmarStatus?.status === 'suspensa' && (
              <>
                Tem certeza que deseja suspender esta assinatura?
                <br />Esta ação pode ser revertida depois, mas pode impactar no uso do cliente.
                <br />Faça isso apenas se o cliente solicitar a suspensão ou cancelamento.
              </>
            )}
            {confirmarStatus?.status === 'cancelada' && (
              <>
                Tem certeza que deseja cancelar esta assinatura?
                <br />Esta ação pode ser revertida depois, mas pode impactar no uso do cliente.
                <br />Faça isso apenas se o cliente solicitar a suspensão ou cancelamento.
              </>
            )}
            {confirmarStatus?.status === 'ativa' && (
              <>
                Tem certeza que deseja ativar esta assinatura manualmente?
                <br />Esta ação reativa o acesso do cliente imediatamente.
                <br />Faça isso apenas se o cliente solicitar a reativação.
              </>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmarStatus(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={confirmarStatus?.status === 'ativa' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} onClick={async () => {
              if (confirmarStatus) {
                await atualizarStatusManual(confirmarStatus.id, confirmarStatus.status!);
                setConfirmarStatus(null);
              }
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de alerta de duplicidade de pagamento */}
      <AlertDialog open={modalDuplicidade} onOpenChange={setModalDuplicidade}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pagamento Duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um pagamento com os mesmos dados (valor, data e método) para esta assinatura.<br />
              Por favor, verifique os dados antes de tentar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setModalDuplicidade(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação para data retroativa */}
      <AlertDialog open={!!modalRetroativo?.open} onOpenChange={(v) => { if (!v) setModalRetroativo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de Data Retroativa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está lançando um pagamento com data retroativa.<br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setModalRetroativo(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (modalRetroativo?.data) {
                // Buscar assinatura, plano e pagamentos do ciclo novamente para garantir
                const assinatura = assinaturas?.find(a => a.id === modalRetroativo.data.client_subscription_id);
                const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
                const pagamentosAssinatura = pagamentos?.filter(p => p.client_subscription_id === modalRetroativo.data.client_subscription_id) || [];
                if (!podeRegistrarPagamento(assinatura, pagamentosAssinatura, plano, modalRetroativo.data.amount)) {
                  toast.error("O valor total dos pagamentos não pode ultrapassar o valor do ciclo da assinatura.");
                  setModalRetroativo(null);
                  return;
                }
                mutationPagamento.mutate(modalRetroativo.data);
              }
              setModalRetroativo(null);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação para desativar/ativar plano */}
      <AlertDialog open={!!confirmDesativarPlano} onOpenChange={(v) => { if (!v) setConfirmDesativarPlano(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDesativarPlano?.active ? 'Desativar' : 'Ativar'} Plano</AlertDialogTitle>
          </AlertDialogHeader>
          <p>
            {confirmDesativarPlano?.active ? (
              <>
                Tem certeza que deseja desativar o plano <b>{confirmDesativarPlano.name}</b>?<br/>
                Planos desativados não poderão ser selecionados para novas assinaturas.
              </>
            ) : (
              <>
                Tem certeza que deseja ativar o plano <b>{confirmDesativarPlano?.name}</b>?<br/>
                Planos ativos podem ser selecionados para novas assinaturas.
              </>
            )}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDesativarPlano(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (confirmDesativarPlano) {
                  await supabase
                    .from('subscription_plans')
                    .update({ active: !confirmDesativarPlano.active })
                    .eq('id', confirmDesativarPlano.id)
                    .eq('barber_shop_id', selectedBarberShop?.id);
                  queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
                  refetchPlanos();
                  setConfirmDesativarPlano(null);
                }
              }}
              className={confirmDesativarPlano?.active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {confirmDesativarPlano?.active ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Assinaturas; 