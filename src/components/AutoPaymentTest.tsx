import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { runAutomaticPaymentCreation, testAutomaticPaymentForBarberShop } from "@/services/autoPaymentService";
import { Play, TestTube, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TestResult {
  success: boolean;
  message: string;
  barberShopId?: string;
  month?: number;
  year?: number;
  paymentId?: string;
}

export function AutoPaymentTest() {
  const [isTestingOne, setIsTestingOne] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testBarberShopId, setTestBarberShopId] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const { selectedBarberShop } = useBarberShopContext();
  const { toast } = useToast();

  const testSingleBarberShop = async () => {
    const barberShopId = testBarberShopId || selectedBarberShop?.id;
    
    if (!barberShopId) {
      toast({
        title: "Erro",
        description: "ID da barbearia é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsTestingOne(true);
    setResults([]);

    try {
      const result = await testAutomaticPaymentForBarberShop(barberShopId);
      setResults([result]);
      
      toast({
        title: result.success ? "Teste concluído" : "Erro no teste",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorResult: TestResult = {
        success: false,
        message: `Erro: ${(error as Error).message}`,
        barberShopId
      };
      setResults([errorResult]);
      
      toast({
        title: "Erro no teste",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsTestingOne(false);
    }
  };

  const testAllBarberShops = async () => {
    setIsTestingAll(true);
    setResults([]);

    try {
      const results = await runAutomaticPaymentCreation();
      setResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Teste completo concluído",
        description: `${successCount} sucessos, ${errorCount} erros`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
    } catch (error) {
      const errorResult: TestResult = {
        success: false,
        message: `Erro geral: ${(error as Error).message}`
      };
      setResults([errorResult]);
      
      toast({
        title: "Erro no teste",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      if (result.paymentId) {
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      } else {
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      }
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (result: TestResult) => {
    if (result.success) {
      if (result.paymentId) {
        return "bg-green-100 text-green-800 border-green-200";
      } else {
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      }
    } else {
      return "bg-red-100 text-red-800 border-red-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste de Criação Automática de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teste de uma barbearia específica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Testar uma barbearia específica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barberShopId">ID da Barbearia</Label>
                <Input
                  id="barberShopId"
                  value={testBarberShopId}
                  onChange={(e) => setTestBarberShopId(e.target.value)}
                  placeholder={selectedBarberShop?.id || "Digite o ID da barbearia"}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Deixe vazio para usar a barbearia atual: {selectedBarberShop?.name}
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={testSingleBarberShop}
                  disabled={isTestingOne || (!testBarberShopId && !selectedBarberShop?.id)}
                  className="w-full"
                >
                  {isTestingOne ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Testar uma barbearia
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Teste de todas as barbearias */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Testar todas as barbearias</h3>
            <Button
              onClick={testAllBarberShops}
              disabled={isTestingAll}
              variant="outline"
              className="w-full"
            >
              {isTestingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando todas...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Testar todas as barbearias
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result)}
                    <div className="flex-1">
                      <div className="font-medium">{result.message}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.barberShopId && (
                          <span>Barbearia: {result.barberShopId}</span>
                        )}
                        {result.month && result.year && (
                          <span className="ml-3">Período: {result.month}/{result.year}</span>
                        )}
                        {result.paymentId && (
                          <span className="ml-3">ID do Pagamento: {result.paymentId}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(result)}>
                      {result.success ? (result.paymentId ? 'Criado' : 'OK') : 'Erro'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 