import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Financeiro = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Financeiro</h1>
        <div className="space-x-2">
          <Button variant="outline">
            <Plus className="mr-2" />
            Nova Despesa
          </Button>
          <Button>
            <Plus className="mr-2" />
            Nova Receita
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ 0,00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Nenhuma transação registrada.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financeiro;