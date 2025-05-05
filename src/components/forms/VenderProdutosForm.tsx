import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useTransacoes } from "@/hooks/useTransacoes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import React from "react";

type PaymentMethod = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix";

const formSchema = z.object({
  cliente_id: z.union([z.literal("sem_cliente"), z.string()]).optional(),
  produtos: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1, "A quantidade deve ser maior que zero")
  })),
  payment_method: z.enum(["dinheiro", "cartao_credito", "cartao_debito", "pix"], {
    required_error: "Selecione a forma de pagamento"
  })
});

interface VenderProdutosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenderProdutosForm({
  open,
  onOpenChange,
}: VenderProdutosFormProps) {
  const { toast } = useToast();
  const { produtos, updateProduto } = useProdutos();
  const { clientes } = useClientes();
  const { createTransacao } = useTransacoes();
  const [total, setTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      produtos: [],
      payment_method: "dinheiro" as PaymentMethod
    }
  });

  const calcularTotal = () => {
    const produtosSelecionados = form.getValues("produtos");
    const totalProdutos = produtosSelecionados.reduce((sum, produto) => {
      const produtoInfo = produtos?.find(p => p.id === produto.id);
      return sum + ((produtoInfo?.price || 0) * produto.quantity);
    }, 0);

    setTotal(totalProdutos);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      
      // Validar se há produtos selecionados
      if (!values.produtos.length) {
        throw new Error("Selecione pelo menos um produto para vender");
      }

      // Validar estoque
      for (const produtoVenda of values.produtos) {
        const produto = produtos?.find(p => p.id === produtoVenda.id);
        if (!produto) {
          throw new Error("Produto não encontrado");
        }
        if (produto.stock < produtoVenda.quantity) {
          throw new Error(`Estoque insuficiente para o produto ${produto.name}`);
        }
      }

      // Atualizar estoque dos produtos
      for (const produtoVenda of values.produtos) {
        const produto = produtos?.find(p => p.id === produtoVenda.id);
        if (!produto) continue;

        await updateProduto.mutateAsync({
          id: produto.id,
          stock: produto.stock - produtoVenda.quantity
        });
      }

      // Criar descrição detalhada da venda
      const produtosVendidos = values.produtos.map(pv => {
        const produto = produtos?.find(p => p.id === pv.id);
        return `(${pv.quantity}x) ${produto?.name}`;
      }).join(", ");

      const cliente = values.cliente_id && values.cliente_id !== "sem_cliente" 
        ? clientes?.find(c => c.id === values.cliente_id)?.name 
        : "Cliente";

      // Lançar transação financeira
      await createTransacao.mutateAsync({
        type: "receita",
        value: total,
        description: `Venda para ${cliente}. Produtos: ${produtosVendidos}`,
        payment_method: values.payment_method,
        category: "produtos",
        payment_date: new Date().toISOString().slice(0, 10)
      });

      toast({
        title: "Venda realizada com sucesso!",
        description: "Lançamento financeiro realizado e estoque atualizado.",
      });

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      setErrorMessage(
        (error.message ? error.message.toUpperCase() : "ERRO DESCONHECIDO") +
        "\n\nATENÇÃO!\n\nSe o Produto já foi consumido ou entregue ao Cliente, o Estoque já foi atualizado, mas a venda não foi registrada.\nPor favor, registre manualmente a venda no Financeiro.\n\nMas se o Cliente ainda não consumiu ou levou o Produto, basta apenas conferir e atualizar o estoque na Seção Produtos. Não é necessário registrar a venda no Financeiro."
      );
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Vender Produtos</DialogTitle>
        <DialogDescription>
          Selecione os produtos, quantidades e forma de pagamento para realizar a venda
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente (opcional) */}
          <FormField
            control={form.control}
            name="cliente_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente (opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sem_cliente">Nenhum cliente</SelectItem>
                    {clientes?.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Produtos */}
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

          {/* Método de Pagamento */}
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método de pagamento" />
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

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-lg font-semibold">
              Total: R$ {total.toFixed(2)}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                onOpenChange(false);
                form.reset();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Venda"
              )}
            </Button>
          </div>
        </form>
      </Form>
      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Erro ao realizar venda</AlertDialogTitle>
            <AlertDialogDescription className="text-red-500">
              {errorMessage.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowErrorModal(false);
                onOpenChange(false);
              }}
              autoFocus
              className="bg-red-600 text-white hover:bg-red-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
} 