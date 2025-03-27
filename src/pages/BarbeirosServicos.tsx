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
import { useServicos } from "@/hooks/useServicos";
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

interface ServicoFormData {
  name: string;
  price: string;
  duration: string;
  description: string;
}

const Barbeiros = () => {
  const [openBarbeiro, setOpenBarbeiro] = useState(false);
  const [openServico, setOpenServico] = useState(false);
  const [searchTermBarbeiro, setSearchTermBarbeiro] = useState("");
  const [searchTermServico, setSearchTermServico] = useState("");
  const [editingBarbeiro, setEditingBarbeiro] = useState<any>(null);
  const [editingServico, setEditingServico] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteServicoDialogOpen, setDeleteServicoDialogOpen] = useState(false);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<any>(null);
  const [selectedServico, setSelectedServico] = useState<any>(null);
  
  const { barbeiros, isLoading: isLoadingBarbeiros, createBarbeiro, updateBarbeiro, deleteBarbeiro } = useBarbeiros();
  const { servicos, isLoading: isLoadingServicos, createServico, updateServico, deleteServico } = useServicos();
  
  const { register: registerBarbeiro, handleSubmit: handleSubmitBarbeiro, reset: resetBarbeiro, setValue: setValueBarbeiro } = useForm<BarbeiroFormData>();
  const { register: registerServico, handleSubmit: handleSubmitServico, reset: resetServico, setValue: setValueServico } = useForm<ServicoFormData>();

  const handleOpenNewDialog = () => {
    setEditingBarbeiro(null);
    resetBarbeiro({
      name: "",
      email: "",
      phone: "",
      specialty: "",
      commission_rate: "",
    });
    setOpenBarbeiro(true);
  };

  const handleOpenEditDialog = (barbeiro: any) => {
    setEditingBarbeiro(barbeiro);
    setValueBarbeiro("name", barbeiro.name);
    setValueBarbeiro("email", barbeiro.email);
    setValueBarbeiro("phone", barbeiro.phone);
    setValueBarbeiro("specialty", barbeiro.specialty || "");
    setValueBarbeiro("commission_rate", barbeiro.commission_rate.toString());
    setOpenBarbeiro(true);
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

  const handleOpenNewServicoDialog = () => {
    setEditingServico(null);
    resetServico({
      name: "",
      price: "",
      duration: "",
      description: "",
    });
    setOpenServico(true);
  };

  const handleOpenEditServicoDialog = (servico: any) => {
    setEditingServico(servico);
    setValueServico("name", servico.name);
    setValueServico("price", servico.price.toString());
    setValueServico("duration", servico.duration.toString());
    setValueServico("description", servico.description || "");
    setOpenServico(true);
  };

  const handleOpenDeleteServicoDialog = (servico: any) => {
    setSelectedServico(servico);
    setDeleteServicoDialogOpen(true);
  };

  const handleDeleteServico = async () => {
    if (selectedServico) {
      await deleteServico.mutateAsync(selectedServico.id);
      setDeleteServicoDialogOpen(false);
      setSelectedServico(null);
    }
  };

  const onSubmitBarbeiro = async (data: BarbeiroFormData) => {
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

    setOpenBarbeiro(false);
    setEditingBarbeiro(null);
    resetBarbeiro();
  };

  const handleBarbeiroDialogClose = () => {
    setOpenBarbeiro(false);
    setEditingBarbeiro(null);
    resetBarbeiro();
  };

  const onSubmitServico = async (data: ServicoFormData) => {
    const servicoData = {
      name: data.name,
      price: Number(data.price),
      duration: Number(data.duration),
      description: data.description || null,
    };

    if (editingServico) {
      await updateServico.mutateAsync({
        id: editingServico.id,
        ...servicoData,
      });
    } else {
      await createServico.mutateAsync(servicoData);
    }

    setOpenServico(false);
    setEditingServico(null);
    resetServico();
  };

  const handleServicoDialogClose = () => {
    setOpenServico(false);
    setEditingServico(null);
    resetServico();
  };

  const filteredBarbeiros = barbeiros?.filter((barbeiro) =>
    barbeiro.name.toLowerCase().includes(searchTermBarbeiro.toLowerCase())
  );

  const filteredServicos = servicos?.filter((servico) =>
    servico.name.toLowerCase().includes(searchTermServico.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Barbeiros</h1>
        <Button onClick={handleOpenNewDialog}>
          <Plus className="mr-2" />
          Novo Barbeiro
        </Button>
      </div>

      <Dialog open={openBarbeiro} onOpenChange={setOpenBarbeiro}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBarbeiro ? "Editar Barbeiro" : "Cadastrar Novo Barbeiro"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBarbeiro(onSubmitBarbeiro)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Digite o nome do barbeiro"
                {...registerBarbeiro("name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite o e-mail do barbeiro"
                {...registerBarbeiro("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="Digite o telefone do barbeiro"
                {...registerBarbeiro("phone")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                placeholder="Digite a especialidade do barbeiro"
                {...registerBarbeiro("specialty")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission_rate">Comissão (%)</Label>
              <Input
                id="commission_rate"
                type="number"
                placeholder="Digite a porcentagem de comissão"
                {...registerBarbeiro("commission_rate")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBarbeiroDialogClose}
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
              value={searchTermBarbeiro}
              onChange={(e) => setSearchTermBarbeiro(e.target.value)}
            />
          </div>

          {isLoadingBarbeiros ? (
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

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Serviços</h1>
        <Button onClick={handleOpenNewServicoDialog}>
          <Plus className="mr-2" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar serviço..."
              className="pl-10"
              value={searchTermServico}
              onChange={(e) => setSearchTermServico(e.target.value)}
            />
          </div>

          {isLoadingServicos ? (
            <div className="text-center py-4">Carregando...</div>
          ) : servicos?.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum serviço cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Duração (min)</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos?.map((servico) => (
                  <TableRow key={servico.id}>
                    <TableCell>{servico.name}</TableCell>
                    <TableCell>R$ {servico.price.toFixed(2)}</TableCell>
                    <TableCell>{servico.duration}</TableCell>
                    <TableCell>{servico.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditServicoDialog(servico)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteServicoDialog(servico)}
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

      <Dialog open={openServico} onOpenChange={setOpenServico}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingServico ? "Editar Serviço" : "Cadastrar Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitServico(onSubmitServico)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do serviço</Label>
              <Input
                id="name"
                placeholder="Digite o nome do serviço"
                {...registerServico("name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="Digite o preço do serviço"
                {...registerServico("price")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Digite a duração em minutos"
                {...registerServico("duration")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Digite uma descrição do serviço"
                {...registerServico("description")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleServicoDialogClose}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                {editingServico ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteServicoDialogOpen} onOpenChange={setDeleteServicoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço {selectedServico?.name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteServico}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
