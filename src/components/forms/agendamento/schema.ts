
import { z } from "zod";

export const formSchema = z.object({
  clienteId: z.string({
    required_error: "Selecione o cliente",
  }),
  barbeiroId: z.string({
    required_error: "Selecione o barbeiro",
  }),
  servico: z.string({
    required_error: "Selecione o serviço",
  }),
  data: z.date({
    required_error: "Selecione a data",
  }),
  horario: z.string({
    required_error: "Selecione o horário",
  }),
});

export type FormValues = z.infer<typeof formSchema>;
