import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Cliente } from "@/types/cliente";

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      console.log("Buscando clientes...");
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw error;
      }

      return data as Cliente[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          ...cliente,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente cadastrado com sucesso!",
        description: "O cliente foi adicionado à sua base.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: error.message || "Ocorreu um erro ao tentar cadastrar o cliente.",
      });
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (cliente: Cliente) => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: cliente.name,
          email: cliente.email,
          phone: cliente.phone,
          notes: cliente.notes,
          active: cliente.active,
        })
        .eq("id", cliente.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao tentar atualizar o cliente.",
      });
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente inativado com sucesso!",
        description: "O cliente foi removido da sua base ativa.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao inativar cliente",
        description: error.message || "Ocorreu um erro ao tentar inativar o cliente.",
      });
    },
  });

  return {
    clientes,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}
