import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Trash2, Calendar } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IndisponivelForm } from "@/components/forms/BarberIndisponivelForm";

type BarbeiroFormData = {
  name: string;
  email: string;
  phone: string;
  commission_rate: number;
};

const Barbeiros = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<Barbeiro | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openIndisponivelForm, setOpenIndisponivelForm] = useState(false);
  const [selectedBarbeiroIndisponivel, setSelectedBarbeiroIndisponivel] = useState<{id: string, name: string} | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm<BarbeiroFormData>({
    defaultValues: {
      commission_rate: 30
    }
  });
  const { barbeiros, isLoading, createBarbeiro, updateBarbeiro, deleteBarbeiro } = useBarbeiros();

  const onSubmit = async (data: BarbeiroFormData) => {
    const barbeiroData: Omit<Barbeiro, "id" | "created_at" | "updated_at"> = {
      ...data,
      active: true,
      commission_rate: data.commission_rate || 30,
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
    setValue("commission_rate", barbeiro.commission_rate);
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

  const handleIndisponivelClick = (barbeiroId: string, barbeiroName: string) => {
    setSelectedBarbeiroIndisponivel({ id: barbeiroId, name: barbeiroName });
    setOpenIndisponivelForm(true);
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
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Taxa de Comissão (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Digite a taxa de comissão (padrão: 30)"
                  {...register("commission_rate", { valueAsNumber: true })}
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
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar barbeiro..."
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
        ) : filteredBarbeiros?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            Nenhum barbeiro encontrado
          </div>
        ) : (
          filteredBarbeiros?.map((barbeiro) => (
            <Card key={barbeiro.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {barbeiro.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bottom-3 right-3"
                    onClick={() => handleEdit(barbeiro)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bottom-3 right-3"
                    onClick={() => handleOpenDeleteDialog(barbeiro)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-sm text-muted-foreground">
                  <p>Email: {barbeiro.email}</p>
                  <p>Telefone: {barbeiro.phone}</p>
                  <p>Taxa de Comissão: {barbeiro.commission_rate}%</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-3 right-6"
                        onClick={() => handleIndisponivelClick(barbeiro.id, barbeiro.name)}
                      >
                        <Calendar className="h-8 w-8 text-barber-dark" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Indisponibilidade na agenda</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Barbeiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este barbeiro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(selectedBarbeiro?.id || "")}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={openIndisponivelForm} onOpenChange={setOpenIndisponivelForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Indisponibilidade na Agenda</DialogTitle>
          </DialogHeader>
          {selectedBarbeiroIndisponivel && (
            <IndisponivelForm
              barbeiroId={selectedBarbeiroIndisponivel.id}
              barbeiroName={selectedBarbeiroIndisponivel.name}
              onOpenChange={setOpenIndisponivelForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barbeiros;
