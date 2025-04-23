import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComissoesList } from "./ComissoesList";
import { ComissoesForm, ComissoesFormValues } from "./ComissoesForm";

export interface ComissoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComissoesDialog({ open, onOpenChange }: ComissoesDialogProps) {
  const [selecionado, setSelecionado] = useState<ComissoesFormValues | null>(null);
  
  function handleSubmit(data: ComissoesFormValues) {
    console.log("Buscando comissões para:", data);
    setSelecionado(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Comissões</DialogTitle>
          <DialogDescription>
            Selecione um barbeiro e o período para visualizar as comissões.
          </DialogDescription>
        </DialogHeader>

        <ComissoesForm onSubmit={handleSubmit} />

        {selecionado && (
          <ComissoesList 
            barbeiroId={selecionado.barbeiroId} 
            tipoBusca={selecionado.tipoBusca}
            dataEspecifica={selecionado.dataEspecifica}
            dataInicio={selecionado.dataInicio}
            dataFim={selecionado.dataFim}
            status={selecionado.status}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
