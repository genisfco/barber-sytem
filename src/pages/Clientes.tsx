import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Trash2, Check, Power } from "lucide-react";
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
import { useClientes, useClientesAssinantesDetalhado } from "@/hooks/useClientes";
import type { Cliente } from "@/types/cliente";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarberShopContext } from "@/contexts/BarberShopContext";
import { useBeneficiosRestantesCliente, useAssinaturaCliente } from "@/hooks/useAssinaturas";

type ClienteFormData = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  notes: string | null;
  active: boolean;
};

const Clientes = () => {
  const { selectedBarberShop } = useBarberShopContext();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [subscriberDialogOpen, setSubscriberDialogOpen] = useState(false);
  const [showOnlySubscribers, setShowOnlySubscribers] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'ativos' | 'inadimplentes'>('all');
  const { register, handleSubmit, reset, setValue, watch } = useForm<ClienteFormData>({
    defaultValues: {
      active: true,
      notes: null,
      cpf: ""
    }
  });
  const { clientes, isLoading, createCliente, updateCliente, toggleClienteStatus } = useClientes();
  const { data: assinantesDetalhado, isLoading: isLoadingAssinantesDetalhado, refetch: refetchAssinantesDetalhado } = useClientesAssinantesDetalhado();
  const [clientesAssinantes, setClientesAssinantes] = useState<string[]>([]);
  const [clientesAtivos, setClientesAtivos] = useState<string[]>([]);
  const [clientesInadimplentes, setClientesInadimplentes] = useState<string[]>([]);

  // Buscar clientes assinantes
  const { data: assinaturas } = useQuery({
    queryKey: ["clientes-assinantes", selectedBarberShop?.id],
    queryFn: async () => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          client_id,
          status,
          clients!inner(
            barber_shop_id
          ),
          subscription_plans!inner(
            barber_shop_id
          )
        `)
        .eq('clients.barber_shop_id', selectedBarberShop.id)
        .eq('subscription_plans.barber_shop_id', selectedBarberShop.id)
        .in('status', ['ativa', 'inadimplente']);
        

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberShop
  });

  // Atualizar listas de clientes assinantes quando as assinaturas mudarem
  useEffect(() => {
    if (assinaturas) {
      const ativos = assinaturas.filter(a => a.status === 'ativa').map(a => a.client_id);
      const inadimplentes = assinaturas.filter(a => a.status === 'inadimplente').map(a => a.client_id);
      
      setClientesAssinantes([...ativos, ...inadimplentes]);
      setClientesAtivos(ativos);
      setClientesInadimplentes(inadimplentes);
    }
  }, [assinaturas]);

  const onSubmit = async (data: ClienteFormData) => {
    if (selectedClient) {
      await updateCliente.mutateAsync({ ...data, id: selectedClient.id });
    } else {
      await createCliente.mutateAsync(data);
    }
    setOpen(false);
    setSelectedClient(null);
    reset();
    refetchAssinantesDetalhado();
  };

  const handleEdit = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setValue("name", cliente.name);
    setValue("cpf", cliente.cpf || "");
    setValue("email", cliente.email);
    setValue("phone", cliente.phone);
    setValue("notes", cliente.notes || "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await toggleClienteStatus.mutateAsync({ id, active: false });
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    await toggleClienteStatus.mutateAsync({ id: cliente.id, active: !cliente.active });
    setStatusDialogOpen(false);
    setSelectedClient(null);
  };

  const handleOpenDeleteDialog = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setDeleteDialogOpen(true);
  };

  const handleSubscriberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Função removida pois não há mais campo subscriber
  };

  const handleOpenStatusDialog = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setStatusDialogOpen(true);
  };

  const filteredClientes = clientes?.filter((cliente) => {
    if (!searchTerm) return true;
    const isNumber = /^\d+$/.test(searchTerm.replace(/\D/g, ''));
    if (isNumber) {
      // Busca por CPF (ignorando máscara)
      const clienteCPF = (cliente.cpf || '').replace(/\D/g, '');
      const searchCPF = searchTerm.replace(/\D/g, '');
      return clienteCPF.includes(searchCPF);
    } else {
      // Busca por nome
      return cliente.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  const formatName = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPhone = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (DDD + 8 para fixo ou 9 + 8 para celular)
    const limitedNumbers = numbers.slice(0, 11);
    
    // Verifica se é celular (começa com 9 após o DDD)
    if (limitedNumbers.length > 2 && limitedNumbers[2] === '9') {
      return limitedNumbers.replace(
        /^(\d{2})(\d{5})(\d{4})/,
        '($1) $2-$3'
      );
    }
    
    // Formato para telefone fixo
    return limitedNumbers.replace(
      /^(\d{2})(\d{4})(\d{4})/,
      '($1) $2-$3'
    );
  };

  const formatEmail = (value: string) => {
    return value.toLowerCase();
  };

  const formatCPF = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    // Aplica a máscara: 000.000.000-00
    return limitedNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (match, p1, p2, p3, p4) => {
      let result = `${p1}.${p2}.${p3}`;
      if (p4) result += `-${p4}`;
      return result;
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatName(e.target.value);
    setValue('name', formattedValue);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setValue('phone', formattedValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatEmail(e.target.value);
    setValue('email', formattedValue);
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPF(e.target.value);
    setValue('cpf', formattedValue);
  };

  const handleShowSubscribers = (type: 'all' | 'ativos' | 'inadimplentes') => {
    setShowOnlySubscribers(true);
    setFilterType(type);
  };

  const handleClearFilter = () => {
    setShowOnlySubscribers(false);
    setFilterType('all');
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          {/* <h1 className="text-2xl font-display text-barber-dark">Clientes</h1> */}
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-secondary">
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
                    placeholder="Digite o nome completo do cliente"
                    {...register("name")}
                    onChange={handleNameChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="Digite o CPF do cliente"
                    {...register("cpf")}
                    onChange={handleCPFChange}
                    maxLength={14} // 000.000.000-00 = 14 caracteres
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite o e-mail do cliente"
                    {...register("email")}
                    onChange={handleEmailChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="Digite o telefone do cliente"
                    {...register("phone")}
                    onChange={handlePhoneChange}
                    maxLength={15} // (XX) XXXXX-XXXX = 15 caracteres
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
                <div className="h-4" />
                <div className="flex justify-end gap-2 mt-4">
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

        

        <div className="flex justify-center mt-4 mb-2">
          <div className="w-full max-w-xs">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex flex-col items-center justify-center">
                    <span>Clientes Assinantes</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div
                    className="text-3xl font-bold text-center cursor-pointer hover:text-primary transition"
                    onClick={() => handleShowSubscribers('all')}
                    title="Clique para ver todos os assinantes"
                  >
                    {isLoadingAssinantesDetalhado ? '...' : assinantesDetalhado?.total || 0}
                  </div>
                  <div className="flex justify-between text-sm">
                    <div
                      className="text-green-600 font-semibold cursor-pointer hover:text-green-700 transition"
                      onClick={() => handleShowSubscribers('ativos')}
                      title="Clique para ver apenas assinantes ativos"
                    >
                      Ativas: {assinantesDetalhado?.ativos || 0}
                    </div>
                    <div
                      className="text-orange-500 font-semibold cursor-pointer hover:text-orange-700 transition"
                      onClick={() => handleShowSubscribers('inadimplentes')}
                      title="Clique para ver apenas assinantes inadimplentes"
                    >
                      Inadimplentes: {assinantesDetalhado?.inadimplentes || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-between items-center space-x-5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite Nome ou CPF para encontrar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {showOnlySubscribers && (
          <div className="flex justify-end">
            <button
              className="text-sm px-8 py-5 pt-3 pb-3 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition border border-yellow-300 font-semibold"
              onClick={handleClearFilter}
            >
              Limpar Filtro
            </button>
          </div>
          )}
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
              <Card 
                key={cliente.id} 
                className={`
                  ${!cliente.active ? "bg-red-600/40" : ""} 
                  ${!cliente.active ? "opacity-70" : ""} 
                  ${
                    showOnlySubscribers && clientesAssinantes.includes(cliente.id) 
                      ? clientesAtivos.includes(cliente.id)
                        ? "border-green-500 bg-green-700/10"
                        : "border-primary bg-primary/10"
                      : ""
                  }
                `}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    {cliente.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenStatusDialog(cliente)}
                            className={cliente.active ? "text-red-500 hover:text-red-700 hover:bg-red-100" : "text-green-500 hover:text-green-700 hover:bg-green-100"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {cliente.active ? "Desativar cliente" : "Reativar cliente"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cliente)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Email: {cliente.email}</p>
                    <p>Telefone: {cliente.phone}</p>
                    {showOnlySubscribers && clientesAssinantes.includes(cliente.id) && (
                      <BeneficiosCliente clienteId={cliente.id} />
                    )}
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
              <AlertDialogTitle>Desativar Cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar este cliente? Esta ação pode ser revertida posteriormente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedClient(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedClient && handleDelete(selectedClient.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {toggleClienteStatus.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedClient?.active ? "Desativar Cliente" : "Reativar Cliente"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedClient?.active 
                  ? "Tem certeza que deseja desativar este cliente? Esta ação pode ser revertida posteriormente."
                  : "Tem certeza que deseja reativar este cliente?"
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setStatusDialogOpen(false);
                setSelectedClient(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedClient && handleToggleStatus(selectedClient)}
                className={selectedClient?.active 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-green-600 text-white hover:bg-green-700"
                }
              >
                {toggleClienteStatus.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                {selectedClient?.active ? "Desativar" : "Reativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

function BeneficiosCliente({ clienteId }: { clienteId: string }) {
  // Buscar assinatura do cliente
  const { data: assinatura } = useAssinaturaCliente(clienteId);
  const clientSubscriptionId = assinatura?.id || null;
  const maxBenefits = assinatura?.subscription_plans?.max_benefits_per_month || null;
  const { data: beneficios, isLoading } = useBeneficiosRestantesCliente(clientSubscriptionId, maxBenefits);

  if (!assinatura || !maxBenefits) return null;
  return (
    <span className="text-xs font-normal text-green-700 bg-green-100 rounded px-2 py-1">
      {isLoading ? 'Carregando benefícios...' : `Benefícios disponíveis: ${Math.max(0, maxBenefits - (beneficios?.usados || 0))} de ${maxBenefits}`}
    </span>
  );
}

export default Clientes;
