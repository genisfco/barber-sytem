import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useComissoes } from "@/hooks/useComissoes";
import { Comissao } from "@/types/comissao";
import { MetodoPagamentoDialog } from "./MetodoPagamentoDialog";
import { useState } from "react";

interface ComissoesListProps {
  barbeiroId: string;
  tipoBusca: "dataEspecifica" | "periodo";
  dataEspecifica: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: "pendente" | "pago" | "cancelado" | "todos";
}

export function ComissoesList({ 
  barbeiroId, 
  tipoBusca,
  dataEspecifica,
  dataInicio,
  dataFim,
  status 
}: ComissoesListProps) {
  const { comissoes, isLoading, totalComissao, pagarComissao } = useComissoes(
    barbeiroId,
    tipoBusca,
    dataEspecifica,
    dataInicio,
    dataFim,
    status
  );

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const [modalMetodoOpen, setModalMetodoOpen] = useState(false);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string | null>(null);

  function handleMarcarPagas() {
    setModalMetodoOpen(true);
  }

  function handleConfirmarMetodo(metodo: string) {
    setMetodoSelecionado(metodo);
    pagarComissao.mutate({ id: barbeiroId, paymentMethod: metodo });
  }

  if (isLoading) {
    return <div className="py-4 text-center">Carregando...</div>;
  }

  if (!comissoes?.length) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Nenhuma comissão encontrada para o período.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">
          Total de comissões: {formatMoney(totalComissao)}
        </div>
        <Button onClick={handleMarcarPagas}>
          Marcar todas como pagas
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data Atendimento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Valor Atendimento</TableHead>
            <TableHead className="text-right">Valor Comissão</TableHead>
            <TableHead className="text-center">Status Pgto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comissoes.map((comissao) => (
            <TableRow key={comissao.id}>
              <TableCell>
                {format(new Date(comissao.created_at!), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>{comissao.appointment?.client_name}</TableCell>
              <TableCell className="text-right">
                {formatMoney(comissao.total_price)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(comissao.total_commission)}
              </TableCell>
              <TableCell className="text-center">
                {comissao.status === "pendente" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    Pendente
                  </span>
                ) : comissao.status === "pago" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="mr-1 h-3 w-3" />
                    Pago
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Cancelado
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <MetodoPagamentoDialog
        open={modalMetodoOpen}
        onOpenChange={setModalMetodoOpen}
        onConfirm={handleConfirmarMetodo}
      />
    </div>
  );
}
