import { z } from "zod";
import { Transacao } from "@/hooks/useTransacoes";

export const formSchema = z.object({
  data: z.date(),
  valor: z.string().min(1, "O valor é obrigatório"),
  descricao: z.string().min(1, "A descrição é obrigatória"),
  metodo_pagamento: z.string().optional(),
  category: z.enum(["servicos", "produtos", "comissoes", "despesas_fixas", "sistemas", "outros"]).default("outros"),
  observacao: z.string().optional(),
});

export type FormValues = {
  data: Date;
  valor: string;
  descricao: string;
  metodo_pagamento?: string;
  category: "assinaturas" | "servicos" | "produtos" | "comissoes" | "despesas_fixas" | "sistemas" | "outros";
  observacao?: string;
};

export interface FinanceiroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "receita" | "despesa";
  transacao?: Transacao;
  onSuccess?: () => void;
}
