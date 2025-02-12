
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface BarbeiroFormData {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  commission_rate: string;
}

const Barbeiros = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBarbeiro, setEditingBarbeiro] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<any>(null);
  
  const { barbeiros, isLoading, createBarbeiro, updateBarbeiro, deleteBarbeiro } = useBarbeiros();
  const { register, handleSubmit, reset, setValue } = useForm<BarbeiroFormData>();

  const handleOpenEditDialog = (barbeiro: any) => {
    setEditingBarbeiro(barbeiro);
    setValue("name", barbeiro.name);
    setValue("email", barbeiro.email);
    setValue("phone", barbeiro.phone);
    setValue("specialty", barbeiro.specialty || "");
    setValue("commission_rate", barbeiro.commission_rate.toString());
    setOpen(true);
  };

  const handleOpenDeleteDialog = (barbeiro: any) => {
    setSelectedBarbeiro(barbeiro);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (selectedBarbeiro) {
      await deleteBarbeiro.mutateAsync(selectedBarbeiro.id);
      setDeleteDialogOpen(false);
      setSelectedBarbeiro(null);
    }
  };

  const filteredBarbeiros = barbeiros?.filter((barbeiro) =>
    barbeiro.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data: BarbeiroFormData) => {
    const barbeiroData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty || null,
      commission_rate: Number(data.commission_rate),
    };

    if (editingBarbeiro) {
      await updateBarbeiro.mutateAsync({
        id: editingBarbeiro.id,
        ...barbeiroData,
      });
    } else {
      await createBarbeiro.mutateAsync(barbeiroData);
    }

    setOpen(false);
    setEditingBarbeiro(null);
    reset();
  };

  const handleDialogClose = () => {
    setOpen(false);
    setEditingBarbeiro(null);
    reset();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Barbeiros</h1>
        <Dialog open={open} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBarbeiro ? "Editar Barbeiro" : "Cadastrar Novo Barbeiro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do barbeiro"
                  {...register("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o e-mail do barbeiro"
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
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  placeholder="Digite a especialidade do barbeiro"
                  {...register("specialty")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Comissão (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  placeholder="Digite a porcentagem de comissão"
                  {...register("commission_rate")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  {editingBarbeiro ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar barbeiro..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : barbeiros?.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum barbeiro cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarbeiros?.map((barbeiro) => (
                  <TableRow key={barbeiro.id}>
                    <TableCell>{barbeiro.name}</TableCell>
                    <TableCell>{barbeiro.email}</TableCell>
                    <TableCell>{barbeiro.phone}</TableCell>
                    <TableCell>{barbeiro.specialty || "-"}</TableCell>
                    <TableCell>{barbeiro.commission_rate}%</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(barbeiro)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(barbeiro)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o barbeiro {selectedBarbeiro?.name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Barbeiros;
