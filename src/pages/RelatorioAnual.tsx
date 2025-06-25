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

type DadosCategoria = {
  valor: number;
  quantidade: number;
  metodosPagamento: Record<string, { valor: number; quantidade: number }>;
};

const RelatorioAnual = () => {
  const [ano, setAno] = useState<string>("");
  const { getRelatorioAnual } = useRelatorios();
  const { data: relatorio, isLoading } = getRelatorioAnual(ano);
  const [openDetalhesReceitas, setOpenDetalhesReceitas] = useState(false);
  const [openDetalhesDespesas, setOpenDetalhesDespesas] = useState(false);

  const anoAtual = new Date().getFullYear();
  const anos = Array.from(
    { length: 5 },
    (_, i) => anoAtual - 2 + i
  );

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

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const agruparPorCategoria = (transacoes: any[], tipo: 'receita' | 'despesa'): Record<string, DadosCategoria> => {
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
      }, {} as Record<string, DadosCategoria>);
  };

  const formatarCategoria = (categoria: string) => {
    switch (categoria) {
      case 'assinaturas': return 'Assinaturas';
      case 'servicos': return 'Serviços';
      case 'produtos': return 'Produtos';
      case 'comissoes': return 'Comissões';
      case 'despesas_fixas': return 'Despesas Fixas';
      case 'outros': return 'Outros';
      default: return categoria;
    }
  };

  // Função para agrupar transações por mês
  const totaisPorMes = meses.map((mes, idx) => {
    const transacoesMes = (relatorio?.transacoes || []).filter(t => {
      const data = t.payment_date || t.created_at;
      return new Date(data).getMonth() === idx;
    });
    const receitas = transacoesMes.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.value), 0);
    const despesas = transacoesMes.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.value), 0);
    const saldo = receitas - despesas;
    return {
      ...mes,
      receitas,
      despesas,
      saldo,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/financeiro">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-display">Relatório Anual</h1>
      </div>

      <div className="flex gap-4">
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
              <CardTitle className="text-green-600">Receitas do Ano</CardTitle>
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
              <CardTitle className="text-red-600">Despesas do Ano</CardTitle>
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
            <CardTitle>Saldo do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${relatorio?.saldo > 0 ? 'text-blue-600' : relatorio?.saldo < 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              {formatarMoeda(relatorio?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Mensais */}
      <div className="grid md:grid-cols-4 gap-4">
        {totaisPorMes.map((mes) => (
          <Card key={mes.valor}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{mes.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <span className="text-gray-200 text-sm">Receita: {formatarMoeda(mes.receitas)}</span>
                <span className="text-gray-500 text-sm">Despesa: {formatarMoeda(mes.despesas)}</span>
                <span className={`text-sm font-semibold ${mes.saldo > 0 ? 'text-blue-600' : mes.saldo < 0 ? 'text-orange-400' : 'text-gray-400'}`}>Saldo: {formatarMoeda(mes.saldo)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
            

      <DetalhesDialog
        open={openDetalhesReceitas}
        onOpenChange={setOpenDetalhesReceitas}
        titulo="Detalhes das Receitas"
        dados={Object.entries(agruparPorCategoria(relatorio?.transacoes || [], 'receita'))
          .map(([categoria, dados]) => ({
            categoria: formatarCategoria(categoria),
            valor: dados.valor,
            quantidade: dados.quantidade,
            metodosPagamento: Object.entries(dados.metodosPagamento)
              .map(([metodo, info]) => ({
                metodo,
                valor: info.valor,
                quantidade: info.quantidade
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
            valor: dados.valor,
            quantidade: dados.quantidade,
            metodosPagamento: Object.entries(dados.metodosPagamento)
              .map(([metodo, info]) => ({
                metodo,
                valor: info.valor,
                quantidade: info.quantidade
              }))
          }))
          .sort((a, b) => b.valor - a.valor)
        }
      />
    </div>
  );
};

export default RelatorioAnual;
