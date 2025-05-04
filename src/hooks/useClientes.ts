import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Cliente = Database['public']['Tables']['clients']['Row'];

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw error;
      }

      return data as Cliente[];
    }
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro ao tentar criar o cliente. Tente novamente.",
      });
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (cliente: Partial<Cliente> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(cliente)
        .eq('id', cliente.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao tentar atualizar o cliente. Tente novamente.",
      });
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: "Cliente desativado com sucesso!",
        description: "O cliente foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao desativar cliente",
        description: error.message || "Ocorreu um erro ao tentar desativar o cliente. Tente novamente.",
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

export function useClientesAssinantesCount() {
  return useQuery({
    queryKey: ["clientes-assinantes-count"],
    queryFn: async () => {
      // Ajustar para buscar assinantes de outra fonte futuramente
      // Por ora, retorna 0
      return 0;
    },
  });
}
