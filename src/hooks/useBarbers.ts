import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { logError } from '@/utils/logger';
import { useBarberShopContext } from '@/contexts/BarberShopContext';

type Barber = Database['public']['Tables']['barbers']['Row'];

export function useBarbers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  const { data: barbers, isLoading } = useQuery({
    queryKey: ['barbers', selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop.id)
        .order('name');

      if (error) {
        logError(error, "Erro ao buscar barbeiros:");
        throw error;
      }

      return data as Barber[];
    },
    enabled: !!selectedBarberShop
  });

  const createBarber = useMutation({
    mutationFn: async (barber: Omit<Barber, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('barbers')
        .insert({
          ...barber,
          barber_shop_id: selectedBarberShop.id,
          active: true,
          commission_rate: barber.commission_rate || 30
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', selectedBarberShop?.id] });
      toast({
        title: "Barbeiro criado com sucesso!",
        description: "O barbeiro foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar criar o barbeiro. Tente novamente.",
      });
    },
  });

  const updateBarber = useMutation({
    mutationFn: async (params: { id: string; barber: Partial<Omit<Barber, 'id' | 'barber_shop_id'>> }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('barbers')
        .update({
          ...params.barber,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .eq('barber_shop_id', selectedBarberShop.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', selectedBarberShop?.id] });
      toast({
        title: "Barbeiro atualizado com sucesso!",
        description: "As informações do barbeiro foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar atualizar o barbeiro. Tente novamente.",
      });
    },
  });

  const toggleBarberStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from('barbers')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('barber_shop_id', selectedBarberShop.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barbers', selectedBarberShop?.id] });
      toast({
        title: variables.active ? "Barbeiro ativado com sucesso!" : "Barbeiro desativado com sucesso!",
        description: variables.active 
          ? "O barbeiro foi reativado no sistema."
          : "O barbeiro foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status do barbeiro",
        description: error.message || "Ocorreu um erro ao tentar alterar o status do barbeiro. Tente novamente.",
      });
    },
  });

  return {
    barbers: barbers ?? [],
    isLoading,
    createBarber,
    updateBarber,
    toggleBarberStatus,
  };
} 