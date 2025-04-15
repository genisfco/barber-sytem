import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Scissors } from "lucide-react";
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

const Financeiro = () => {
  const [openDespesa, setOpenDespesa] = useState(false);
  const [openReceita, setOpenReceita] = useState(false);
  const [openComissoes, setOpenComissoes] = useState(false);
  const { transacoes, isLoading, totais } = useTransacoes();

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
                  <TableHead>Método de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
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
      />
      <FinanceiroForm
        open={openReceita}
        onOpenChange={setOpenReceita}
        tipo="receita"
      />
      <ComissoesDialog 
        open={openComissoes}
        onOpenChange={setOpenComissoes}
      />
    </div>
  );
};

export default Financeiro;
