import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

type Servico = Database['public']['Tables']['services']['Row'];

export function useServicosAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos-admin', selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('name');

      if (error) {
        logError(error, "Erro ao buscar serviços:");
        throw error;
      }

      return data as Servico[];
    },
    enabled: !!selectedBarberShop
  });

  // Função para verificar se um nome de serviço já existe
  const checkServiceNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
    if (!selectedBarberShop?.id) {
      throw new Error("Barbearia não selecionada");
    }

    let query = supabase
      .from('services')
      .select('id')
      .eq('barber_shop_id', selectedBarberShop.id)
      .eq('name', name.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      logError(error, "Erro ao verificar nome do serviço:");
      throw error;
    }

    return data && data.length > 0;
  };

  const createServico = useMutation({
    mutationFn: async (servico: Omit<Servico, 'id' | 'created_at' | 'updated_at' | 'barber_shop_id' | 'active'>) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Verificar se o nome já existe antes de criar
      const nameExists = await checkServiceNameExists(servico.name);
      if (nameExists) {
        throw new Error("Já existe um serviço com este nome na barbearia.");
      }

      const { data, error } = await supabase
        .from('services')
        .insert({
          ...servico,
          barber_shop_id: selectedBarberShop.id,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['servicos', selectedBarberShop?.id] });
      toast({
        title: "Serviço criado com sucesso!",
        description: "O serviço foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar serviço",
        description: error.message || "Ocorreu um erro ao tentar criar o serviço. Tente novamente.",
      });
    },
  });

  const updateServico = useMutation({
    mutationFn: async (servico: Partial<Servico> & { id: string }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      // Se o nome está sendo alterado, verificar se já existe
      if (servico.name) {
        const nameExists = await checkServiceNameExists(servico.name, servico.id);
        if (nameExists) {
          throw new Error("Já existe um serviço com este nome na barbearia.");
        }
      }

      const { data, error } = await supabase
        .from('services')
        .update({
          ...servico,
          updated_at: new Date().toISOString()
        })
        .eq('id', servico.id)
        .eq('barber_shop_id', selectedBarberShop.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['servicos', selectedBarberShop?.id] });
      toast({
        title: "Serviço atualizado com sucesso!",
        description: "As informações do serviço foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar serviço",
        description: error.message || "Ocorreu um erro ao tentar atualizar o serviço. Tente novamente.",
      });
    },
  });

  const toggleServicoStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from('services')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('barber_shop_id', selectedBarberShop.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['servicos', selectedBarberShop?.id] });
      toast({
        title: variables.active ? "Serviço ativado com sucesso!" : "Serviço desativado com sucesso!",
        description: variables.active 
          ? "O serviço foi reativado no sistema." 
          : "O serviço foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status do serviço",
        description: error.message || "Ocorreu um erro ao tentar alterar o status do serviço. Tente novamente.",
      });
    },
  });

  return {
    servicos,
    isLoading,
    createServico,
    updateServico,
    toggleServicoStatus,
    checkServiceNameExists,
  };
} 