import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlatformPayments } from "@/hooks/usePlatformPayments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function PlatformPaymentsList() {
  const { platformPayments, isLoading } = usePlatformPayments();

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
                <TableHead>Atendimentos</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead className="text-center">Valor Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Método</TableHead>
                <TableHead className="text-right">Data Pagamento</TableHead>
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
                  <TableCell className="text-center font-semibold">
                    {formatMoney(payment.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={getStatusColor(payment.payment_status)}>
                      {getStatusText(payment.payment_status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {payment.payment_method ? (
                      <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.payment_date ? (
                      format(new Date(payment.payment_date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 