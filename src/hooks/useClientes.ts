
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
      console.log("Iniciando busca de clientes...");
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) {
        console.error("Erro detalhado ao buscar clientes:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log("Clientes encontrados:", data);
      return data as Cliente[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id">) => {
      console.log("Iniciando criação do cliente com dados:", cliente);
      
      const session = await supabase.auth.getSession();
      console.log("Status da sessão:", {
        hasSession: !!session.data.session,
        accessToken: session.data.session?.access_token ? "Presente" : "Ausente"
      });

      const { data, error } = await supabase
        .from("clients")
        .insert(cliente)
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado ao criar cliente:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          cliente: cliente
        });
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
    onError: (error: any) => {
      console.error("Erro completo na mutação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: error.message || "Ocorreu um erro ao tentar cadastrar o cliente. Tente novamente.",
      });
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (cliente: Cliente) => {
      console.log("Iniciando atualização do cliente:", cliente);
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
        console.error("Erro detalhado ao atualizar cliente:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
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
    onError: (error: any) => {
      console.error("Erro detalhado na mutação de atualização:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao tentar atualizar o cliente. Tente novamente.",
      });
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      console.log("Iniciando exclusão do cliente:", id);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro detalhado ao excluir cliente:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
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
    onError: (error: any) => {
      console.error("Erro detalhado na mutação de exclusão:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao tentar excluir o cliente. Tente novamente.",
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
