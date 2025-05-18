import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Power, ShoppingCart } from "lucide-react";
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
import { useProdutos } from "@/hooks/useProdutos";
import type { Produto } from "@/types/produto";
import { VenderProdutosForm } from "@/components/forms/VenderProdutosForm";
import { Badge } from "@/components/ui/badge";

type ProdutoFormData = {
  name: string;
  description: string;
  price: number;
  stock: number;
};

const Produtos = () => {
  const [open, setOpen] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<ProdutoFormData>();
  const { produtos, isLoading, createProduto, updateProduto } = useProdutos();

  const onSubmit = async (data: ProdutoFormData) => {
    const produtoData: Omit<Produto, "id" | "created_at" | "updated_at"> = {
      ...data,
      active: true,
    };

    if (selectedProduto) {
      await updateProduto.mutateAsync({ ...produtoData, id: selectedProduto.id });
    } else {
      await createProduto.mutateAsync(produtoData);
    }
    setOpen(false);
    setSelectedProduto(null);
    reset();
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setValue("name", produto.name);
    setValue("description", produto.description);
    setValue("price", produto.price);
    setValue("stock", produto.stock);
    setOpen(true);
  };

  const handleToggleActive = async (produto: Produto) => {
    if (produto.active) {
      // Se estiver ativo, mostra diálogo de confirmação para desativar
      setSelectedProduto(produto);
      setConfirmDialogOpen(true);
    } else {
      // Se estiver inativo, ativa diretamente sem confirmação
      await updateProduto.mutateAsync({
        id: produto.id,
        active: true
      });
    }
  };

  const confirmDeactivate = async () => {
    if (selectedProduto) {
      await updateProduto.mutateAsync({
        id: selectedProduto.id,
        active: false
      });
      setConfirmDialogOpen(false);
      setSelectedProduto(null);
    }
  };

  const filteredProdutos = produtos?.filter((produto) =>
    produto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Produtos</h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) {
              setSelectedProduto(null);
              reset();
            }
            setOpen(newOpen);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedProduto ? "Editar Produto" : "Cadastrar Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do produto</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome do produto"
                    {...register("name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Digite a descrição do produto"
                    {...register("description")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Digite o preço do produto"
                    {...register("price", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="Digite a quantidade em estoque"
                    {...register("stock", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setSelectedProduto(null);
                      reset();
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProduto.isPending || updateProduto.isPending}
                  >
                    {(createProduto.isPending || updateProduto.isPending) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {selectedProduto ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openVenda} onOpenChange={setOpenVenda}>
            <DialogTrigger asChild>
              <Button>
                <ShoppingCart className="mr-2" />
                Vender Produtos
              </Button>
            </DialogTrigger>
            <VenderProdutosForm 
              open={openVenda}
              onOpenChange={setOpenVenda}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          
          {isLoading ? (
            <div className="mt-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProdutos?.length === 0 ? (
            <div className="mt-6 text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredProdutos?.map((produto) => (
                <div
                  key={produto.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${!produto.active ? 'opacity-60' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{produto.name}</h3>
                      {!produto.active && (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {produto.description}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      R$ {produto.price.toFixed(2)} • Estoque: {produto.stock}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleActive(produto)}
                      title={produto.active ? "Desativar produto" : "Ativar produto"}
                    >
                      <Power className={`h-4 w-4 ${produto.active ? 'text-red-500' : 'text-green-500'}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(produto)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o produto {selectedProduto?.name}? Ele não poderá ser selecionado para vendas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmDialogOpen(false);
              setSelectedProduto(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateProduto.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Desativar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produtos; 