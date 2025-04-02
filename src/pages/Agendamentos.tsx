
import { useState } from "react";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { AgendamentosHeader } from "@/components/agendamentos/AgendamentosHeader";
import { AgendamentoCalendar } from "@/components/agendamentos/AgendamentoCalendar";
import { AgendamentoGrid } from "@/components/agendamentos/AgendamentoGrid";
import { AgendamentosTable } from "@/components/agendamentos/AgendamentosTable";

const Agendamentos = () => {
  const [date, setDate] = useState<Date>(new Date());
  const { agendamentos, isLoading } = useAgendamentos(date);
  
  return (
    <div className="p-6 space-y-6">
      <AgendamentosHeader />

      <div className="grid md:grid-cols-[360px,1fr] gap-6">
        <AgendamentoCalendar 
          date={date} 
          onDateSelect={(date) => date && setDate(date)} 
        />
        <AgendamentoGrid 
          date={date} 
          agendamentos={agendamentos}
          isLoading={isLoading}
        />
      </div>

      <AgendamentosTable 
        agendamentos={agendamentos} 
        isLoading={isLoading} 
      />
    </div>
  );
};

export default Agendamentos;
