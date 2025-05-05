import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FormFields } from "./FormFields";
import { formSchema, type FinanceiroFormProps, type FormValues } from "./types";
import { useTransacoes } from "@/hooks/useTransacoes";

export function FinanceiroForm({ open, onOpenChange, tipo, transacao, onSuccess }: FinanceiroFormProps) {
  const { createTransacao, updateTransacao } = useTransacoes();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: new Date(),
    },
  });

  useEffect(() => {
    if (transacao) {
      form.reset({
        data: new Date(transacao.payment_date),
        valor: transacao.value.toString(),
        descricao: transacao.description,
        metodo_pagamento: transacao.payment_method,
        category: transacao.category,
      });
    } else {
      form.reset({
        data: new Date(),
      });
    }
  }, [transacao, form]);

  async function onSubmit(values: FormValues) {
    try {
      console.log("Dados do formulário:", values);
      console.log("Tipo da transação:", tipo);
      
      const data = new Date(values.data);
      data.setHours(0, 0, 0, 0);

      // Validar o tipo
      if (tipo !== "receita" && tipo !== "despesa") {
        throw new Error(`Tipo inválido: ${tipo}`);
      }

      const transacaoData = {
        type: tipo,
        value: Number(values.valor),
        description: values.descricao,
        payment_method: values.metodo_pagamento,
        category: values.category,
        payment_date: data.toISOString().slice(0, 10),
      };

      console.log("Dados a serem enviados:", transacaoData);

      if (transacao) {
        await updateTransacao.mutateAsync({
          id: transacao.id,
          ...transacaoData,
        });
        toast.success(
          `${tipo === "receita" ? "Receita" : "Despesa"} atualizada com sucesso!`
        );
      } else {
        await createTransacao.mutateAsync(transacaoData);
        toast.success(
          `${tipo === "receita" ? "Receita" : "Despesa"} cadastrada com sucesso!`
        );
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error(
        `Erro ao ${transacao ? "atualizar" : "cadastrar"} ${
          tipo === "receita" ? "receita" : "despesa"
        }. Verifique os dados e tente novamente.`
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {transacao
              ? `Editar ${tipo === "receita" ? "Receita" : "Despesa"}`
              : `Nova ${tipo === "receita" ? "Receita" : "Despesa"}`}
          </DialogTitle>
          <DialogDescription>
            {transacao
              ? "Atualize os campos abaixo para editar a transação."
              : `Preencha os campos abaixo para cadastrar uma nova ${
                  tipo === "receita" ? "receita" : "despesa"
                }.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormFields form={form} tipo={tipo} />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {transacao ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
