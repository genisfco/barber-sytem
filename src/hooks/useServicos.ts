import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

type Servico = Database['public']['Tables']['services']['Row'];

export function useServicos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos', selectedBarberShop?.id],
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

  const createServico = useMutation({
    mutationFn: async (servico: Omit<Servico, 'id' | 'created_at' | 'updated_at' | 'barber_shop_id' | 'active'>) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
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

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from('services')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('barber_shop_id', selectedBarberShop.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', selectedBarberShop?.id] });
      toast({
        title: "Serviço desativado com sucesso!",
        description: "O serviço foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao desativar serviço",
        description: error.message || "Ocorreu um erro ao tentar desativar o serviço. Tente novamente.",
      });
    },
  });

  return {
    servicos,
    isLoading,
    createServico,
    updateServico,
    deleteServico,
  };
} 