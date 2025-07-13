import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Power, ShoppingCart, Info } from "lucide-react";
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
import { useForm, useWatch } from "react-hook-form";
import { useProdutosAdmin } from "@/hooks/useProdutosAdmin";
import { VenderProdutosForm } from "@/components/forms/VenderProdutosForm";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database } from "@/integrations/supabase/types";

type Produto = Database['public']['Tables']['products']['Row'];
type ProdutoFormData = Omit<Produto, "id" | "created_at" | "updated_at" | "active" | "barber_shop_id">;

const Produtos = () => {
  const [open, setOpen] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSemComissao, setIsSemComissao] = useState(true);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  const [isValidatingName, setIsValidatingName] = useState(false);
  
  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<ProdutoFormData>({
    defaultValues: {
      has_commission: false,
    }
  });
  const { produtos, isLoading, createProduto, updateProduto, toggleProdutoStatus, checkProductNameExists } = useProdutosAdmin();
  const watchBonusType = useWatch({ control, name: "bonus_type" });
  const watchBonusValue = useWatch({ control, name: "bonus_value" });
  const watchHasCommission = watch('has_commission', false);
  const watchName = useWatch({ control, name: "name" });
  const [showResumoDialog, setShowResumoDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ProdutoFormData | null>(null);

  // Validação em tempo real do nome do produto
  useEffect(() => {
    const validateName = async () => {
      if (!watchName || watchName.trim().length < 2) {
        setNameValidationError(null);
        return;
      }

      setIsValidatingName(true);
      try {
        const nameExists = await checkProductNameExists(watchName.trim(), selectedProduto?.id);
        if (nameExists) {
          setNameValidationError("Já existe um produto com este nome na barbearia.");
        } else {
          setNameValidationError(null);
        }
      } catch (error) {
        console.error("Erro ao validar nome:", error);
        setNameValidationError("Erro ao validar nome do produto.");
      } finally {
        setIsValidatingName(false);
      }
    };

    const timeoutId = setTimeout(validateName, 500); // Debounce de 500ms
    return () => clearTimeout(timeoutId);
  }, [watchName, selectedProduto?.id, checkProductNameExists]);

  function calcularPreviewComissao(data: ProdutoFormData) {
    if (data.has_commission === false) {
      return { detalhes: [], texto: 'Bonus: Sem comissão' };
    }
    const valorProduto = data.price || 0;
    let bonus = 0;
    let detalhes = [];
    let texto = "";

    if (data.bonus_type === "percentual" && data.bonus_value) {
      bonus = valorProduto * (data.bonus_value / 100);
      detalhes.push(`Bonus: ${data.bonus_value}% de R$ ${valorProduto.toFixed(2)} = R$ ${bonus.toFixed(2)}`);
    } else if (data.bonus_type === "fixo" && data.bonus_value) {
      bonus = data.bonus_value;
      detalhes.push(`Bonus fixo: R$ ${bonus.toFixed(2)}`);
    } else {
      detalhes.push("Sem bonus configurado");
    }

    texto = `Total do bonus: R$ ${bonus.toFixed(2)}`;
    return { detalhes, texto };
  }

  function resumoComissaoProduto(produto: Produto) {
    if (produto.has_commission === false) {
      return 'Bonus: Sem comissão';
    }
    const valor = produto.price || 0;
    let texto = '';
    let bonus = 0;

    if (produto.bonus_type === 'percentual' && produto.bonus_value) {
      texto = `Bonus: ${produto.bonus_value}%`;
      bonus = valor * (produto.bonus_value / 100);
    } else if (produto.bonus_type === 'fixo' && produto.bonus_value) {
      texto = `Bonus: R$ ${produto.bonus_value.toFixed(2)}`;
      bonus = produto.bonus_value;
    } else {
      texto = 'Bonus: Sem bonus configurado';
    }
    return texto;
  }

  const preview = calcularPreviewComissao({
    name: watch('name') || '',
    description: watch('description') || '',
    price: watch('price') || 0,
    stock: watch('stock') || 0,
    bonus_type: watchBonusType || undefined,
    bonus_value: watchBonusValue ?? undefined,
    has_commission: !isSemComissao,
  });

  const onSubmit = async (data: ProdutoFormData) => {
    // Verificar se há erro de validação do nome
    if (nameValidationError) {
      return;
    }

    let payload = { ...data };
    if (payload.has_commission === false) {
      payload.bonus_type = null;
      payload.bonus_value = null;
    } else {
      if (!payload.bonus_type) {
        payload.bonus_type = null;
        payload.bonus_value = null;
      }
    }
    if (selectedProduto) {
      await updateProduto.mutateAsync({ ...payload, id: selectedProduto.id });
    } else {
      const { active, ...createPayload } = payload;
      await createProduto.mutateAsync(createPayload);
    }
    setOpen(false);
    setSelectedProduto(null);
    reset();
    setIsSemComissao(true);
    setNameValidationError(null);
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setValue("name", produto.name);
    setValue("description", produto.description);
    setValue("price", produto.price);
    setValue("stock", produto.stock);
    setValue("bonus_type", produto.bonus_type || null);
    setValue("bonus_value", produto.bonus_value ?? undefined);
    setValue("has_commission", produto.has_commission ?? false);
    setIsSemComissao(produto.has_commission === false);
    setNameValidationError(null);
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

  const formatName = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatName(e.target.value);
    setValue('name', formattedValue);
  };

  const filteredProdutos = produtos?.filter((produto) =>
    produto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        {/* <h1 className="text-2xl font-display text-barber-dark">Produtos</h1> */}
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) {
              setSelectedProduto(null);
              reset();
              setNameValidationError(null);
            }
            setOpen(newOpen);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
              <DialogHeader>
                <DialogTitle>
                  {selectedProduto ? "Editar Produto" : "Cadastrar Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((data) => {
                setPendingFormData(data);
                setShowResumoDialog(true);
              })} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do produto</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="Digite o nome do produto"
                      {...register("name", { 
                        required: "Nome é obrigatório",
                        minLength: { value: 2, message: "Nome deve ter pelo menos 2 caracteres" }
                      })}
                      onChange={handleNameChange}
                      className={nameValidationError ? "border-red-500" : ""}
                    />
                    {isValidatingName && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {nameValidationError && (
                    <span className="text-red-500 text-xs">{nameValidationError}</span>
                  )}
                  {errors.name && !nameValidationError && (
                    <span className="text-red-500 text-xs">{errors.name.message}</span>
                  )}
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
                <div className="my-6">
                  <hr className="mb-2" />
                  <div className="font-semibold text-base mb-2">Comissão do Produto</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSemComissao}
                        onChange={e => {
                          setIsSemComissao(e.target.checked);
                          setValue('has_commission', !e.target.checked);
                        }}
                      />
                      Sem Comissão
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus_type">Tipo de Bônus</Label>
                  <select
                    id="bonus_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("bonus_type")}
                    defaultValue=""
                    disabled={isSemComissao}
                  >
                    <option value="">Selecione</option>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus_value">Valor do Bônus</Label>
                  <Input
                    id="bonus_value"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10 para 10% ou 5 para R$5,00"
                    {...register("bonus_value", {
                      valueAsNumber: true,
                      validate: (value) => {
                        if (
                          !isSemComissao &&
                          (watchBonusType === "percentual" || watchBonusType === "fixo") &&
                          (!value || isNaN(value) || value <= 0)
                        ) {
                          return "Preencha um valor maior que zero para o bônus";
                        }
                        return true;
                      }
                    })}
                    disabled={isSemComissao || !watchBonusType}
                  />
                  {errors.bonus_value && (
                    <span className="text-red-500 text-xs">{errors.bonus_value.message}</span>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setSelectedProduto(null);
                      reset();
                      setNameValidationError(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProduto.isPending || updateProduto.isPending || !!nameValidationError || isValidatingName}
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
              {(preview.detalhes.length > 0 || preview.texto) && (
                <div className="bg-muted p-3 rounded-lg text-sm mt-2">
                  <strong>Preview da Comissão:</strong>
                  <ul className="list-disc ml-5">
                    {preview.detalhes.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                  {preview.texto && <div className="mt-1 font-medium">{preview.texto}</div>}
                </div>
              )}
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
                    <div className="text-sm text-muted-foreground">
                      {resumoComissaoProduto(produto)}
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

      <Dialog open={showResumoDialog} onOpenChange={setShowResumoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo da Comissão do Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div><strong>Nome:</strong> {pendingFormData?.name}</div>
            <div><strong>Descrição:</strong> {pendingFormData?.description}</div>
            <div><strong>Preço:</strong> R$ {pendingFormData?.price?.toFixed(2)}</div>
            <div><strong>Estoque:</strong> {pendingFormData?.stock}</div>
            <div className="bg-muted p-2 rounded">
              <strong>Como será calculada a comissão:</strong>
              <ul className="list-disc ml-5">
                {pendingFormData && calcularPreviewComissao(pendingFormData).detalhes.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
              {pendingFormData && calcularPreviewComissao(pendingFormData).texto && (
                <div className="mt-1 font-medium">{calcularPreviewComissao(pendingFormData).texto}</div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              * O cálculo final pode variar se "Usar padrão do barbeiro" estiver selecionado, pois depende da configuração do barbeiro.
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowResumoDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (pendingFormData) {
                await onSubmit(pendingFormData);
                setShowResumoDialog(false);
              }
            }}>
              Confirmar e Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos; 