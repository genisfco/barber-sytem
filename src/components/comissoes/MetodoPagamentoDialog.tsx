import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MetodoPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (metodo: string) => void;
  totalPendingAmount: number;
}

export function MetodoPagamentoDialog({ open, onOpenChange, onConfirm, totalPendingAmount }: MetodoPagamentoDialogProps) {
  const [metodo, setMetodo] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  function handleConfirmar() {
    if (!metodo) {
      setErro("Selecione o método de pagamento.");
      return;
    }
    setErro("");
    onConfirm(metodo);
    onOpenChange(false);
  }

  function handleCancelar() {
    setMetodo("");
    setErro("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Escolha o método de pagamento</DialogTitle>
          <DialogDescription>
            Selecione o método utilizado para registrar o pagamento das comissões.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center font-bold text-lg">
            Valor Pendente a Pagar: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingAmount)}
          </div>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Transferência">Transferência</SelectItem>
            </SelectContent>
          </Select>
          {erro && <div className="text-red-500 text-sm mt-1">{erro}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar} type="button">
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} type="button">
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 