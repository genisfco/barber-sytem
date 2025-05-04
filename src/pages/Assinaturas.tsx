import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Trash2, Eye, Edit, XCircle, PauseCircle } from "lucide-react";
import type { Subscription } from "@/types/subscription";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addMonths, parseISO, format, subDays, isAfter } from "date-fns";
import { useClientes } from "@/hooks/useClientes";
import { atualizarStatusAssinatura } from "@/lib/subscriptionStatusManager";

interface SubscriptionWithDetails extends Subscription {
  client_name?: string;
  plan_name?: string;
}

const Assinaturas = () => {
  const { data: assinaturas, isLoading } = useQuery<SubscriptionWithDetails[]>({
    queryKey: ["assinaturas"],
    queryFn: async () => {
      // Busca assinaturas com detalhes do cliente e do plano
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`*, clients(name), subscription_plans(name)`) // join
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Ajusta para facilitar o uso no front
      return (data || []).map((row: any) => ({
        ...row,
        client_name: row.clients?.name,
        plan_name: row.subscription_plans?.name,
      }));
    },
  });

  // Buscar clientes ativos
  const { data: clientes, isLoading: isLoadingClientes } = useQuery<any[]>({
    queryKey: ["clientes-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar planos ativos (já existe, mas vamos buscar todos para exibir no topo)
  const { data: planos, isLoading: isLoadingPlanos, refetch: refetchPlanos } = useQuery<any[]>({
    queryKey: ["planos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar pagamentos das assinaturas
  const { data: pagamentos, isLoading: isLoadingPagamentos } = useQuery<any[]>({
    queryKey: ["pagamentos-assinaturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("id, client_subscription_id, status, payment_date, amount, payment_method")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const [open, setOpen] = useState(false);

  // Formulário
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      client_id: "",
      subscription_plan_id: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "",
      status: "ativa"
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

  const queryClient = useQueryClient();
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
      setOpen(false);
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

  // Modal e formulário para novo plano
  const [openPlano, setOpenPlano] = useState(false);
  const { register: registerPlano, handleSubmit: handleSubmitPlano, reset: resetPlano, formState: { isSubmitting: isSubmittingPlano } } = useForm({
    defaultValues: {
      name: "",
      description: "",
      price: "",
      duration_months: "1",
      active: true
    }
  });
  const mutationPlano = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("subscription_plans")
        .insert({
          name: data.name,
          description: data.description,
          price: Number(data.price),
          duration_months: Number(data.duration_months),
          active: data.active
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
      setOpenPlano(false);
      resetPlano();
      refetchPlanos();
    }
  });
  function onSubmitPlano(data: any) {
    mutationPlano.mutate(data);
  }

  // Estado para edição de plano
  const [editingPlano, setEditingPlano] = useState<any | null>(null);
  // Estado para exclusão
  const [deletingPlano, setDeletingPlano] = useState<any | null>(null);

  // Edição de plano
  useEffect(() => {
    if (editingPlano) {
      resetPlano({
        name: editingPlano.name,
        description: editingPlano.description,
        price: editingPlano.price,
        duration_months: editingPlano.duration_months,
        active: editingPlano.active
      });
    }
  }, [editingPlano, resetPlano]);

  const mutationEditPlano = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: data.name,
          description: data.description,
          price: Number(data.price),
          duration_months: Number(data.duration_months),
          active: data.active
        })
        .eq("id", editingPlano.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
      setOpenPlano(false);
      setEditingPlano(null);
      resetPlano();
      refetchPlanos();
    }
  });
  function onSubmitPlanoEdit(data: any) {
    mutationEditPlano.mutate(data);
  }

  // Exclusão (soft delete)
  const mutationDeletePlano = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ active: false })
        .eq("id", id);
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
      payment_date: new Date().toISOString().slice(0, 10),
      amount: "",
      status: "pago",
      payment_method: ""
    }
  });

  // Buscar clientes para nome no lançamento financeiro
  const { clientes: clientesAll } = useClientes ? useClientes() : { clientes: [] };

  const mutationPagamento = useMutation({
    mutationFn: async (data: any) => {
      // 1. Registrar o pagamento
      const { data: pagamentoCriado, error: errorPagamento } = await supabase
        .from("subscription_payments")
        .insert({
          client_subscription_id: data.client_subscription_id,
          payment_date: data.payment_date,
          amount: Number(data.amount),
          status: data.status,
          payment_method: data.payment_method
        })
        .select()
        .single();
      if (errorPagamento) throw errorPagamento;

      // 2. Se status for 'pago', criar transação financeira e atualizar o pagamento com o id da transação
      if (data.status === "pago") {
        const assinatura = assinaturas?.find(a => a.id === data.client_subscription_id);
        const cliente = clientesAll?.find(c => c.id === assinatura?.client_id);
        const plano = planos?.find(p => p.id === assinatura?.subscription_plan_id);
        const { data: transacaoCriada, error: errorTransacao } = await supabase.from("transactions").insert({
          type: "receita",
          value: Number(data.amount),
          description: `Pagamento de assinatura de ${cliente?.name || "Cliente"} - ${plano?.name || "Plano"}`,
          payment_method: data.payment_method,
          category: "assinaturas"
        }).select().single();
        if (errorTransacao) throw errorTransacao;
        // Atualizar o pagamento com o id da transação
        if (transacaoCriada && pagamentoCriado) {
          await supabase.from("subscription_payments").update({ transaction_id: transacaoCriada.id }).eq("id", pagamentoCriado.id);
        }
      }

      // Atualizar status da assinatura automaticamente
      const assinaturaAtualizada = assinaturas?.find(a => a.id === data.client_subscription_id);
      const planoAtualizado = planos?.find(p => p.id === assinaturaAtualizada?.subscription_plan_id);
      const { data: pagamentosAtualizados } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("client_subscription_id", data.client_subscription_id);
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado);
      }
    },
    onSuccess: () => {
      setOpenPagamento(false);
      setAssinaturaParaPagamento(null);
      resetPagamento();
      queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas"] });
    }
  });
  function onSubmitPagamento(data: any) {
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

      // Atualizar status da assinatura automaticamente
      const assinaturaAtualizada = assinaturas?.find(a => a.id === data.client_subscription_id);
      const planoAtualizado = planos?.find(p => p.id === assinaturaAtualizada?.subscription_plan_id);
      const { data: pagamentosAtualizados } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("client_subscription_id", data.client_subscription_id);
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-assinaturas"] });
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
      if (assinaturaAtualizada && planoAtualizado && pagamentosAtualizados) {
        await atualizarStatusAssinatura(assinaturaAtualizada, pagamentosAtualizados, planoAtualizado);
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
    setLoadingStatus(assinaturaId + status);
    await supabase.from('client_subscriptions').update({ status }).eq('id', assinaturaId);
    setLoadingStatus(null);
    queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
  }

  // Estado para controlar o pagamento a ser removido
  const [pagamentoParaRemover, setPagamentoParaRemover] = useState<any | null>(null);

  return (
    <div className="p-6 space-y-8">
      {/* Planos de assinatura no topo */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display text-barber-dark">Planos de Assinatura</h1>
          {/* Dialog de criação de plano */}
          <Dialog open={openPlano} onOpenChange={setOpenPlano}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Plano</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Plano de Assinatura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitPlano(onSubmitPlano)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input id="name" {...registerPlano("name", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" {...registerPlano("description")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input id="price" type="number" step="0.01" {...registerPlano("price", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duração (meses)</Label>
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
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenPlano(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmittingPlano || mutationPlano.isPending}>
                    {isSubmittingPlano || mutationPlano.isPending ? (
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Plano de Assinatura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitPlano(onSubmitPlanoEdit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input id="name" {...registerPlano("name", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" {...registerPlano("description")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input id="price" type="number" step="0.01" {...registerPlano("price", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duração (meses)</Label>
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
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" {...registerPlano("active")} />
                  <Label htmlFor="active">Plano Ativo</Label>
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
                      onClick={() => setDeletingPlano(plano)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
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
          <h1 className="text-2xl font-display text-barber-dark">Assinaturas de Clientes</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Adesão de Assinatura</Button>
            </DialogTrigger>
            <DialogContent>
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
                    {clientes?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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
                      <option key={p.id} value={p.id}>{p.name}</option>
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
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
              
              // Função para calcular o ciclo atual
              function getCicloAtual(assinatura, plano) {
                if (!assinatura.start_date || !plano?.duration_months) return null;
                const start = parseISO(assinatura.start_date);
                let cicloInicio = start;
                let cicloFim = addMonths(start, Number(plano.duration_months));
                // Se já passou do primeiro ciclo, avançar até encontrar o ciclo atual
                while (isAfter(hoje, cicloFim)) {
                  cicloInicio = cicloFim;
                  cicloFim = addMonths(cicloInicio, Number(plano.duration_months));
                }
                return { inicio: cicloInicio, fim: subDays(cicloFim, 1) };
              }

              const cicloAtual = getCicloAtual(assinatura, plano);
              let statusPagamento = "Sem pagamento";
              let corStatus = "text-muted-foreground";

              if (cicloAtual) {
                // Verifica se existe pagamento "pago" para o ciclo atual
                const pagamentoCiclo = pagamentosAssinatura.find(p => {
                  if (!p.payment_date) return false;
                  const dataPgto = parseISO(p.payment_date);
                  return (
                    isAfter(dataPgto, cicloAtual.inicio) || dataPgto.getTime() === cicloAtual.inicio.getTime()
                  ) && (
                    isAfter(cicloAtual.fim, dataPgto) || dataPgto.getTime() === cicloAtual.fim.getTime()
                  ) && p.status === "pago";
                });
                if (pagamentoCiclo) {
                  statusPagamento = "Pago";
                  corStatus = "text-green-600";
                } else if (isAfter(hoje, cicloAtual.fim)) {
                  statusPagamento = "Pendente";
                  corStatus = "text-yellow-600";
                } else {
                  statusPagamento = "Aguardando";
                  corStatus = "text-muted-foreground";
                }
              }

              return (
                <Card key={assinatura.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium flex flex-col gap-1">
                        <span>{assinatura.plan_name || 'Plano'}</span>
                        <span className="text-sm text-muted-foreground">{assinatura.client_name || 'Cliente'}</span>
                      </CardTitle>
                      {/* Botão de registrar pagamento só aparece se status assinatura = ativa e statusPagamento = Pendente ou Aguardando */}
                      {assinatura.status === 'ativa' && (statusPagamento === 'Pendente' || statusPagamento === 'Aguardando') && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setAssinaturaParaPagamento({ id: assinatura.id, valorPadrao: planos?.find(p => p.id === assinatura.subscription_plan_id)?.price || "" });
                            setOpenPagamento(true);
                          }}
                        >
                          Registrar novo pagamento
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setAssinaturaEditando(assinatura)} title="Editar Assinatura">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => atualizarStatusManual(assinatura.id, 'suspensa')} title="Suspender Assinatura" disabled={assinatura.status === 'suspensa' || loadingStatus === assinatura.id + 'suspensa'}>
                        <PauseCircle className={assinatura.status === 'suspensa' ? 'text-yellow-600' : ''} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => atualizarStatusManual(assinatura.id, 'cancelada')} title="Cancelar Assinatura" disabled={assinatura.status === 'cancelada' || loadingStatus === assinatura.id + 'cancelada'}>
                        <XCircle className={assinatura.status === 'cancelada' ? 'text-red-600' : ''} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Status: <b>{assinatura.status}</b></p>
                      <p>Status do Pagamento: <b className={corStatus}>{statusPagamento}</b></p>
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
                          <thead>
                            <tr className="border-b border-muted">
                              <th className="py-1 pr-2 font-semibold">Data</th>
                              <th className="py-1 pr-2 font-semibold">Valor</th>
                              <th className="py-1 pr-2 font-semibold">Status</th>
                              <th className="py-1 pr-2 font-semibold">Método</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagamentosAssinatura
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
          <p>Tem certeza que deseja excluir o plano <b>{deletingPlano?.name}</b>? O plano será desativado.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPlano && mutationDeletePlano.mutate(deletingPlano.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de pagamento */}
      <Dialog open={openPagamento} onOpenChange={(v) => { setOpenPagamento(v); if (!v) { setAssinaturaParaPagamento(null); resetPagamento(); } }}>
        <DialogContent>
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
              <Input id="payment_date" type="date" {...registerPagamento("payment_date", { required: true })} />
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                {...registerPagamento("status", { required: true })}
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="falhou">Falhou</option>
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
            // Função para calcular o ciclo de cada pagamento
            function getPeriodoCiclo(assinatura, plano, paymentDate) {
              if (!assinatura?.start_date || !plano?.duration_months || !paymentDate) return '-';
              const start = parseISO(assinatura.start_date);
              let cicloInicio = start;
              let cicloFim = addMonths(start, Number(plano.duration_months));
              const dataPgto = parseISO(paymentDate);
              while (isAfter(dataPgto, cicloFim)) {
                cicloInicio = cicloFim;
                cicloFim = addMonths(cicloInicio, Number(plano.duration_months));
              }
              return `${format(cicloInicio, 'dd/MM/yyyy')} a ${format(subDays(cicloFim, 1), 'dd/MM/yyyy')}`;
            }
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="py-1 pr-2 font-semibold">Data</th>
                      <th className="py-1 pr-2 font-semibold">Valor</th>
                      <th className="py-1 pr-2 font-semibold">Status</th>
                      <th className="py-1 pr-2 font-semibold">Método</th>
                      <th className="py-1 pr-2 font-semibold">Ciclo</th>
                      <th className="py-1 pr-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentosAssinatura.length === 0 ? (
                      <tr><td colSpan={6} className="text-muted-foreground text-sm py-2">Nenhum pagamento registrado.</td></tr>
                    ) : (
                      pagamentosAssinatura
                        .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
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
                            <td className="py-1 pr-2">{getPeriodoCiclo(assinatura, plano, p.payment_date)}</td>
                            <td className="py-1 pr-2 flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setPagamentoEditando(p)} title="Editar Pagamento"><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setPagamentoParaRemover(p)} title="Remover Pagamento"><Trash2 className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
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
                    status: pagamentoEditando.status,
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
                    <Label>Status</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={pagamentoEditando.status} onChange={e => setPagamentoEditando({ ...pagamentoEditando, status: e.target.value })}>
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente</option>
                      <option value="falhou">Falhou</option>
                    </select>
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

      {/* Modal de edição de assinatura */}
      <Dialog open={!!assinaturaEditando} onOpenChange={(v) => { if (!v) setAssinaturaEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
          </DialogHeader>
          {assinaturaEditando && (
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              await supabase.from('client_subscriptions').update({ status: assinaturaEditando.status }).eq('id', assinaturaEditando.id);
              setAssinaturaEditando(null);
              queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
            }}>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={assinaturaEditando.status} onChange={e => setAssinaturaEditando({ ...assinaturaEditando, status: e.target.value })}>
                  <option value="ativa">Ativa</option>
                  <option value="suspensa">Suspensa</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="expirada">Expirada</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAssinaturaEditando(null)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          )}
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
    </div>
  );
};

export default Assinaturas; 