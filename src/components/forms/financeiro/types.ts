import { z } from "zod";

export const formSchema = z.object({
  data: z.date(),
  valor: z.string().min(1, "O valor é obrigatório"),
  descricao: z.string().min(1, "A descrição é obrigatória"),
  metodo_pagamento: z.string().optional(),
  category: z.enum(["servicos", "produtos", "comissoes", "despesas_fixas", "outros"]).default("outros"),
});

export type FormValues = z.infer<typeof formSchema>;

export interface FinanceiroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "receita" | "despesa";
}
