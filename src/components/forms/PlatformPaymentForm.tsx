import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatformPayments } from "@/hooks/usePlatformPayments";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Calculator, QrCode, Download, Copy, Gift, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { gerarPixQrCode } from "@/services/pixApi";
import { PixQRCodeModal } from "@/components/PixQRCodeModal";

interface PlatformPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  //{ value: "boleto", label: "Boleto" },
  //{ value: "cartao_credito", label: "Cartão de Crédito" },
  //{ value: "cartao_debito", label: "Cartão de Débito" },
];

export function PlatformPaymentForm({ open, onOpenChange, onSuccess }: PlatformPaymentFormProps) {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [notes, setNotes] = useState<string>("");
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [createdPayment, setCreatedPayment] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const { calculatePayment, createPayment, updatePayment, freeTrialStatus, getExistingPayment } = usePlatformPayments();
  const { toast } = useToast();

  useEffect(() => {
    if (open && month && year) {
      handleCalculate();
      setCreatedPayment(null);
      setShowQRCode(false);
      (async () => {
        try {
          const existing = await getExistingPayment({ month, year });
          //console.log('Pagamento existente encontrado:', existing);
          if (existing) {
            setCreatedPayment(existing);
          } else {
            setCreatedPayment(null);
          }
        } catch (e) {
          setCreatedPayment(null);
        }
      })();
    }
    // eslint-disable-next-line
  }, [month, year, open]);

  useEffect(() => {
    //console.log('createdPayment mudou:', createdPayment);
  }, [createdPayment]);

  const handleCalculate = async () => {
    try {
      const result = await calculatePayment.mutateAsync({ month, year });
      if (!result || result.appointments_count === 0) {
        setCalculationResult(null);
      } else {
        setCalculationResult(result);
      }
    } catch (error) {
      setCalculationResult(null);
      console.error("Erro ao calcular:", error);
    }
  };

  const handleCreatePayment = async () => {
    if (!calculationResult) return;
    try {
      // Se não existe, cria normalmente
      const payment = await createPayment.mutateAsync({
        month,
        year,
        payment_method: paymentMethod,
        notes,
      });
      setCreatedPayment(payment);
      toast({
        title: "Pagamento criado",
        description: "Pagamento da plataforma criado com sucesso.",
      });
    } catch (error: any) {
      setCreatedPayment(null);
      if (error?.message?.includes('duplicate key value') || error?.message?.includes('unique constraint')) {
        toast({
          title: "Pagamento já existe",
          description: "Já existe um pagamento criado para este mês. Verifique se está pendente ou já foi pago.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao criar pagamento da plataforma",
          variant: "destructive"
        });
      }
      console.error("Erro ao criar pagamento:", error);
    }
  };

  const handleShowQRCode = async () => {
    if (!createdPayment) return;
    try {
      // Use os dados reais do pagamento criado
      const pix = await gerarPixQrCode({
        amount: createdPayment.total_amount || calculationResult?.total_amount || 0,
        description: createdPayment.description || "Pagamento Plataforma",
        payer: {
          email: createdPayment.payer_email || "cliente@email.com",
          first_name: createdPayment.payer_first_name || "Cliente",
          last_name: createdPayment.payer_last_name || "Sistema"
        }
      });
      // Atualiza o campo pix_qr_code na tabela platform_payments
      if (createdPayment.id && pix?.qr_code) {
        await updatePayment.mutateAsync({
          id: createdPayment.id,
          pix_qr_code: pix.qr_code,
          pix_qr_code_expires_at: pix.expires_at || null,
          external_payment_id: pix.id || null
        });
      }
      setPixData(pix);
      setPixModalOpen(true);
    } catch (error) {
      setShowQRCode(false);
      console.error("Erro ao gerar QR Code:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Código PIX copiado para a área de transferência",
    });
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pagamento da Plataforma
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status do período gratuito */}
          {freeTrialStatus?.isFreeTrial && (
            <Alert className="border-green-200 bg-green-50">
              <Gift className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold mb-1">🎉 Período Gratuito Ativo!</div>
                <div className="text-sm">
                  {freeTrialStatus.reason}
                  {freeTrialStatus.daysLeft && freeTrialStatus.daysLeft > 0 && (
                    <span className="block mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {freeTrialStatus.daysLeft} dias restantes
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Seleção de período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Mês</Label>
              <Select value={month.toString()} onValueChange={(value) => setMonth(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((monthOption) => (
                    <SelectItem key={monthOption.value} value={monthOption.value.toString()}>
                      {monthOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>
          </div>

          {/* Cálculo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cálculo do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calculationResult ? (
                (calculationResult.is_free_trial || calculationResult.isFreeTrial) ? (
                  <div className="text-center text-green-700 font-semibold py-6">
                    🎉 Você está em período gratuito!<br />
                    Não haverá cobrança neste mês.<br />
                    <span className="text-sm text-muted-foreground">
                      Aproveite para testar todos os recursos da plataforma sem custo.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {calculationResult.appointments_count}
                        </div>
                        <div className="text-sm text-muted-foreground">Agendamentos Atendidos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatMoney(calculationResult.platform_fee)}
                        </div>
                        <div className="text-sm text-muted-foreground">Taxa por Agendamento</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatMoney(calculationResult.total_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total a Pagar</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Período: {MONTHS.find(m => m.value === month)?.label} de {year}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum agendamento atendido neste mês.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Método de pagamento */}
          <div>
            <Label htmlFor="payment_method">Método de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o pagamento..."
              rows={3}
            />
          </div>

          {/* QR Code PIX - removido o Card antigo */}
          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {createdPayment && paymentMethod === "pix" && !showQRCode && createdPayment.payment_status === 'pending' && (
              <Button
                variant="outline"
                onClick={handleShowQRCode}
                disabled={createPayment.isPending}
              >
                <Eye className="mr-2 h-4 w-4" />
                Visualizar QR Code
              </Button>
            )}
            <Button
              onClick={handleCreatePayment}
              disabled={
                !calculationResult ||
                createPayment.isPending ||
                createdPayment?.payment_status === 'pending' ||
                createdPayment?.payment_status === 'paid' ||
                calculationResult?.is_free_trial ||
                calculationResult?.isFreeTrial ||
                freeTrialStatus?.isFreeTrial
              }
              className={
                (calculationResult?.is_free_trial || calculationResult?.isFreeTrial || freeTrialStatus?.isFreeTrial)
                  ? "bg-green-600 hover:bg-green-700 cursor-not-allowed opacity-70"
                  : createdPayment?.payment_status === 'paid'
                    ? "bg-green-600 hover:bg-green-700 cursor-not-allowed opacity-70"
                    : ""
              }
            >
              {createPayment.isPending
                ? "Criando..."
                : (calculationResult?.is_free_trial || calculationResult?.isFreeTrial || freeTrialStatus?.isFreeTrial)
                  ? "Período Gratuito Ativo"
                  : createdPayment?.payment_status === 'paid'
                    ? "Pagamento OK!"
                    : "Criar Pagamento"}
            </Button>
          </div>
          {/* Modal do QR Code PIX real */}
          <PixQRCodeModal
            open={pixModalOpen}
            onOpenChange={setPixModalOpen}
            qrCode={pixData?.qr_code || ""}
            amount={pixData?.amount || createdPayment?.total_amount || 0}
            description={pixData?.description || createdPayment?.description || "Pagamento Plataforma"}
            expiresAt={pixData?.expires_at}
            paymentId={createdPayment?.id}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 