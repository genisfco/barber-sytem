import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Scissors, Pencil, Trash2 } from "lucide-react";
import { FinanceiroForm } from "@/components/forms/financeiro/FinanceiroForm";
import { Link } from "react-router-dom";
import { useTransacoes } from "@/hooks/useTransacoes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComissoesDialog } from "@/components/comissoes/ComissoesDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const Financeiro = () => {
  const [openDespesa, setOpenDespesa] = useState(false);
  const [openReceita, setOpenReceita] = useState(false);
  const [openComissoes, setOpenComissoes] = useState(false);
  const [transacaoParaEditar, setTransacaoParaEditar] = useState<any>(null);
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<any>(null);
  const { transacoes, isLoading, totais, updateTransacao, deleteTransacao } = useTransacoes();
  const { toast } = useToast();

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleEditarTransacao = (transacao: any) => {
    setTransacaoParaEditar(transacao);
    if (transacao.type === "receita") {
      setOpenReceita(true);
    } else {
      setOpenDespesa(true);
    }
  };

  const handleExcluirTransacao = async () => {
    if (!transacaoParaExcluir) return;

    try {
      await deleteTransacao.mutateAsync(transacaoParaExcluir.id);
      setTransacaoParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Financeiro</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setOpenDespesa(true)}>
            <Plus className="mr-2" />
            Nova Despesa
          </Button>
          <Button onClick={() => setOpenReceita(true)}>
            <Plus className="mr-2" />
            Nova Receita
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Receitas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatMoney(totais.receitas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Despesas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatMoney(totais.despesas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatMoney(totais.saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-4">
          <Link to="/relatorio-mensal">
            <Button variant="outline">
              <Calendar className="mr-2" />
              Relatório Mensal
            </Button>
          </Link>
          <Link to="/relatorio-anual">
            <Button variant="outline">
              <FileText className="mr-2" />
              Relatório Anual
            </Button>
          </Link>
        </div>
        <div>
          <Button 
            variant="outline" 
            onClick={() => setOpenComissoes(true)}
            className="bg-barber-gold text-white hover:bg-barber-gold/90 hover:text-white"
          >
            <Scissors className="mr-2" />
            Comissões
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Carregando...</div>
          ) : !transacoes?.length ? (
            <div className="text-muted-foreground">
              Nenhuma transação registrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Método de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell>
                      {format(new Date(transacao.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{transacao.description}</TableCell>
                    <TableCell>
                      {transacao.category === 'servicos' && 'Serviços'}
                      {transacao.category === 'produtos' && 'Produtos'}
                      {transacao.category === 'comissoes' && 'Comissões'}
                      {transacao.category === 'despesas_fixas' && 'Despesas Fixas'}
                      {transacao.category === 'outros' && 'Outros'}
                    </TableCell>
                    <TableCell>{transacao.payment_method || "-"}</TableCell>
                    <TableCell
                      className={`text-right ${
                        transacao.type === "receita"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatMoney(transacao.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          onClick={() => handleEditarTransacao(transacao)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"   
                          className="h-9 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"                       
                          onClick={() => setTransacaoParaExcluir(transacao)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FinanceiroForm
        open={openDespesa}
        onOpenChange={setOpenDespesa}
        tipo="despesa"
        transacao={transacaoParaEditar}
        onSuccess={() => setTransacaoParaEditar(null)}
      />
      <FinanceiroForm
        open={openReceita}
        onOpenChange={setOpenReceita}
        tipo="receita"
        transacao={transacaoParaEditar}
        onSuccess={() => setTransacaoParaEditar(null)}
      />
      <ComissoesDialog 
        open={openComissoes}
        onOpenChange={setOpenComissoes}
      />

      <AlertDialog open={!!transacaoParaExcluir} onOpenChange={() => setTransacaoParaExcluir(null)}>
        <AlertDialogContent className="bg-red-50 border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 text-center">Excluir Lançamento Financeiro</AlertDialogTitle>
            <AlertDialogDescription className="text-red-700 text-center">
              <br />
              Tem certeza que deseja excluir este lançamento?
              <br /><br />
              <div className="text-left">
                <p><span className="font-semibold">Descrição:</span> {transacaoParaExcluir?.description}</p>
                <br />
                <p><span className="font-semibold">Valor:</span> {formatMoney(transacaoParaExcluir?.value)}</p>
              </div>
              <br />
              <span className="font-bold text-red-600">ATENÇÃO:</span> Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExcluirTransacao} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Financeiro;
