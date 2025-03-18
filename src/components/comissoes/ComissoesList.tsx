
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

interface ComissoesListProps {
  barbeiroId: string;
  dataInicio: Date;
  dataFim: Date;
}

export function ComissoesList({ barbeiroId, dataInicio, dataFim }: ComissoesListProps) {
  const { comissoes, isLoading, totalComissao, pagarComissao } = useComissoes(
    barbeiroId,
    dataInicio,
    dataFim
  );

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
        <Button onClick={() => pagarComissao.mutate(barbeiroId)}>
          Marcar todas como pagas
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comissoes.map((comissao) => (
            <TableRow key={comissao.id}>
              <TableCell>
                {format(new Date(comissao.date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>{comissao.service}</TableCell>
              <TableCell>{comissao.client_name}</TableCell>
              <TableCell className="text-right">
                {formatMoney(comissao.service_amount)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(comissao.commission_amount)}
              </TableCell>
              <TableCell className="text-center">
                {comissao.status === "pendente" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                    onClick={() => pagarComissao.mutate(comissao.id, { single: true })}
                  >
                    Pendente
                  </Button>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="mr-1 h-3 w-3" />
                    Pago
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
