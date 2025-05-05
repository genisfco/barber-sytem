import { useState, useEffect } from "react";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { AgendamentosHeader } from "@/components/agendamentos/AgendamentosHeader";
import { AgendamentoCalendar } from "@/components/agendamentos/AgendamentoCalendar";
import { AgendamentoGrid } from "@/components/agendamentos/AgendamentoGrid";
import { AgendamentosTable } from "@/components/agendamentos/AgendamentosTable";
import { format, startOfDay } from "date-fns";

const Agendamentos = () => {
  // Inicializa com a data atual
  const initialDate = startOfDay(new Date());
  const [date, setDate] = useState<Date>(initialDate);
  const { agendamentos, isLoading } = useAgendamentos(date);

  const formatDateForComparison = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const filteredAgendamentos = agendamentos?.filter(ag => {
    const dateMatches = ag.date === formatDateForComparison(date);
    return dateMatches;
  });
  
  return (
    <div className="p-6 space-y-6">
      <AgendamentosHeader />

      <div className="grid md:grid-cols-[360px,1fr] gap-6">
        <AgendamentoCalendar 
          date={date} 
          onDateSelect={(newDate) => {
            if (newDate) {
              const newDateStartOfDay = startOfDay(newDate);
              setDate(newDateStartOfDay);
            }
          }} 
        />
        <AgendamentoGrid 
          date={date} 
          agendamentos={filteredAgendamentos}
          isLoading={isLoading}
        />
      </div>
      <AgendamentosTable 
        agendamentos={filteredAgendamentos}
        isLoading={isLoading} 
      />
    </div>
  );
};

export default Agendamentos;
