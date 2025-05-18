import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { logError } from '@/utils/logger';

type BarberShop = Database['public']['Tables']['barber_shops']['Row'];
type BarberShopHours = Database['public']['Tables']['barber_shop_hours']['Row'];

export function useBarberShops() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as barbearias
  const { data: barberShops, isLoading: isLoadingBarberShops } = useQuery({
    queryKey: ['barberShops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_shops')
        .select('*')
        .order('name');

      if (error) {
        logError(error, "Erro ao buscar barbearias:");
        throw error;
      }

      return data as BarberShop[];
    }
  });

  // Buscar uma barbearia específica
  const getBarberShopById = async (id: string) => {
    const { data, error } = await supabase
      .from('barber_shops')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logError(error, "Erro ao buscar barbearia:");
      throw error;
    }

    return data as BarberShop;
  };

  // Buscar horários de funcionamento
  const getBarberShopHours = async (barberShopId: string) => {
    const { data, error } = await supabase
      .from('barber_shop_hours')
      .select('*')
      .eq('barber_shop_id', barberShopId)
      .order('day_of_week');

    if (error) {
      logError(error, "Erro ao buscar horários de funcionamento:");
      throw error;
    }

    return data as BarberShopHours[];
  };

  // Criar nova barbearia
  const createBarberShop = useMutation({
    mutationFn: async (barberShop: Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('barber_shops')
        .insert(barberShop)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberShops'] });
      toast({
        title: "Barbearia criada com sucesso!",
        description: "A barbearia foi adicionada ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar barbearia",
        description: error.message || "Ocorreu um erro ao tentar criar a barbearia. Tente novamente.",
      });
    },
  });

  // Atualizar barbearia
  const updateBarberShop = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data: updatedData, error } = await supabase
        .from('barber_shops')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barberShops'] });
      queryClient.invalidateQueries({ queryKey: ['barberShop', variables.id] });
      toast({
        title: "Barbearia atualizada com sucesso!",
        description: "As informações da barbearia foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar barbearia",
        description: error.message || "Ocorreu um erro ao tentar atualizar a barbearia. Tente novamente.",
      });
    },
  });

  // Atualizar horários de funcionamento
  const updateBarberShopHours = useMutation({
    mutationFn: async ({ 
      barberShopId, 
      hours 
    }: { 
      barberShopId: string; 
      hours: Omit<BarberShopHours, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>[] 
    }) => {
      // Primeiro, remove todos os horários existentes
      const { error: deleteError } = await supabase
        .from('barber_shop_hours')
        .delete()
        .eq('barber_shop_id', barberShopId);

      if (deleteError) throw deleteError;

      // Depois, insere os novos horários
      const { data, error } = await supabase
        .from('barber_shop_hours')
        .insert(
          hours.map(hour => ({
            ...hour,
            barber_shop_id: barberShopId,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barberShopHours', variables.barberShopId] });
      toast({
        title: "Horários atualizados com sucesso!",
        description: "Os horários de funcionamento foram atualizados.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar horários",
        description: error.message || "Ocorreu um erro ao tentar atualizar os horários. Tente novamente.",
      });
    },
  });

  // Toggle status da barbearia (ativar/desativar)
  const toggleBarberShopStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('barber_shops')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barberShops'] });
      queryClient.invalidateQueries({ queryKey: ['barberShop', variables.id] });
      toast({
        title: variables.active ? "Barbearia ativada!" : "Barbearia desativada!",
        description: variables.active 
          ? "A barbearia foi ativada com sucesso."
          : "A barbearia foi desativada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro ao tentar alterar o status da barbearia. Tente novamente.",
      });
    },
  });

  return {
    barberShops,
    isLoadingBarberShops,
    getBarberShopById,
    getBarberShopHours,
    createBarberShop,
    updateBarberShop,
    updateBarberShopHours,
    toggleBarberShopStatus,
  };
} 