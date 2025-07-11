import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Copy, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string;
  amount: number;
  description: string;
  expiresAt?: string;
  onRefresh?: () => void;
  paymentId?: string; // Adiciona o id do pagamento para polling
}

export function PixQRCodeModal({ 
  open, 
  onOpenChange, 
  qrCode, 
  amount, 
  description, 
  expiresAt,
  onRefresh,
  paymentId
}: PixQRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { toast } = useToast();

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback para browsers antigos
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";  // Evita rolagem
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        // erro ao copiar
      }
      document.body.removeChild(textarea);
    }
  };

  const downloadQRCode = () => {
    // Criar um canvas para gerar a imagem do QR Code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 350;

    // Fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pagamento PIX', canvas.width / 2, 30);

    // Valor
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(formatMoney(amount), canvas.width / 2, 60);

    // Descrição
    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(description, canvas.width / 2, 85);

    // QR Code (simulado)
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(75, 100, 150, 150);
    
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code PIX', canvas.width / 2, 180);
    ctx.fillText('(Simulado)', canvas.width / 2, 195);

    // Código PIX
    ctx.font = '10px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Código PIX:', canvas.width / 2, 270);
    ctx.fillText(qrCode.substring(0, 30) + '...', canvas.width / 2, 285);

    // Download
    const link = document.createElement('a');
    link.download = `pix-pagamento-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Contador regressivo
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expirado");
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Polling para status do pagamento
  useEffect(() => {
    if (!open || !paymentId) return;
    let interval: NodeJS.Timeout;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/pagamento/status?id=${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          console.log('Status do pagamento:', data.payment_status); // <-- log para debug
          if (data.payment_status === 'paid') {
            toast({
              title: 'Pagamento recebido!',
              description: 'O pagamento foi confirmado com sucesso.',
              variant: 'success',
            });
            onOpenChange(false);
          }
        }
      } catch (e) {}
    };
    interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [open, paymentId, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do pagamento */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-blue-600">
                  {formatMoney(amount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {description}
                </div>
                {timeLeft && (
                  <div className="text-xs text-orange-600">
                    Expira em: {timeLeft}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="bg-gray-100 p-6 rounded-lg inline-block">
                  {qrCode ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCode)}&size=200x200`}
                      alt="QR Code Pix"
                      className="mx-auto"
                      style={{ width: 200, height: 200 }}
                    />
                  ) : (
                    <QrCode className="h-32 w-32 text-gray-600" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Escaneie o QR Code com seu app bancário
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Código PIX */}
          <div className="space-y-2">
            <Label>Código PIX</Label>
            <div className="flex gap-2">
              <Input
                value={qrCode}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(qrCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            {/* <Button
              variant="outline"
              onClick={downloadQRCode}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button> */}
            
            {onRefresh && (
              <Button
                variant="outline"
                onClick={onRefresh}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Renovar
              </Button>
            )}
          </div>

          {/* Instruções */}
          {/* <div className="text-xs text-muted-foreground space-y-1">
            <div>• Abra o app do seu banco</div>
            <div>• Escolha a opção PIX</div>
            <div>• Escaneie o QR Code ou cole o código</div>
            <div>• Confirme o pagamento</div>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
} 