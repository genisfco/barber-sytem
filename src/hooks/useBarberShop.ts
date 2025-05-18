import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { barberShopService, BarberShop, BarberShopHours } from '../services/barberShopService';

export function useBarberShop(barberShopId: string) {
  const queryClient = useQueryClient();

  const { data: barberShop, isLoading: isLoadingBarberShop } = useQuery({
    queryKey: ['barberShop', barberShopId],
    queryFn: () => barberShopService.getBarberShopById(barberShopId),
    enabled: !!barberShopId,
  });

  const { data: barberShopHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['barberShopHours', barberShopId],
    queryFn: () => barberShopService.getBarberShopHours(barberShopId),
    enabled: !!barberShopId,
  });

  const updateBarberShop = useMutation({
    mutationFn: (data: Partial<Omit<BarberShop, 'id' | 'created_at' | 'updated_at'>>) =>
      barberShopService.updateBarberShop(barberShopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberShop', barberShopId] });
    },
  });

  const updateBarberShopHours = useMutation({
    mutationFn: (hours: Omit<BarberShopHours, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>[]) =>
      barberShopService.updateBarberShopHours(barberShopId, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberShopHours', barberShopId] });
    },
  });

  const toggleBarberShopStatus = useMutation({
    mutationFn: (active: boolean) =>
      barberShopService.toggleBarberShopStatus(barberShopId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberShop', barberShopId] });
    },
  });

  return {
    barberShop,
    barberShopHours,
    isLoading: isLoadingBarberShop || isLoadingHours,
    updateBarberShop,
    updateBarberShopHours,
    toggleBarberShopStatus,
  };
} 