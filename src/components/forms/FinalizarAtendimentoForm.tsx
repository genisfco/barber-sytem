import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useServicos } from "@/hooks/useServicos";
import { useProdutos } from "@/hooks/useProdutos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Agendamento } from "@/types/agendamento";
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogFooter as ConfirmDialogFooter } from "@/components/ui/dialog";

type PaymentMethod = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix";

const formSchema = z.object({
  servicos: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  produtos: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1, "A quantidade deve ser maior que zero")
  })),
  payment_method: z.enum(["dinheiro", "cartao_credito", "cartao_debito", "pix"], {
    required_error: "Selecione a forma de pagamento"
  })
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
  const [total, setTotal] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      servicos: agendamento.servicos.map(s => s.service_id),
      produtos: agendamento.produtos.map(p => ({
        id: p.product_id,
        quantity: p.quantity
      })),
      payment_method: "dinheiro" as PaymentMethod
    }
  });

  // Efeito para calcular o total inicial
  useEffect(() => {
    calcularTotal();
  }, []);

  const calcularTotal = () => {
    const servicosSelecionados = form.getValues("servicos");
    const produtosSelecionados = form.getValues("produtos");

    const totalServicos = servicosSelecionados.reduce((sum, servicoId) => {
      const servico = servicos?.find(s => s.id === servicoId);
      return sum + (servico?.price || 0);
    }, 0);

    const totalProdutos = produtosSelecionados.reduce((sum, produto) => {
      const produtoInfo = produtos?.find(p => p.id === produto.id);
      return sum + ((produtoInfo?.price || 0) * produto.quantity);
    }, 0);

    setTotal(totalServicos + totalProdutos);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log("🚀 Iniciando finalização do atendimento...", {
        agendamento_id: agendamento.id,
        status_atual: agendamento.status,
        servicos_selecionados: values.servicos,
        produtos_selecionados: values.produtos,
      });
      
      if (!servicos || !produtos) {
        throw new Error("Dados de serviços ou produtos não carregados");
      }

      // Atualiza o agendamento com os serviços e produtos selecionados
      const servicosSelecionados = values.servicos.map(servicoId => {
        const servico = servicos.find(s => s.id === servicoId);
        if (!servico) {
          throw new Error(`Serviço não encontrado: ${servicoId}`);
        }
        return {
          id: crypto.randomUUID(),
          appointment_id: agendamento.id,
          service_id: servicoId,
          service_name: servico.name,
          service_price: servico.price,
          service_duration: servico.duration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const produtosSelecionados = values.produtos.map(produto => {
        const produtoInfo = produtos.find(p => p.id === produto.id);
        if (!produtoInfo) {
          throw new Error(`Produto não encontrado: ${produto.id}`);
        }
        return {
          id: crypto.randomUUID(),
          appointment_id: agendamento.id,
          product_id: produto.id,
          product_name: produtoInfo.name,
          product_price: produtoInfo.price,
          quantity: produto.quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      console.log("📦 Dados preparados para atualização:", {
        servicos: servicosSelecionados.length,
        produtos: produtosSelecionados.length,
        total,
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
        updated_at: new Date().toISOString()
      };

      console.log("📤 Enviando dados para atualização...");

      // Marca como atendido e lança os valores no financeiro
      await marcarComoAtendido.mutateAsync(agendamentoAtualizado);

      console.log("✅ Atendimento finalizado com sucesso!");

      toast({
        title: "Atendimento finalizado!",
        description: `Atendimento do cliente ${agendamento.client_name} finalizado com sucesso.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("❌ Erro ao finalizar atendimento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao finalizar atendimento",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao tentar finalizar o atendimento. Tente novamente.",
      });
    }
  }

  const handleFinalizarClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmFinalizar = () => {
    setConfirmDialogOpen(false);
    form.handleSubmit(onSubmit)();
  };

  const handleCancelFinalizar = () => {
    setConfirmDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Finalizar Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Cliente</h3>
              <p>{agendamento.client_name}</p>
            </div>
            <div>
              <h3 className="font-medium">Barbeiro</h3>
              <p>{agendamento.barber}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Serviços</h3>
                <div className="space-y-2">
                  {servicos?.map((servico) => (
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
                            {servico.name} - R$ {servico.price.toFixed(2)}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Produtos</h3>
                <div className="space-y-2">
                  {produtos?.map((produto) => (
                    <FormField
                      key={produto.id}
                      control={form.control}
                      name="produtos"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.some(p => p.id === produto.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, { id: produto.id, quantity: 1 }]);
                                } else {
                                  field.onChange(current.filter(p => p.id !== produto.id));
                                }
                                calcularTotal();
                              }}
                              disabled={produto.stock === 0}
                            />
                          </FormControl>
                          <FormLabel className={`font-normal ${produto.stock === 0 ? 'text-muted-foreground' : ''}`}>
                            {produto.name} - R$ {produto.price.toFixed(2)}
                            <span className="ml-2 text-sm text-muted-foreground">
                              (Estoque: {produto.stock})
                            </span>
                          </FormLabel>
                          {field.value?.some(p => p.id === produto.id) && (
                            <Input
                              type="number"
                              min="1"
                              max={produto.stock}
                              value={field.value.find(p => p.id === produto.id)?.quantity || 1}
                              onChange={(e) => {
                                const quantidade = parseInt(e.target.value);
                                if (quantidade > produto.stock) return;
                                
                                const current = field.value || [];
                                field.onChange(current.map(p => 
                                  p.id === produto.id 
                                    ? { ...p, quantity: quantidade } 
                                    : p
                                ));
                                calcularTotal();
                              }}
                              className="w-20"
                            />
                          )}
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Forma de Pagamento</h3>
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
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Total</h3>
                  <p className="text-2xl font-bold">R$ {total.toFixed(2)}</p>
                </div>
                <Button type="button" onClick={handleFinalizarClick}>Finalizar Atendimento</Button>
              </div>
            </form>
          </Form>
        </div>

        <ConfirmDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <ConfirmDialogContent>
            <ConfirmDialogHeader>
              <ConfirmDialogTitle>Confirmar Finalização</ConfirmDialogTitle>
            </ConfirmDialogHeader>
            <div className="space-y-4">
              <p>Tem certeza que deseja finalizar o atendimento do cliente <span className="font-bold">{agendamento.client_name}</span>?</p>
              <p>Total: <span className="text-2xl font-bold">R$ {total.toFixed(2)}</span></p>
              <p className="text-sm text-muted-foreground">Apenas confirme a finalização se o cliente já pagou o valor total do atendimento.</p>
              <p className="text-sm text-muted-foreground">ATENÇÃO: Esta ação não poderá ser desfeita.</p>
            </div>
            <ConfirmDialogFooter>
              <Button variant="ghost" onClick={handleCancelFinalizar}>Não</Button>
              <Button onClick={handleConfirmFinalizar}>Sim</Button>
            </ConfirmDialogFooter>
          </ConfirmDialogContent>
        </ConfirmDialog>
      </DialogContent>
    </Dialog>
  );
} 