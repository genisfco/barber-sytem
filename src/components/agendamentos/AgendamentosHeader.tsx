
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AgendamentosHeaderProps {
  onNewAgendamento: () => void;
}

export function AgendamentosHeader({ onNewAgendamento }: AgendamentosHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-display text-barber-dark">Agendamentos</h1>
      <Button onClick={onNewAgendamento}>
        <Plus className="mr-2" />
        Novo Agendamento
      </Button>
    </div>
  );
}
