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
import { ChevronLeft, List, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useRelatorios } from "@/hooks/useRelatorios";
import { useBarbers } from "@/hooks/useBarbers";
import { useClientes } from "@/hooks/useClientes";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesDialog } from "@/components/financeiro/DetalhesDialog";

type FiltrosTransacoes = {
  barber_id?: string;
  client_id?: string;
  category?: string;
  payment_method?: string;
};

const RelatorioMensal = () => {
  const dataAtual = new Date();
  const mesAtual = (dataAtual.getMonth() + 1).toString();
  const anoAtualString = dataAtual.getFullYear().toString();
  
  const [mes, setMes] = useState<string>(mesAtual);
  const [ano, setAno] = useState<string>(anoAtualString);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<FiltrosTransacoes>({
    barber_id: "todos",
    client_id: "todos",
    category: "todos",
    payment_method: "todos"
  });

  const { getRelatorioMensal } = useRelatorios();
  const { data: relatorio, isLoading } = getRelatorioMensal(mes, ano, filtros);
  const { barbers } = useBarbers();
  const { clientes } = useClientes();
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

  const handleFiltroChange = (campo: keyof FiltrosTransacoes, valor: string) => {
    setFiltros(prev => {
      const novosFiltros = {
        ...prev,
        [campo]: valor
      };

      // Se a categoria for alterada, verificar se deve desabilitar filtros de barbeiro e cliente
      if (campo === "category") {
        const categoriasComFiltros = ["todos", "servicos", "produtos"];
        const categoriaPermiteFiltros = categoriasComFiltros.includes(valor);
        
        if (!categoriaPermiteFiltros) {
          // Desabilitar filtros de barbeiro e cliente para categorias que não permitem
          novosFiltros.barber_id = "todos";
          novosFiltros.client_id = "todos";
        }
      }

      return novosFiltros;
    });
  };

  const limparFiltros = () => {
    setFiltros({
      barber_id: "todos",
      client_id: "todos",
      category: "todos",
      payment_method: "todos"
    });
  };

  // Usar transações já filtradas pelo hook
  const transacoesFiltradas = relatorio?.transacoes || [];

  // Obter métodos de pagamento únicos das transações
  const metodosPagamento = Array.from(
    new Set(
      relatorio?.transacoes
        ?.map(t => t.payment_method)
        .filter(Boolean) || []
    )
  ).sort();

  const agruparPorMetodoPagamento = (transacoes: { type: string; payment_method?: string; value: number }[], tipo: 'receita' | 'despesa') => {
    return transacoes
      .filter(t => t.type === tipo)
      .reduce((acc, curr) => {
        const metodo = curr.payment_method || "Não informado";
        acc[metodo] = (acc[metodo] || 0) + Number(curr.value);
        return acc;
      }, {} as Record<string, number>);
  };

  const agruparPorCategoria = (transacoes: { type: string; category?: string; payment_method?: string; value: number }[], tipo: 'receita' | 'despesa') => {
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
      case 'sistemas': return 'Sistemas';
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
          <div className="flex justify-between items-center">
            <CardTitle className="mb-4">Transações do Mês</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Barbeiro</label>
              <Select
                value={filtros.barber_id}
                onValueChange={(value) => handleFiltroChange("barber_id", value)}
                disabled={!["todos", "servicos", "produtos"].includes(filtros.category || "")}
              >
                <SelectTrigger className={!["todos", "servicos", "produtos"].includes(filtros.category || "") ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Barbeiros</SelectItem>
                  {barbers?.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select
                value={filtros.client_id}
                onValueChange={(value) => handleFiltroChange("client_id", value)}
                disabled={!["todos", "servicos", "produtos"].includes(filtros.category || "")}
              >
                <SelectTrigger className={!["todos", "servicos", "produtos"].includes(filtros.category || "") ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Clientes</SelectItem>
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.name}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={filtros.category}
                onValueChange={(value) => handleFiltroChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Categorias</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="equipamentos">Equipamentos</SelectItem>
                  <SelectItem value="assinaturas">Assinaturas</SelectItem>
                  <SelectItem value="comissoes">Comissões</SelectItem>
                  <SelectItem value="despesas_fixas">Despesas Fixas</SelectItem>
                  <SelectItem value="sistemas">Sistemas</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pagamento</label>
              <Select
                value={filtros.payment_method}
                onValueChange={(value) => handleFiltroChange("payment_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Métodos</SelectItem>
                  {metodosPagamento?.map((metodo) => (
                    <SelectItem key={metodo} value={metodo}>
                      {metodo}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão para limpar filtros */}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={limparFiltros}
              className="text-muted-foreground"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!mes || !ano ? (
            <div className="text-muted-foreground">
              Selecione um mês e ano para visualizar as transações.
            </div>
          ) : transacoesFiltradas.length === 0 ? (
            <div className="text-muted-foreground">
              Nenhuma transação encontrada para o período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {transacoesFiltradas.map((transacao) => (
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
                      {transacao.category === 'sistemas' && 'Sistemas'}
                      {transacao.category === 'assinaturas' && 'Assinaturas'}
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
