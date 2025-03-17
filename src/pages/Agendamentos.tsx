
import { useState } from "react";
import { AgendamentoForm } from "@/components/forms/AgendamentoForm";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { AgendamentosHeader } from "@/components/agendamentos/AgendamentosHeader";
import { AgendamentoCalendar } from "@/components/agendamentos/AgendamentoCalendar";
import { AgendamentosTable } from "@/components/agendamentos/AgendamentosTable";

const Agendamentos = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [openForm, setOpenForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<any>(undefined);
  
  const { agendamentos, isLoading } = useAgendamentos(date);

  const handleEditAgendamento = (agendamento: any) => {
    setAgendamentoParaEditar(agendamento);
    setOpenForm(true);
  };

  const handleCloseForm = (open: boolean) => {
    setOpenForm(open);
    if (!open) {
      setAgendamentoParaEditar(undefined);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <AgendamentosHeader onNewAgendamento={() => setOpenForm(true)} />

      <div className="grid md:grid-cols-[360px,1fr] gap-6">
        <AgendamentoCalendar 
          date={date} 
          onDateSelect={(date) => date && setDate(date)} 
        />
        <AgendamentosTable 
          agendamentos={agendamentos}
          isLoading={isLoading}
          onEditAgendamento={handleEditAgendamento}
        />
      </div>

      <AgendamentoForm 
        open={openForm} 
        onOpenChange={handleCloseForm} 
        agendamentoParaEditar={agendamentoParaEditar}
      />
    </div>
  );
};

export default Agendamentos;
