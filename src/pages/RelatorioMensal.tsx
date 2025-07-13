import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, List } from "lucide-react";
import { Link } from "react-router-dom";
import { useRelatorios } from "@/hooks/useRelatorios";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesDialog } from "@/components/financeiro/DetalhesDialog";

const RelatorioMensal = () => {
  const dataAtual = new Date();
  const mesAtual = (dataAtual.getMonth() + 1).toString();
  const anoAtualString = dataAtual.getFullYear().toString();
  
  const [mes, setMes] = useState<string>(mesAtual);
  const [ano, setAno] = useState<string>(anoAtualString);
  const { getRelatorioMensal } = useRelatorios();
  const { data: relatorio, isLoading } = getRelatorioMensal(mes, ano);
  const [openDetalhesReceitas, setOpenDetalhesReceitas] = useState(false);
  const [openDetalhesDespesas, setOpenDetalhesDespesas] = useState(false);

  const meses = [
    { valor: "1", nome: "Janeiro" },
    { valor: "2", nome: "Fevereiro" },
    { valor: "3", nome: "Março" },
    { valor: "4", nome: "Abril" },
    { valor: "5", nome: "Maio" },
    { valor: "6", nome: "Junho" },
    { valor: "7", nome: "Julho" },
    { valor: "8", nome: "Agosto" },
    { valor: "9", nome: "Setembro" },
    { valor: "10", nome: "Outubro" },
    { valor: "11", nome: "Novembro" },
    { valor: "12", nome: "Dezembro" },
  ];

  const anoAtual = new Date().getFullYear();
  const anos = Array.from(
    { length: 5 },
    (_, i) => anoAtual - 2 + i
  );

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const agruparPorMetodoPagamento = (transacoes: any[], tipo: 'receita' | 'despesa') => {
    return transacoes
      .filter(t => t.type === tipo)
      .reduce((acc, curr) => {
        const metodo = curr.payment_method || "Não informado";
        acc[metodo] = (acc[metodo] || 0) + Number(curr.value);
        return acc;
      }, {} as Record<string, number>);
  };

  const agruparPorCategoria = (transacoes: any[], tipo: 'receita' | 'despesa') => {
    return transacoes
      .filter(t => t.type === tipo)
      .reduce((acc, curr) => {
        const categoria = curr.category || "outros";
        const metodoPagamento = curr.payment_method || "Não informado";
        
        if (!acc[categoria]) {
          acc[categoria] = {
            valor: 0,
            quantidade: 0,
            metodosPagamento: {}
          };
        }

        if (!acc[categoria].metodosPagamento[metodoPagamento]) {
          acc[categoria].metodosPagamento[metodoPagamento] = {
            valor: 0,
            quantidade: 0
          };
        }

        acc[categoria].valor += Number(curr.value);
        acc[categoria].quantidade += 1;
        acc[categoria].metodosPagamento[metodoPagamento].valor += Number(curr.value);
        acc[categoria].metodosPagamento[metodoPagamento].quantidade += 1;

        return acc;
      }, {} as Record<string, { 
        valor: number, 
        quantidade: number,
        metodosPagamento: Record<string, { valor: number, quantidade: number }>
      }>);
  };

  const formatarCategoria = (categoria: string) => {
    switch (categoria) {
      case 'servicos': return 'Serviços';
      case 'assinaturas': return 'Assinaturas';
      case 'produtos': return 'Produtos';
      case 'comissoes': return 'Comissões';
      case 'despesas_fixas': return 'Despesas Fixas';
      case 'outros': return 'Outros';
      default: return categoria;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/financeiro">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-display">Relatório Mensal</h1>
      </div>

      <div className="flex gap-4">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {meses.map((mes) => (
              <SelectItem key={mes.valor} value={mes.valor}>
                {mes.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o ano" />
          </SelectTrigger>
          <SelectContent>
            {anos.map((ano) => (
              <SelectItem key={ano} value={ano.toString()}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-green-600">Receitas do Mês</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenDetalhesReceitas(true)}
                className="h-8 w-8"
                title="Detalhar Receitas"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatarMoeda(relatorio?.receitas || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-red-600">Despesas do Mês</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenDetalhesDespesas(true)}
                className="h-8 w-8"
                title="Detalhar Despesas"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatarMoeda(relatorio?.despesas || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${relatorio?.saldo > 0 ? 'text-blue-600' : relatorio?.saldo < 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              {formatarMoeda(relatorio?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {!mes || !ano ? (
            <div className="text-muted-foreground">
              Selecione um mês e ano para visualizar as transações.
            </div>
          ) : relatorio?.transacoes.length === 0 ? (
            <div className="text-muted-foreground">
              Nenhuma transação encontrada para o período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {relatorio?.transacoes.map((transacao) => (
                <div
                  key={transacao.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <div className="font-medium">{transacao.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(transacao.created_at), "dd/MM/yyyy")} -{" "}                      
                      {transacao.category === 'servicos' && 'Serviços'}                      
                      {transacao.category === 'produtos' && 'Produtos'}
                      {transacao.category === 'comissoes' && 'Comissões'}
                      {transacao.category === 'despesas_fixas' && 'Despesas Fixas'}
                      {transacao.category === 'outros' && 'Outros'}
                    </div>
                  </div>
                  <div
                    className={`font-medium ${
                      transacao.type === "receita"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatarMoeda(transacao.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DetalhesDialog
        open={openDetalhesReceitas}
        onOpenChange={setOpenDetalhesReceitas}
        titulo="Detalhes das Receitas"
        dados={Object.entries(agruparPorCategoria(relatorio?.transacoes || [], 'receita'))
          .map(([categoria, dados]) => ({
            categoria: formatarCategoria(categoria),
            valor: (dados as { valor: number }).valor,
            quantidade: 0,
            metodosPagamento: Object.entries((dados as { metodosPagamento: Record<string, { valor: number }> }).metodosPagamento)
              .map(([metodo, info]) => ({
                metodo,
                valor: info.valor,
                quantidade: 0
              }))
          }))
          .sort((a, b) => b.valor - a.valor)
        }
      />

      <DetalhesDialog
        open={openDetalhesDespesas}
        onOpenChange={setOpenDetalhesDespesas}
        titulo="Detalhes das Despesas"
        dados={Object.entries(agruparPorCategoria(relatorio?.transacoes || [], 'despesa'))
          .map(([categoria, dados]) => ({
            categoria: formatarCategoria(categoria),
            valor: (dados as { valor: number }).valor,
            quantidade: 0,
            metodosPagamento: Object.entries((dados as { metodosPagamento: Record<string, { valor: number }> }).metodosPagamento)
              .map(([metodo, info]) => ({
                metodo,
                valor: info.valor,
                quantidade: 0
              }))
          }))
          .sort((a, b) => b.valor - a.valor)
        }
      />
    </div>
  );
};

export default RelatorioMensal;
