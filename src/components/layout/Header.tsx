import { BarberShopSelector } from '../BarberShopSelector';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getDiaSemana = (date: Date) => {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[date.getDay()];
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b gap-10">
      <BarberShopSelector />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-6 w-6 text-white" />
          <div className="text-white text-left">
            <div className="font-medium">{format(dataHoraAtual, "HH:mm")}</div>
            <div className="text-xs">
              {getDiaSemana(dataHoraAtual)}, {format(dataHoraAtual, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}