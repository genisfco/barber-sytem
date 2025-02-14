
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { FormFields } from "./FormFields";
import { formSchema, type FinanceiroFormProps, type FormValues } from "./types";
import { useTransacoes } from "@/hooks/useTransacoes";

export function FinanceiroForm({ open, onOpenChange, tipo }: FinanceiroFormProps) {
  const { createTransacao } = useTransacoes();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: new Date(),
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createTransacao.mutateAsync({
        type: tipo,
        amount: Number(values.valor),
        description: values.descricao,
        category: values.categoria,
        date: values.data.toISOString().split('T')[0],
        notes: values.observacao,
      });

      toast.success(
        `${tipo === "receita" ? "Receita" : "Despesa"} cadastrada com sucesso!`
      );
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {tipo === "receita" ? "Nova Receita" : "Nova Despesa"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para cadastrar uma nova{" "}
            {tipo === "receita" ? "receita" : "despesa"}.
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
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
