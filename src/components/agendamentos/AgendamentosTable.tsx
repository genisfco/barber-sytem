import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Pencil, Scissors, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useState } from "react";
import { AgendamentoForm } from "../forms/AgendamentoForm";
import { FinalizarAtendimentoForm } from "../forms/FinalizarAtendimentoForm";
import { useServicos } from "@/hooks/useServicos";
import { Agendamento } from "@/types/agendamento";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { logError } from "@/utils/logger";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgendamentosTableProps {
  agendamentos: Agendamento[] | undefined;
  isLoading: boolean;
}

export function AgendamentosTable({ agendamentos, isLoading }: AgendamentosTableProps) {
  const { updateAgendamento, updateAgendamentosRelacionados, marcarComoAtendido } = useAgendamentos(new Date());
  const [openEditForm, setOpenEditForm] = useState(false);
  const [openFinalizarForm, setOpenFinalizarForm] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<Agendamento>();
  const [agendamentoParaFinalizar, setAgendamentoParaFinalizar] = useState<Agendamento>();
  const { servicos } = useServicos();
  const isMobile = useIsMobile();

  const agendamentosDoDia = agendamentos
    ?.sort((a, b) => a.time.localeCompare(b.time)) || [];

  const agendamentosFiltrados = agendamentosDoDia;

  const handleConfirmar = async (id: string) => {
    // Encontra o agendamento para obter suas informações
    const agendamento = agendamentos?.find(a => a.id === id);
    if (!agendamento) {
      return;
    }

    try {
      // Atualiza todos os agendamentos relacionados
      await updateAgendamentosRelacionados.mutateAsync({
        client_id: agendamento.client_id,
        barber_id: agendamento.barber_id,
        date: agendamento.date,
        status: "confirmado"
      });
    } catch (error) {
      logError(error, '❌ Erro ao atualizar agendamentos:');
    }
  };

  const handleCancelar = async (id: string) => {
    await updateAgendamento.mutateAsync({
      id,
      status: "cancelado"
    });
  };

  const handleAtendido = (agendamento: Agendamento) => {
    if (agendamento.status !== "confirmado" && agendamento.status !== "atendido") {
      toast.error("Por favor, confirme o agendamento antes de finalizar o atendimento.");
      return;
    }
    setAgendamentoParaFinalizar(agendamento);
    setOpenFinalizarForm(true);
  };

  const handleEditar = async (agendamento: Agendamento) => {
    setAgendamentoParaEditar(agendamento);
    setOpenEditForm(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : agendamentosFiltrados?.length === 0 ? (
            <div className="text-muted-foreground">
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentosFiltrados?.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell>{agendamento.time.substring(0, 5)}</TableCell>
                    <TableCell>{agendamento.client_name}</TableCell>
                    <TableCell>{agendamento.barber_name}</TableCell>
                    <TableCell>
                      {agendamento.servicos?.map(s => s.service_name).join(', ') || 'Serviço não especificado'}
                    </TableCell>
                    <TableCell>{agendamento.status}</TableCell>
                    <TableCell className="text-right">
                      {agendamento.status !== "atendido" && (
                        <>
                          {/* Desktop: Botões visíveis */}
                          {!isMobile && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleConfirmar(agendamento.id)}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                title="Confirmar horário"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelar(agendamento.id)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                title="Cancelar agendamento"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditar(agendamento)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                title="Editar agendamento"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAtendido(agendamento)}
                                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                title="Finalizar atendimento"
                              >
                                <Scissors className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Mobile: Menu dropdown */}
                          {isMobile && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleConfirmar(agendamento.id)}>
                                  <Check className="mr-2 h-4 w-4 text-green-600" />
                                  Confirmar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelar(agendamento.id)}>
                                  <X className="mr-2 h-4 w-4 text-red-600" />
                                  Cancelar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditar(agendamento)}>
                                  <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAtendido(agendamento)}>
                                  <Scissors className="mr-2 h-4 w-4 text-purple-600" />
                                  Finalizar Atendimento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </>
                      )}
                      {agendamento.status === "atendido" && (
                        <>
                          {/* Desktop: Botão visível */}
                          {!isMobile && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAtendido(agendamento)}
                                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                title="Editar atendimento"
                              >
                                <Scissors className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Mobile: Menu dropdown */}
                          {isMobile && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAtendido(agendamento)}>
                                  <Scissors className="mr-2 h-4 w-4 text-purple-600" />
                                  Editar Atendimento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AgendamentoForm 
        open={openEditForm} 
        onOpenChange={setOpenEditForm}
        agendamentoParaEditar={agendamentoParaEditar}
        dataInicial={agendamentoParaEditar ? new Date(agendamentoParaEditar.date) : undefined}
      />

      {agendamentoParaFinalizar && (
        <FinalizarAtendimentoForm
          open={openFinalizarForm}
          onOpenChange={setOpenFinalizarForm}
          agendamento={agendamentoParaFinalizar}
        />
      )}

      <ToastContainer />
    </>
  );
}
