import { useBarberShop } from '../contexts/BarberShopContext';

export function useBarberShopQuery() {
  const { barberShop } = useBarberShop();

  if (!barberShop) {
    throw new Error('Barbearia não selecionada');
  }

  return {
    barberShopId: barberShop.id,
    barberShop,
  };
}

// Exemplo de uso em uma query:
/*
import { useQuery } from '@tanstack/react-query';
import { useBarberShopQuery } from '../hooks/useBarberShopQuery';

function useClientes() {
  const { barberShopId } = useBarberShopQuery();
  
  return useQuery({
    queryKey: ['clientes', barberShopId],
    queryFn: () => api.get(`/clientes?barber_shop_id=${barberShopId}`),
  });
}
*/ 