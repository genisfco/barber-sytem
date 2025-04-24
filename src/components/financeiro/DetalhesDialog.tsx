import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  dados: {
    categoria: string;
    valor: number;
    quantidade: number;
    metodosPagamento: {
      metodo: string;
      valor: number;
      quantidade: number;
    }[];
  }[];
}

export function DetalhesDialog({ open, onOpenChange, titulo, dados }: DetalhesDialogProps) {
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const total = dados.reduce((acc, item) => acc + item.valor, 0);
  const totalTransacoes = dados.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((item) => (
              <TableRow key={item.categoria}>
                <TableCell>
                  <div className="font-medium">{item.categoria}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.metodosPagamento.map((metodo, index) => (
                      <div key={metodo.metodo} className="flex justify-between">
                        <span>{metodo.metodo}:</span>
                        <span>{metodo.quantidade} transações - {formatarMoeda(metodo.valor)}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.quantidade}</TableCell>
                <TableCell className="text-right">
                  {formatarMoeda(item.valor)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totalTransacoes}</TableCell>
              <TableCell className="text-right">
                {formatarMoeda(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
} 