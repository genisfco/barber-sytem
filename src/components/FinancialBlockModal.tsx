import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FinancialBlockModalProps {
  open: boolean;
  pendingMonths: Array<{
    month: number;
    year: number;
    total_amount?: number;
  }>;
}

const MONTHS_PT = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function FinancialBlockModal({ open, pendingMonths }: FinancialBlockModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Pagamento em atraso
          </DialogTitle>
        </DialogHeader>
        <Alert className="bg-red-600 border-red-200">
          <AlertDescription>
            <div className="font-semibold mb-7">
              Ops! Seu acesso está temporariamente bloqueado.
            </div>
            <div className="mb-3">
              Para liberar o sistema, regularize os pagamentos em atraso:
            </div>
            <ul className="mb-2 pl-4 list-disc max-h-40 overflow-y-auto">
              {pendingMonths.map((p, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-white" />
                  {MONTHS_PT[p.month] || "Mês desconhecido"} de {p.year}
                  {typeof p.total_amount === "number" && (
                    <span className="ml-2 text-sm text-muted-white">
                      --- valor pendente: {p.total_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-7 text-sm text-muted-white">
              Caso já tenha efetuado o pagamento, aguarde a confirmação ou entre em contato com o suporte.
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex justify-end mt-4">
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate("/financeiro")}
          >
            Regularizar pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}