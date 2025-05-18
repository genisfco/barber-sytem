import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Trash2, Check, Power } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useClientes } from "@/hooks/useClientes";
import type { Cliente } from "@/types/cliente";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useClientesAssinantesCount } from "@/hooks/useClientes";
import { Badge } from "@/components/ui/badge";

type ClienteFormData = {
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  active: boolean;
};

const Clientes = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [subscriberDialogOpen, setSubscriberDialogOpen] = useState(false);
  const [showOnlySubscribers, setShowOnlySubscribers] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<ClienteFormData>({
    defaultValues: {
      active: true,
      notes: null
    }
  });
  const { clientes, isLoading, createCliente, updateCliente, toggleClienteStatus } = useClientes();
  const { data: assinantesCount, isLoading: isLoadingAssinantesCount, refetch: refetchAssinantesCount } = useClientesAssinantesCount();

  const onSubmit = async (data: ClienteFormData) => {
    if (selectedClient) {
      await updateCliente.mutateAsync({ ...data, id: selectedClient.id });
    } else {
      await createCliente.mutateAsync(data);
    }
    setOpen(false);
    setSelectedClient(null);
    reset();
    refetchAssinantesCount();
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setValue("name", cliente.name);
    setValue("email", cliente.email);
    setValue("phone", cliente.phone);
    setValue("notes", cliente.notes || "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await toggleClienteStatus.mutateAsync({ id, active: false });
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    await toggleClienteStatus.mutateAsync({ id: cliente.id, active: !cliente.active });
    setStatusDialogOpen(false);
    setSelectedClient(null);
  };

  const handleOpenDeleteDialog = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setDeleteDialogOpen(true);
  };

  const handleSubscriberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Função removida pois não há mais campo subscriber
  };

  const handleOpenStatusDialog = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setStatusDialogOpen(true);
  };

  const filteredClientes = clientes?.filter((cliente) =>
    (
      cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.phone.includes(searchTerm)
    )
  );

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-display text-barber-dark">Clientes</h1>
          <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) {
              setSelectedClient(null);
              reset();
            }
            setOpen(newOpen);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? "Editar Cliente" : "Cadastrar Novo Cliente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome do cliente"
                    {...register("name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite o e-mail do cliente"
                    {...register("email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="Digite o telefone do cliente"
                    {...register("phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    placeholder="Adicione observações sobre o cliente"
                    {...register("notes")}
                  />
                </div>
                <div className="h-4" />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setSelectedClient(null);
                      reset();
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCliente.isPending || updateCliente.isPending}
                  >
                    {(createCliente.isPending || updateCliente.isPending) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {selectedClient ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex justify-center mt-4 mb-2">
          <div className="w-full max-w-xs">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex flex-col items-center justify-center">
                    <span>Clientes Assinantes</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-3xl font-bold text-center cursor-pointer hover:text-yellow-600 transition"
                  onClick={() => setShowOnlySubscribers(true)}
                  title="Clique para ver apenas assinantes"
                >
                  {isLoadingAssinantesCount ? '...' : assinantesCount}
                </div>
                
              </CardContent>
            </Card>
          </div>
        </div>

        {showOnlySubscribers && (
          <div className="mb-2 flex justify-end">
            <button
              className="text-sm px-8 py-2 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition border border-yellow-300 font-semibold"
              onClick={() => setShowOnlySubscribers(false)}
            >
              Limpar filtro de assinantes
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredClientes?.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            filteredClientes?.map((cliente) => (
              <Card key={cliente.id} className={!cliente.active ? "opacity-70" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    {cliente.name}
                    {!cliente.active && (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenStatusDialog(cliente)}
                            className={cliente.active ? "text-red-500 hover:text-red-700 hover:bg-red-100" : "text-green-500 hover:text-green-700 hover:bg-green-100"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {cliente.active ? "Desativar cliente" : "Reativar cliente"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cliente)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Email: {cliente.email}</p>
                    <p>Telefone: {cliente.phone}</p>
                    {cliente.notes && <p>Observações: {cliente.notes}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar Cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar este cliente? Esta ação pode ser revertida posteriormente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedClient(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedClient && handleDelete(selectedClient.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {toggleClienteStatus.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedClient?.active ? "Desativar Cliente" : "Reativar Cliente"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedClient?.active 
                  ? "Tem certeza que deseja desativar este cliente? Esta ação pode ser revertida posteriormente."
                  : "Tem certeza que deseja reativar este cliente?"
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setStatusDialogOpen(false);
                setSelectedClient(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedClient && handleToggleStatus(selectedClient)}
                className={selectedClient?.active 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-green-600 text-white hover:bg-green-700"
                }
              >
                {toggleClienteStatus.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                {selectedClient?.active ? "Desativar" : "Reativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default Clientes;
