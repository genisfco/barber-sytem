import { useBarberShopContext } from '../contexts/BarberShopContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function BarberShopSelector() {
  const { selectedBarberShop } = useBarberShopContext();

  if (!selectedBarberShop) {
    return null;
  }

  return (
    <Select
      value={selectedBarberShop.id}
      disabled
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue>{selectedBarberShop.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={selectedBarberShop.id}>
          {selectedBarberShop.name}
        </SelectItem>
      </SelectContent>
    </Select>
  );
} 