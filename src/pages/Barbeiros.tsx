import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Loader2, Pencil, Power, Calendar } from "lucide-react";
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
import { useBarbers } from "@/hooks/useBarbers";
import { Database } from "@/integrations/supabase/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IndisponivelForm } from "@/components/forms/BarberIndisponivelForm";
import { Badge } from "@/components/ui/badge";

type Barber = Database['public']['Tables']['barbers']['Row'];

type BarberFormData = {
  name: string;
  email: string;
  phone: string;
  commission_rate: number;
};

const Barbeiros = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [openIndisponivelForm, setOpenIndisponivelForm] = useState(false);
  const [selectedBarberIndisponivel, setSelectedBarberIndisponivel] = useState<{id: string, name: string} | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm<BarberFormData>({
    defaultValues: {
      commission_rate: 30
    }
  });
  const { barbers, isLoading, createBarber, updateBarber, toggleBarberStatus } = useBarbers();

  const onSubmit = async (data: BarberFormData) => {
    try {
      if (selectedBarber) {
        await updateBarber.mutateAsync({ id: selectedBarber.id, barber: data });
      } else {
        await createBarber.mutateAsync(data);
      }
      setOpen(false);
      reset();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleEdit = (barber: Barber) => {
    setSelectedBarber(barber);
    setValue("name", barber.name);
    setValue("email", barber.email || "");
    setValue("phone", barber.phone || "");
    setValue("commission_rate", barber.commission_rate);
    setOpen(true);
  };

  const handleToggleStatus = async (barber: Barber) => {
    try {
      await toggleBarberStatus.mutateAsync({ id: barber.id, active: !barber.active });
      setStatusDialogOpen(false);
      setSelectedBarber(null);
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleOpenStatusDialog = (barber: Barber) => {
    setSelectedBarber(barber);
    setStatusDialogOpen(true);
  };

  const handleIndisponivelClick = (barberId: string, barberName: string) => {
    setSelectedBarberIndisponivel({ id: barberId, name: barberName });
    setOpenIndisponivelForm(true);
  };

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

  const filteredBarbers = barbers?.filter(barber =>
    barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (barber.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (barber.phone || "").includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Barbeiros</h1>
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (!newOpen) {
            setSelectedBarber(null);
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
                {selectedBarber ? "Editar Barbeiro" : "Cadastrar Novo Barbeiro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do barbeiro</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do barbeiro"
                  {...register("name")}
                  onChange={handleNameChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o email do barbeiro"
                  {...register("email")}
                  onChange={handleEmailChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="Digite o telefone do barbeiro"
                  {...register("phone")}
                  onChange={handlePhoneChange}
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
                    setSelectedBarber(null);
                    reset();
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBarber.isPending || updateBarber.isPending}
                >
                  {(createBarber.isPending || updateBarber.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {selectedBarber ? "Salvar" : "Cadastrar"}
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
        ) : filteredBarbers?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            Nenhum barbeiro encontrado
          </div>
        ) : (
          filteredBarbers?.map((barber) => (
            <Card key={barber.id} className={!barber.active ? "opacity-70" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  {barber.name}
                  {!barber.active && (
                    <Badge variant="destructive">Inativo</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenStatusDialog(barber)}
                          className={barber.active ? "text-red-500 hover:text-red-700 hover:bg-red-100" : "text-green-500 hover:text-green-700 hover:bg-green-100"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {barber.active ? "Desativar barbeiro" : "Reativar barbeiro"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(barber)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-sm text-muted-foreground">
                  <p>Email: {barber.email}</p>
                  <p>Telefone: {barber.phone}</p>
                  <p>Taxa de Comissão: {barber.commission_rate}%</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-3 right-6"
                        onClick={() => handleIndisponivelClick(barber.id, barber.name)}
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

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBarber?.active ? "Desativar Barbeiro" : "Reativar Barbeiro"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBarber?.active 
                ? "Tem certeza que deseja desativar este barbeiro? Esta ação pode ser revertida posteriormente."
                : "Tem certeza que deseja reativar este barbeiro?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setStatusDialogOpen(false);
              setSelectedBarber(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBarber && handleToggleStatus(selectedBarber)}
              className={selectedBarber?.active 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-green-600 text-white hover:bg-green-700"
              }
            >
              {toggleBarberStatus.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              {selectedBarber?.active ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openIndisponivelForm} onOpenChange={(open) => {
        setOpenIndisponivelForm(open);
        if (!open) {
          setSelectedBarberIndisponivel(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Indisponibilidade na Agenda</DialogTitle>
          </DialogHeader>
          {selectedBarberIndisponivel && (
            <IndisponivelForm
              barbeiroId={selectedBarberIndisponivel.id}
              barbeiroName={selectedBarberIndisponivel.name}
              onOpenChange={setOpenIndisponivelForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barbeiros;
