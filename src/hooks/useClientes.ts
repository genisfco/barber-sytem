
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/types/cliente";
import { useToast } from "@/hooks/use-toast";

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw error;
      }

      return data as Cliente[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(cliente)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar cliente:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente cadastrado com sucesso!",
        description: "O cliente foi adicionado à sua lista.",
      });
    },
    onError: (error) => {
      console.error("Erro na mutação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: "Ocorreu um erro ao tentar cadastrar o cliente. Tente novamente.",
      });
    },
  });

  return {
    clientes,
    isLoading,
    createCliente,
  };
}
