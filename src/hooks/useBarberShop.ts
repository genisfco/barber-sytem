import { useQuery } from '@tanstack/react-query';
import { Database } from '@/integrations/supabase/types';
import { useBarberShops } from './useBarberShops';

type BarberShop = Database['public']['Tables']['barber_shops']['Row'];
type BarberShopHours = Database['public']['Tables']['barber_shop_hours']['Row'];

export function useBarberShop(barberShopId: string) {
  const { 
    getBarberShopById, 
    getBarberShopHours, 
    updateBarberShop, 
    updateBarberShopHours, 
    toggleBarberShopStatus 
  } = useBarberShops();

  const { data: barberShop, isLoading: isLoadingBarberShop } = useQuery({
    queryKey: ['barberShop', barberShopId],
    queryFn: () => getBarberShopById(barberShopId),
    enabled: !!barberShopId,
  });

  const { data: barberShopHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['barberShopHours', barberShopId],
    queryFn: () => getBarberShopHours(barberShopId),
    enabled: !!barberShopId,
  });

  return {
    barberShop,
    barberShopHours,
    isLoading: isLoadingBarberShop || isLoadingHours,
    updateBarberShop: (data: Partial<Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>>) => 
      updateBarberShop.mutateAsync({ id: barberShopId, data }),
    updateBarberShopHours: (hours: Omit<BarberShopHours, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>[]) => 
      updateBarberShopHours.mutateAsync({ barberShopId, hours }),
    toggleBarberShopStatus: (active: boolean) => 
      toggleBarberShopStatus.mutateAsync({ id: barberShopId, active }),
  };
} 