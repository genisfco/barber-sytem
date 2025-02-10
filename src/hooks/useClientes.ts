
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
      console.log("Buscando clientes...");
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) {
        console.error("Erro detalhado ao buscar clientes:", error);
        throw error;
      }

      console.log("Clientes encontrados:", data);
      return data as Cliente[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id">) => {
      console.log("Tentando criar cliente:", cliente);
      const { data, error } = await supabase
        .from("clients")
        .insert(cliente)
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado ao criar cliente:", error);
        throw error;
      }

      console.log("Cliente criado com sucesso:", data);
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
      console.error("Erro detalhado na mutação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: "Ocorreu um erro ao tentar cadastrar o cliente. Tente novamente.",
      });
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (cliente: Cliente) => {
      console.log("Tentando atualizar cliente:", cliente);
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: cliente.name,
          email: cliente.email,
          phone: cliente.phone,
          notes: cliente.notes,
        })
        .eq("id", cliente.id)
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado ao atualizar cliente:", error);
        throw error;
      }

      console.log("Cliente atualizado com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });
    },
    onError: (error) => {
      console.error("Erro detalhado na mutação de atualização:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: "Ocorreu um erro ao tentar atualizar o cliente. Tente novamente.",
      });
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      console.log("Tentando excluir cliente:", id);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro detalhado ao excluir cliente:", error);
        throw error;
      }

      console.log("Cliente excluído com sucesso");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente excluído com sucesso!",
        description: "O cliente foi removido da sua lista.",
      });
    },
    onError: (error) => {
      console.error("Erro detalhado na mutação de exclusão:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: "Ocorreu um erro ao tentar excluir o cliente. Tente novamente.",
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
