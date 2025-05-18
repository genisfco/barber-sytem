import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, Client } from '../services/clientService';
import { useBarberShopContext } from '../contexts/BarberShopContext';

export function useClients() {
  const { selectedBarberShop } = useBarberShopContext();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', selectedBarberShop?.id],
    queryFn: () => selectedBarberShop ? clientService.getAllClients(selectedBarberShop.id) : [],
    enabled: !!selectedBarberShop,
  });

  const searchClients = useQuery({
    queryKey: ['clients', 'search', selectedBarberShop?.id],
    queryFn: ({ queryKey }) => {
      const searchTerm = queryKey[2] as string;
      return selectedBarberShop ? clientService.searchClients(selectedBarberShop.id, searchTerm) : [];
    },
    enabled: false,
  });

  const createClient = useMutation({
    mutationFn: (client: Omit<Client, 'id' | 'barber_shop_id' | 'created_at' | 'updated_at'>) =>
      selectedBarberShop ? clientService.createClient(selectedBarberShop.id, client) : Promise.reject('Barbearia não selecionada'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedBarberShop?.id] });
    },
  });

  const updateClient = useMutation({
    mutationFn: ({ id, client }: { id: string; client: Partial<Client> }) =>
      clientService.updateClient(id, client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedBarberShop?.id] });
    },
  });

  const toggleClientStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      clientService.toggleClientStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedBarberShop?.id] });
    },
  });

  return {
    clients,
    isLoading,
    searchClients,
    createClient,
    updateClient,
    toggleClientStatus,
  };
} 