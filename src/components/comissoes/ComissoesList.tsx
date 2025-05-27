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
import { useState, useMemo } from "react";

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

  // Calcula se o botão de marcar todas como pagas deve estar habilitado
  const canMarkAllPaid = useMemo(() => {
    if (isLoading || !comissoes || comissoes.length === 0) return false; // Desabilitado se carregando, sem dados ou lista vazia

    // Se o filtro é por 'pago' ou 'cancelado', o botão deve ser desabilitado
    if (status === 'pago' || status === 'cancelado') {
      return false;
    }

    // Se o filtro é 'pendente' ou 'todos', habilitar se houver pelo menos uma comissão pendente
    return comissoes.some(comissao => comissao.status === 'pendente');
  }, [comissoes, isLoading, status]);

  // Calcula o total apenas das comissões pendentes na lista atual
  const totalComissaoPendente = useMemo(() => {
    if (!comissoes) return 0;
    return comissoes.reduce((total, comissao) => {
      if (comissao.status === 'pendente') {
        return total + Number(comissao.total_commission);
      }
      return total;
    }, 0);
  }, [comissoes]);

  function handleMarcarPagas() {
    setModalMetodoOpen(true);
  }

  function handleConfirmarMetodo(metodo: string) {
    setMetodoSelecionado(metodo);
    // A mutação será ajustada para lidar apenas com pendentes
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
        <div className="space-y-1">
          <div className="text-ld font-semibold">
            Valor Total: {formatMoney(totalComissao)}
          </div>
          {status !== 'pago' && status !== 'cancelado' && totalComissaoPendente > 0 && (
            <div className="text-lg font-semibold text-yellow-700">
              Valor Pendente: {formatMoney(totalComissaoPendente)}
            </div>
          )}
        </div>
        <Button onClick={handleMarcarPagas} disabled={!canMarkAllPaid}>
          Pagar Comissões Pendentes
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
        totalPendingAmount={totalComissaoPendente}
      />
    </div>
  );
}
