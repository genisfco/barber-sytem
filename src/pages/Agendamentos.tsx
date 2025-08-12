import { useState, useEffect } from "react";
import { useAgendamentos } from "@/hooks/useAgendamentos";
//import { AgendamentosHeader } from "@/components/agendamentos/AgendamentosHeader";
import { AgendamentoCalendar } from "@/components/agendamentos/AgendamentoCalendar";
import { AgendamentoGrid } from "@/components/agendamentos/AgendamentoGrid";
import { AgendamentosTable } from "@/components/agendamentos/AgendamentosTable";
import { format, startOfDay } from "date-fns";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

const Agendamentos = () => {
  // Inicializa com a data atual
  const initialDate = startOfDay(new Date());
  const [date, setDate] = useState<Date>(initialDate);
  const { agendamentos, isLoading } = useAgendamentos(date);
  const { selectedBarberShop } = useBarberShopContext();

  const formatDateForComparison = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const filteredAgendamentos = agendamentos?.filter(ag => {
    const dateMatches = ag.date === formatDateForComparison(date);
    return dateMatches;
  });
  
  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* <AgendamentosHeader /> */}

      <div className="grid md:grid-cols-[360px,1fr] gap-3 sm:gap-6">
        <div className="w-full max-w-full">
          <AgendamentoCalendar 
            date={date} 
            onDateSelect={(newDate) => {
              if (newDate) {
                const newDateStartOfDay = startOfDay(newDate);
                setDate(newDateStartOfDay);
              }
            }} 
          />
        </div>
        <div className="w-full max-w-full">
          <AgendamentoGrid 
            date={date} 
            agendamentos={filteredAgendamentos}
            isLoading={isLoading}
            barberShopId={selectedBarberShop?.id || ''}
            onHorarioSelect={(horario) => {
              // Aqui você pode adicionar a lógica para lidar com a seleção do horário
            }}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <AgendamentosTable 
          agendamentos={filteredAgendamentos}
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export default Agendamentos;
