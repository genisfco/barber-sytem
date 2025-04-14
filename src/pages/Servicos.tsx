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
import { useServicos } from "@/hooks/useServicos";
import type { Servico } from "@/types/servico";

type ServicoFormData = Omit<Servico, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

const Servicos = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<ServicoFormData>();
  const { servicos, isLoading, createServico, updateServico, deleteServico } = useServicos();

  const onSubmit = async (data: ServicoFormData) => {
    if (selectedServico) {
      await updateServico.mutateAsync({
        ...data,
        id: selectedServico.id,
        created_at: selectedServico.created_at,
        updated_at: new Date().toISOString()
      });
    } else {
      await createServico.mutateAsync(data);
    }
    setOpen(false);
    setSelectedServico(null);
    reset();
  };

  const handleEdit = (servico: Servico) => {
    setSelectedServico(servico);
    setValue("name", servico.name);
    setValue("price", servico.price);
    setValue("duration", servico.duration);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteServico.mutateAsync(id);
    setDeleteDialogOpen(false);
    setSelectedServico(null);
  };

  const handleOpenDeleteDialog = (servico: Servico) => {
    setSelectedServico(servico);
    setDeleteDialogOpen(true);
  };

  const filteredServicos = servicos?.filter((servico) =>
    servico.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Serviços</h1>
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (!newOpen) {
            setSelectedServico(null);
            reset();
          }
          setOpen(newOpen);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedServico ? "Editar Serviço" : "Cadastrar Novo Serviço"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do serviço</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do serviço"
                  {...register("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="Digite o preço do serviço"
                  {...register("price", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Digite a duração em minutos"
                  {...register("duration", { valueAsNumber: true })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setSelectedServico(null);
                    reset();
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServico.isPending || updateServico.isPending}
                >
                  {(createServico.isPending || updateServico.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {selectedServico ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          
          {isLoading ? (
            <div className="mt-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredServicos?.length === 0 ? (
            <div className="mt-6 text-muted-foreground">
              Nenhum serviço encontrado.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredServicos?.map((servico) => (
                <div
                  key={servico.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{servico.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      R$ {servico.price.toFixed(2)} • {servico.duration} minutos
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(servico)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(servico)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço {selectedServico?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedServico(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedServico && handleDelete(selectedServico.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteServico.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Servicos; 