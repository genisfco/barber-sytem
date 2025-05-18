import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BarberShop } from '../services/barberShopService';

interface BarberShopContextType {
  selectedBarberShop: BarberShop | null;
  setSelectedBarberShop: (barberShop: BarberShop | null) => void;
}

const BarberShopContext = createContext<BarberShopContextType | undefined>(undefined);

export function BarberShopProvider({ children }: { children: ReactNode }) {
  const [selectedBarberShop, setSelectedBarberShop] = useState<BarberShop | null>(null);

  return (
    <BarberShopContext.Provider value={{ selectedBarberShop, setSelectedBarberShop }}>
      {children}
    </BarberShopContext.Provider>
  );
}

export function useBarberShopContext() {
  const context = useContext(BarberShopContext);
  if (context === undefined) {
    throw new Error('useBarberShopContext must be used within a BarberShopProvider');
  }
  return context;
} 