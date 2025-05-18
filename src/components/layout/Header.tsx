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
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="ml-auto"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}