import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Trash2 } from "lucide-react";
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
  const { register, handleSubmit, reset, setValue } = useForm<ClienteFormData>({
    defaultValues: {
      active: true,
      notes: null
    }
  });
  const { clientes, isLoading, createCliente, updateCliente, deleteCliente } = useClientes();

  const onSubmit = async (data: ClienteFormData) => {
    if (selectedClient) {
      await updateCliente.mutateAsync({ ...data, id: selectedClient.id });
    } else {
      await createCliente.mutateAsync(data);
    }
    setOpen(false);
    setSelectedClient(null);
    reset();
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
    await deleteCliente.mutateAsync(id);
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleOpenDeleteDialog = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setDeleteDialogOpen(true);
  };

  const filteredClientes = clientes?.filter((cliente) =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.phone.includes(searchTerm)
  );

  return (
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
              <div className="flex justify-end gap-2">
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
            <Card key={cliente.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {cliente.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(cliente)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDeleteDialog(cliente)}
                  >
                    <Trash2 className="h-4 w-4" />
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
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedClient && handleDelete(selectedClient.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
