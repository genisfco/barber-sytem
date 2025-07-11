import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePlatformPayments } from "@/hooks/usePlatformPayments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, QrCode, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PixQRCodeModal } from "@/components/PixQRCodeModal";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function PlatformPaymentsList() {
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const { platformPayments, isLoading, deletePayment } = usePlatformPayments();
  const { toast } = useToast();

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "overdue":
        return "Vencido";
      default:
        return status;
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await deletePayment.mutateAsync(paymentToDelete.id);
      setPaymentToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos da Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos da Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          {!platformPayments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento da plataforma registrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Agendamentos</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {MONTHS[payment.month - 1]} {payment.year}
                    </TableCell>
                    <TableCell>{payment.appointments_count}</TableCell>
                    <TableCell>{formatMoney(payment.platform_fee)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(payment.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.payment_status)}>
                        {getStatusText(payment.payment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.payment_method ? (
                        <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.payment_date ? (
                        format(new Date(payment.payment_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Exibe o botão de visualizar QR Code apenas se já existir o QR Code */}
                        {payment.payment_method === "pix" && payment.pix_qr_code && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() => setPaymentToDelete(payment)}
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

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent className="bg-red-50 border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 text-center">Excluir Pagamento da Plataforma</AlertDialogTitle>
            <AlertDialogDescription className="text-red-700 text-center">
              <br />
              Tem certeza que deseja excluir este pagamento da plataforma?
              <br /><br />
              <div className="text-left">
                <p><span className="font-semibold">Período:</span> {paymentToDelete ? `${MONTHS[paymentToDelete.month - 1]} ${paymentToDelete.year}` : ''}</p>
                <br />
                <p><span className="font-semibold">Valor:</span> {paymentToDelete ? formatMoney(paymentToDelete.total_amount) : ''}</p>
                <br />
                <p><span className="font-semibold">Status:</span> {paymentToDelete ? getStatusText(paymentToDelete.payment_status) : ''}</p>
              </div>
              <br />
              <span className="font-bold text-red-600">ATENÇÃO:</span> Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePayment} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal do QR Code PIX */}
      {selectedPayment && (
        <PixQRCodeModal
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          qrCode={selectedPayment.pix_qr_code}
          amount={selectedPayment.total_amount}
          description={`Pagamento da plataforma - ${MONTHS[selectedPayment.month - 1]} ${selectedPayment.year}`}
          expiresAt={selectedPayment.pix_qr_code_expires_at}
        />
      )}
    </>
  );
} 