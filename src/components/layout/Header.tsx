import { BarberShopSelector } from '../BarberShopSelector';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Header() {
  const { signOut } = useAuth();

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex-1" />
        <BarberShopSelector />
        
      </div>
    </header>
  );
}