import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Power, Info } from "lucide-react";
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
import { useServicosAdmin } from "@/hooks/useServicosAdmin";
import type { Servico } from "@/types/servico";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ServicoFormData = Omit<Servico, "id" | "created_at" | "updated_at" | "active" | "barber_shop_id"> & {
  commission_type?: 'percentual' | 'fixo' | '' | null;
  commission_extra_type?: 'percentual' | 'fixo' | '' | null;
};

const Servicos = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSemComissao, setIsSemComissao] = useState(true); // padrão: sem comissão
  const { register, handleSubmit, reset, setValue, control, watch } = useForm<ServicoFormData>({
    defaultValues: {
      has_commission: false, // padrão: sem comissão
    }
  });
  const { servicos, isLoading, createServico, updateServico, toggleServicoStatus } = useServicosAdmin();
  const [showResumoDialog, setShowResumoDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ServicoFormData | null>(null);

  const watchPrice = useWatch({ control, name: "price" });
  const watchCommissionType = useWatch({ control, name: "commission_type" });
  const watchCommissionValue = useWatch({ control, name: "commission_value" });
  const watchCommissionExtraType = useWatch({ control, name: "commission_extra_type" });
  const watchCommissionExtraValue = useWatch({ control, name: "commission_extra_value" });
  const watchDuration = useWatch({ control, name: "duration" });
  const watchHasCommission = watch('has_commission', false);

  const onSubmit = async (data: ServicoFormData) => {
    let payload = { ...data };
    if (payload.has_commission === false) {
      payload.commission_type = null;
      payload.commission_value = null;
      payload.commission_extra_type = null;
      payload.commission_extra_value = null;
    }
    if (selectedServico) {
      await updateServico.mutateAsync({
        ...payload,
        id: selectedServico.id,
      });
    } else {
      await createServico.mutateAsync(payload);
    }
    setOpen(false);
    setSelectedServico(null);
    reset();
  };

  const onSubmitWithResumo = (data: ServicoFormData) => {
    setPendingFormData(data);
    setShowResumoDialog(true);
  };

  const handleEdit = (servico: Servico) => {
    setSelectedServico(servico);
    setValue("name", servico.name);
    setValue("price", servico.price);
    setValue("duration", servico.duration);
    setValue("commission_type", servico.commission_type || "");
    setValue("commission_value", servico.commission_value ?? undefined);
    setValue("commission_extra_type", servico.commission_extra_type || "");
    setValue("commission_extra_value", servico.commission_extra_value ?? undefined);
    setValue("has_commission", servico.has_commission ?? false);
    setIsSemComissao(servico.has_commission === false);
    setOpen(true);
  };

  const handleToggleActive = async (servico: Servico) => {
    if (servico.active) {
      // Se estiver ativo, mostra diálogo de confirmação para desativar
      setSelectedServico(servico);
      setConfirmDialogOpen(true);
    } else {
      // Se estiver inativo, ativa diretamente sem confirmação
      await updateServico.mutateAsync({
        id: servico.id,
        active: true
      });
    }
  };

  const confirmDeactivate = async () => {
    if (selectedServico) {
      await updateServico.mutateAsync({
        id: selectedServico.id,
        active: false
      });
      setConfirmDialogOpen(false);
      setSelectedServico(null);
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

  const filteredServicos = servicos?.filter((servico) =>
    servico.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function calcularPreviewComissao(data: ServicoFormData) {
    if (data.has_commission === false) {
      return { detalhes: [], texto: 'Comissão: Sem comissão' };
    }
    const valorServico = data.price || 0;
    let comissao = 0;
    let detalhes = [];
    let adicional = 0;
    let texto = "";
    let usandoPadraoBarbeiro = false;

    // Comissão principal
    if (data.commission_type === "percentual" && data.commission_value) {
      comissao = valorServico * (data.commission_value / 100);
      detalhes.push(`${data.commission_value}% de R$ ${valorServico.toFixed(2)} = R$ ${comissao.toFixed(2)}`);
    } else if (data.commission_type === "fixo" && data.commission_value) {
      comissao = data.commission_value;
      detalhes.push(`Valor fixo: R$ ${comissao.toFixed(2)}`);
    } else {
      usandoPadraoBarbeiro = true;
      detalhes.push("Usando taxa padrão do barbeiro (ex: 30%)");
    }

    // Adicional
    if (data.commission_extra_type === "percentual" && data.commission_extra_value) {
      adicional = valorServico * (data.commission_extra_value / 100);
      detalhes.push(`Adicional: ${data.commission_extra_value}% de R$ ${valorServico.toFixed(2)} = R$ ${adicional.toFixed(2)}`);
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

  const commissionTypeValue = typeof watchCommissionType === 'string' && watchCommissionType === '' ? undefined : watchCommissionType;
  const commissionExtraTypeValue = typeof watchCommissionExtraType === 'string' && watchCommissionExtraType === '' ? undefined : watchCommissionExtraType;
  const preview = calcularPreviewComissao({
    name: '',
    price: watchPrice || 0,
    duration: watchDuration || 0,
    commission_type: (typeof watchCommissionType === 'string' && watchCommissionType === '') ? undefined : watchCommissionType as 'percentual' | 'fixo' | undefined,
    commission_value: watchCommissionValue ?? undefined,
    commission_extra_type: (typeof watchCommissionExtraType === 'string' && watchCommissionExtraType === '') ? undefined : watchCommissionExtraType as 'percentual' | 'fixo' | undefined,
    commission_extra_value: watchCommissionExtraValue ?? undefined,
    has_commission: watchHasCommission,
  });

  // Função utilitária para gerar resumo textual da comissão
  function resumoComissaoServico(servico: Servico) {
    if (servico.has_commission === false) {
      return 'Comissão: Sem comissão';
    }
    const valor = servico.price || 0;
    let texto = '';
    let usandoPadraoBarbeiro = false;
    let comissao = 0;
    let adicional = 0;
    let partes: string[] = [];

    if (servico.commission_type === 'percentual' && servico.commission_value) {
      partes.push(`${servico.commission_value}%`);
      comissao = valor * (servico.commission_value / 100);
    } else if (servico.commission_type === 'fixo' && servico.commission_value) {
      partes.push(`R$ ${servico.commission_value.toFixed(2)}`);
      comissao = servico.commission_value;
    } else {
      usandoPadraoBarbeiro = true;
      partes.push('(taxa barbeiro)');
    }

    if (servico.commission_extra_type === 'percentual' && servico.commission_extra_value) {
      partes.push(`+ ${servico.commission_extra_value}% adicional`);
      adicional = valor * (servico.commission_extra_value / 100);
    } else if (servico.commission_extra_type === 'fixo' && servico.commission_extra_value) {
      partes.push(`+ R$ ${servico.commission_extra_value.toFixed(2)} adicional`);
      adicional = servico.commission_extra_value;
    }

    if (usandoPadraoBarbeiro && partes.length === 1) {
      texto = `Comissão: (taxa barbeiro)`;
    } else {
      texto = `Comissão: ${partes.join(' ')}`;
    }
    return texto;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        {/* <h1 className="text-2xl font-display text-barber-dark">Serviços</h1> */}
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
            <DialogHeader>
              <DialogTitle>
                {selectedServico ? "Editar Serviço" : "Cadastrar Novo Serviço"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitWithResumo)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do serviço</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do serviço"
                  {...register("name")}
                  onChange={handleNameChange}
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
                <select
                  id="duration"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  {...register("duration", { valueAsNumber: true })}
                >
                  <option value="">Selecione a duração</option>
                  <option value="30">30 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="90">90 minutos</option>
                  <option value="120">120 minutos</option>
                </select>
              </div>
              <div className="my-6">
                <hr className="mb-2" />
                <div className="font-semibold text-base mb-2">Comissão do Serviço</div>
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
                <Label htmlFor="commission_type">Tipo de Comissão
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline ml-1 w-4 h-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs whitespace-pre-line">
                        <span>Escolha se a comissão será um percentual do valor do serviço, valor fixo ou usar apenas a taxa padrão do barbeiro.</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
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
                  {...register("commission_value", { valueAsNumber: true })}
                  disabled={isSemComissao || !watchCommissionType || watchCommissionType === ''}
                />
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
                  {...register("commission_extra_value", { valueAsNumber: true })}
                  disabled={isSemComissao || !watchCommissionExtraType || watchCommissionExtraType === ''}
                />
              </div>
              {(preview.detalhes.length > 0 || preview.texto) && (
                <div className="bg-muted p-3 rounded-lg text-sm mt-2">
                  <strong>Preview da Comissão:</strong>
                  <ul className="list-disc ml-5">
                    {preview.detalhes.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                  {preview.texto && <div className="mt-1 font-medium">{preview.texto}</div>}
                </div>
              )}
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
                  className={`flex items-center justify-between p-4 rounded-lg border ${!servico.active ? 'opacity-60' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                    <h3 className="font-medium">{servico.name}</h3>
                      {!servico.active && (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      R$ {servico.price.toFixed(2)} • {servico.duration} minutos
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {resumoComissaoServico(servico)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleActive(servico)}
                      title={servico.active ? "Desativar serviço" : "Ativar serviço"}
                    >
                      <Power className={`h-4 w-4 ${servico.active ? 'text-red-500' : 'text-green-500'}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(servico)}
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
              Tem certeza que deseja desativar o serviço {selectedServico?.name}? Ele não poderá ser selecionado para novos agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmDialogOpen(false);
              setSelectedServico(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateServico.isPending ? (
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
            <DialogTitle>Resumo da Comissão do Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div><strong>Nome:</strong> {pendingFormData?.name}</div>
            <div><strong>Preço:</strong> R$ {pendingFormData?.price?.toFixed(2)}</div>
            <div><strong>Duração:</strong> {pendingFormData?.duration} minutos</div>
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

export default Servicos; 