import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

type Cliente = Database['public']['Tables']['clients']['Row'];

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes', selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('name');

      if (error) {
        logError(error, "Erro ao buscar clientes:");
        throw error;
      }

      return data as Cliente[];
    },
    enabled: !!selectedBarberShop
  });

  const createCliente = useMutation({
    mutationFn: async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'barber_shop_id' | 'active'>) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...cliente,
          barber_shop_id: selectedBarberShop.id,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', selectedBarberShop?.id] });
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
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('clients')
        .update({
          ...cliente,
          updated_at: new Date().toISOString()
        })
        .eq('id', cliente.id)
        .eq('barber_shop_id', selectedBarberShop.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', selectedBarberShop?.id] });
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

  const toggleClienteStatus = useMutation({
    mutationFn: async (cliente: { id: string; active: boolean }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from('clients')
        .update({ 
          active: cliente.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', cliente.id)
        .eq('barber_shop_id', selectedBarberShop.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', selectedBarberShop?.id] });
      toast({
        title: variables.active ? "Cliente ativado com sucesso!" : "Cliente desativado com sucesso!",
        description: variables.active 
          ? "O cliente foi reativado no sistema."
          : "O cliente foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status do cliente",
        description: error.message || "Ocorreu um erro ao tentar alterar o status do cliente. Tente novamente.",
      });
    },
  });

  return {
    clientes,
    isLoading,
    createCliente,
    updateCliente,
    toggleClienteStatus,
  };
}

export function useClientesAssinantesCount() {
  const { selectedBarberShop } = useBarberShopContext();

  return useQuery({
    queryKey: ["clientes-assinantes-count", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Ajustar para buscar assinantes de outra fonte futuramente
      // Por ora, retorna 0
      return 0;
    },
    enabled: !!selectedBarberShop
  });
}
