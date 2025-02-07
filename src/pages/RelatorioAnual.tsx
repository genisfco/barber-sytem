
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const RelatorioAnual = () => {
  const anoAtual = new Date().getFullYear();
  const anos = Array.from(
    { length: 5 },
    (_, i) => anoAtual - 2 + i
  );

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
        <Select>
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
            <CardTitle className="text-green-600">Receitas do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Despesas do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações do Ano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Selecione um ano para visualizar as transações.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioAnual;
