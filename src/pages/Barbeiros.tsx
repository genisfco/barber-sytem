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
import { useBarbeiros } from "@/hooks/useBarbeiros";
import type { Barbeiro } from "@/types/barbeiro";

type BarbeiroFormData = {
  name: string;
  email: string;
  phone: string;
};

const Barbeiros = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<Barbeiro | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<BarbeiroFormData>();
  const { barbeiros, isLoading, createBarbeiro, updateBarbeiro, deleteBarbeiro } = useBarbeiros();

  const onSubmit = async (data: BarbeiroFormData) => {
    const barbeiroData: Omit<Barbeiro, "id" | "created_at" | "updated_at"> = {
      ...data,
      active: true,
    };

    if (selectedBarbeiro) {
      await updateBarbeiro.mutateAsync({ ...barbeiroData, id: selectedBarbeiro.id });
    } else {
      await createBarbeiro.mutateAsync(barbeiroData);
    }
    setOpen(false);
    setSelectedBarbeiro(null);
    reset();
  };

  const handleEdit = (barbeiro: Barbeiro) => {
    setSelectedBarbeiro(barbeiro);
    setValue("name", barbeiro.name);
    setValue("email", barbeiro.email);
    setValue("phone", barbeiro.phone);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (selectedBarbeiro) {
      await deleteBarbeiro.mutateAsync(selectedBarbeiro.id);
      setDeleteDialogOpen(false);
      setSelectedBarbeiro(null);
    }
  };

  const handleOpenDeleteDialog = (barbeiro: Barbeiro) => {
    setSelectedBarbeiro(barbeiro);
    setDeleteDialogOpen(true);
  };

  const filteredBarbeiros = barbeiros?.filter((barbeiro) =>
    barbeiro.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Barbeiros</h1>
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (!newOpen) {
            setSelectedBarbeiro(null);
            reset();
          }
          setOpen(newOpen);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedBarbeiro ? "Editar Barbeiro" : "Cadastrar Novo Barbeiro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do barbeiro</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do barbeiro"
                  {...register("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o email do barbeiro"
                  {...register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="Digite o telefone do barbeiro"
                  {...register("phone")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setSelectedBarbeiro(null);
                    reset();
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBarbeiro.isPending || updateBarbeiro.isPending}
                >
                  {(createBarbeiro.isPending || updateBarbeiro.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {selectedBarbeiro ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Barbeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar barbeiro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          
          {isLoading ? (
            <div className="mt-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBarbeiros?.length === 0 ? (
            <div className="mt-6 text-muted-foreground">
              Nenhum barbeiro encontrado.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredBarbeiros?.map((barbeiro) => (
                <div
                  key={barbeiro.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{barbeiro.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {barbeiro.email} • {barbeiro.phone}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: {barbeiro.active ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(barbeiro)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(barbeiro)}
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
              Tem certeza que deseja excluir o barbeiro {selectedBarbeiro?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedBarbeiro(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBarbeiro && handleDelete(selectedBarbeiro.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBarbeiro.isPending ? (
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

export default Barbeiros;
