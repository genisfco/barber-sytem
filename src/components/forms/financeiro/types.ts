import { z } from "zod";

export const formSchema = z.object({
  descricao: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres"),
  valor: z.string().min(1, "Informe o valor"),
  metodo_pagamento: z.string({
    required_error: "Selecione o método de pagamento",
  }),
  data: z.date({
    required_error: "Selecione a data",
  }),
  observacao: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export type FinanceiroFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "receita" | "despesa";
};
