import { useState } from "react";
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
import type { Produto } from "@/types/produto";
import { VenderProdutosForm } from "@/components/forms/VenderProdutosForm";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ProdutoFormData = Omit<Produto, "id" | "created_at" | "updated_at" | "active"> & {
  commission_type?: 'percentual' | 'fixo' | '' | null;
  commission_extra_type?: 'percentual' | 'fixo' | '' | null;
};

const Produtos = () => {
  const [open, setOpen] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSemComissao, setIsSemComissao] = useState(true);
  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<ProdutoFormData>({
    defaultValues: {
      has_commission: false,
    }
  });
  const { produtos, isLoading, createProduto, updateProduto, toggleProdutoStatus } = useProdutosAdmin();
  const watchCommissionType = useWatch({ control, name: "commission_type" });
  const watchCommissionValue = useWatch({ control, name: "commission_value" });
  const watchCommissionExtraType = useWatch({ control, name: "commission_extra_type" });
  const watchCommissionExtraValue = useWatch({ control, name: "commission_extra_value" });
  const watchHasCommission = watch('has_commission', false);
  const [showResumoDialog, setShowResumoDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ProdutoFormData | null>(null);

  function calcularPreviewComissao(data: ProdutoFormData) {
    if (data.has_commission === false) {
      return { detalhes: [], texto: 'Comissão: Sem comissão' };
    }
    const valorProduto = data.price || 0;
    let comissao = 0;
    let detalhes = [];
    let adicional = 0;
    let texto = "";
    let usandoPadraoBarbeiro = false;

    if (data.commission_type === "percentual" && data.commission_value) {
      comissao = valorProduto * (data.commission_value / 100);
      detalhes.push(`${data.commission_value}% de R$ ${valorProduto.toFixed(2)} = R$ ${comissao.toFixed(2)}`);
    } else if (data.commission_type === "fixo" && data.commission_value) {
      comissao = data.commission_value;
      detalhes.push(`Valor fixo: R$ ${comissao.toFixed(2)}`);
    } else {
      usandoPadraoBarbeiro = true;
      detalhes.push("Usando taxa padrão do barbeiro (ex: 30%)");
    }

    if (data.commission_extra_type === "percentual" && data.commission_extra_value) {
      adicional = valorProduto * (data.commission_extra_value / 100);
      detalhes.push(`Adicional: ${data.commission_extra_value}% de R$ ${valorProduto.toFixed(2)} = R$ ${adicional.toFixed(2)}`);
    } else if (data.commission_extra_type === "fixo" && data.commission_extra_value) {
      adicional = data.commission_extra_value;
      detalhes.push(`Adicional fixo: R$ ${adicional.toFixed(2)}`);
    }

    if (usandoPadraoBarbeiro) {
      if (adicional > 0) {
        texto = `Total da comissão: R$ ${adicional.toFixed(2)} + (taxa barbeiro)`;
      } else {
        texto = `Total da comissão: (taxa barbeiro)`;
      }
    } else {
      texto = `Total da comissão: R$ ${(comissao + adicional).toFixed(2)}`;
    }

    return { detalhes, texto };
  }

  function resumoComissaoProduto(produto: Produto) {
    if (produto.has_commission === false) {
      return 'Comissão: Sem comissão';
    }
    const valor = produto.price || 0;
    let texto = '';
    let usandoPadraoBarbeiro = false;
    let comissao = 0;
    let adicional = 0;
    let partes: string[] = [];

    if (produto.commission_type === 'percentual' && produto.commission_value) {
      partes.push(`${produto.commission_value}%`);
      comissao = valor * (produto.commission_value / 100);
    } else if (produto.commission_type === 'fixo' && produto.commission_value) {
      partes.push(`R$ ${produto.commission_value.toFixed(2)}`);
      comissao = produto.commission_value;
    } else {
      usandoPadraoBarbeiro = true;
      partes.push('(taxa barbeiro)');
    }

    if (produto.commission_extra_type === 'percentual' && produto.commission_extra_value) {
      partes.push(`+ ${produto.commission_extra_value}% adicional`);
      adicional = valor * (produto.commission_extra_value / 100);
    } else if (produto.commission_extra_type === 'fixo' && produto.commission_extra_value) {
      partes.push(`+ R$ ${produto.commission_extra_value.toFixed(2)} adicional`);
      adicional = produto.commission_extra_value;
    }

    if (usandoPadraoBarbeiro && partes.length === 1) {
      texto = `Comissão: (taxa barbeiro)`;
    } else {
      texto = `Comissão: ${partes.join(' ')}`;
    }
    return texto;
  }

  const preview = calcularPreviewComissao({
    name: watch('name') || '',
    description: watch('description') || '',
    price: watch('price') || 0,
    stock: watch('stock') || 0,
    commission_type: (typeof watchCommissionType === 'string' && watchCommissionType === '') ? undefined : watchCommissionType as 'percentual' | 'fixo' | undefined,
    commission_value: watchCommissionValue ?? undefined,
    commission_extra_type: (typeof watchCommissionExtraType === 'string' && watchCommissionExtraType === '') ? undefined : watchCommissionExtraType as 'percentual' | 'fixo' | undefined,
    commission_extra_value: watchCommissionExtraValue ?? undefined,
    has_commission: !isSemComissao,
  });

  const onSubmit = async (data: ProdutoFormData) => {
    let payload = { ...data };
    if (payload.has_commission === false) {
      payload.commission_type = null;
      payload.commission_value = null;
      payload.commission_extra_type = null;
      payload.commission_extra_value = null;
    } else {
      if (!payload.commission_type || payload.commission_type === "") {
        payload.commission_type = null;
        payload.commission_value = null;
      }
      if (!payload.commission_extra_type || payload.commission_extra_type === "") {
        payload.commission_extra_type = null;
        payload.commission_extra_value = null;
      }
    }
    if (selectedProduto) {
      await updateProduto.mutateAsync({ ...payload, id: selectedProduto.id });
    } else {
      await createProduto.mutateAsync(payload);
    }
    setOpen(false);
    setSelectedProduto(null);
    reset();
    setIsSemComissao(true);
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setValue("name", produto.name);
    setValue("description", produto.description);
    setValue("price", produto.price);
    setValue("stock", produto.stock);
    setValue("commission_type", produto.commission_type || "");
    setValue("commission_value", produto.commission_value ?? undefined);
    setValue("commission_extra_type", produto.commission_extra_type || "");
    setValue("commission_extra_value", produto.commission_extra_value ?? undefined);
    setValue("has_commission", produto.has_commission ?? false);
    setIsSemComissao(produto.has_commission === false);
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
                  <Input
                    id="name"
                    placeholder="Digite o nome do produto"
                    {...register("name")}
                    onChange={handleNameChange}
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
                  <Label htmlFor="commission_type">Tipo de Comissão</Label>
                  <select
                    id="commission_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("commission_type")}
                    defaultValue=""
                    disabled={isSemComissao}
                  >
                    <option value="">Usar padrão do barbeiro</option>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_value">Valor da Comissão</Label>
                  <Input
                    id="commission_value"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 30 para 30% ou 10 para R$10,00"
                    {...register("commission_value", {
                      valueAsNumber: true,
                      validate: (value) => {
                        if (
                          !isSemComissao &&
                          (watchCommissionType === "percentual" || watchCommissionType === "fixo") &&
                          (!value || isNaN(value) || value <= 0)
                        ) {
                          return "Preencha um valor maior que zero para a comissão";
                        }
                        return true;
                      }
                    })}
                    disabled={isSemComissao || !watchCommissionType || watchCommissionType === ''}
                  />
                  {errors.commission_value && (
                    <span className="text-red-500 text-xs">{errors.commission_value.message}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_extra_type">Tipo de Adicional</Label>
                  <select
                    id="commission_extra_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...register("commission_extra_type")}
                    defaultValue=""
                    disabled={isSemComissao}
                  >
                    <option value="">Sem adicional</option>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_extra_value">Valor do Adicional</Label>
                  <Input
                    id="commission_extra_value"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10 para 10% ou 5 para R$5,00"
                    {...register("commission_extra_value", {
                      valueAsNumber: true,
                      validate: (value) => {
                        if (
                          !isSemComissao &&
                          (watchCommissionExtraType === "percentual" || watchCommissionExtraType === "fixo") &&
                          (!value || isNaN(value) || value <= 0)
                        ) {
                          return "Preencha um valor maior que zero para o adicional";
                        }
                        return true;
                      }
                    })}
                    disabled={isSemComissao || !watchCommissionExtraType || watchCommissionExtraType === ''}
                  />
                  {errors.commission_extra_value && (
                    <span className="text-red-500 text-xs">{errors.commission_extra_value.message}</span>
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
                {pendingFormData && calcularPreviewComissao({
                  ...pendingFormData,
                  commission_type: (typeof pendingFormData.commission_type === 'string' && pendingFormData.commission_type === '') ? undefined : pendingFormData.commission_type as 'percentual' | 'fixo' | undefined,
                  commission_extra_type: (typeof pendingFormData.commission_extra_type === 'string' && pendingFormData.commission_extra_type === '') ? undefined : pendingFormData.commission_extra_type as 'percentual' | 'fixo' | undefined,
                }).detalhes.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
              {pendingFormData && calcularPreviewComissao({
                ...pendingFormData,
                commission_type: (typeof pendingFormData.commission_type === 'string' && pendingFormData.commission_type === '') ? undefined : pendingFormData.commission_type as 'percentual' | 'fixo' | undefined,
                commission_extra_type: (typeof pendingFormData.commission_extra_type === 'string' && pendingFormData.commission_extra_type === '') ? undefined : pendingFormData.commission_extra_type as 'percentual' | 'fixo' | undefined,
              }).texto && (
                <div className="mt-1 font-medium">{calcularPreviewComissao({
                  ...pendingFormData,
                  commission_type: (typeof pendingFormData.commission_type === 'string' && pendingFormData.commission_type === '') ? undefined : pendingFormData.commission_type as 'percentual' | 'fixo' | undefined,
                  commission_extra_type: (typeof pendingFormData.commission_extra_type === 'string' && pendingFormData.commission_extra_type === '') ? undefined : pendingFormData.commission_extra_type as 'percentual' | 'fixo' | undefined,
                }).texto}</div>
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
                await onSubmit({
                  ...pendingFormData,
                  commission_type: (typeof pendingFormData.commission_type === 'string' && pendingFormData.commission_type === '') ? undefined : pendingFormData.commission_type as 'percentual' | 'fixo' | undefined,
                  commission_extra_type: (typeof pendingFormData.commission_extra_type === 'string' && pendingFormData.commission_extra_type === '') ? undefined : pendingFormData.commission_extra_type as 'percentual' | 'fixo' | undefined,
                });
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