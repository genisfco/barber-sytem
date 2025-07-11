import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Gift, Plus, Edit, Trash2, Calendar, Clock } from "lucide-react";

interface FreeTrialPeriod {
  id: string;
  barber_shop_id: string;
  barber_shop_name: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  active: boolean;
  created_at: string;
}

export function FreeTrialManager() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<FreeTrialPeriod | null>(null);
  const [periodToDelete, setPeriodToDelete] = useState<FreeTrialPeriod | null>(null);
  const [formData, setFormData] = useState({
    barber_shop_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar períodos gratuitos
  const { data: freeTrialPeriods, isLoading } = useQuery({
    queryKey: ['free-trial-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('free_trial_periods')
        .select(`
          *,
          barber_shop:barber_shops(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data?.map(period => ({
        ...period,
        barber_shop_name: period.barber_shop?.name || 'Barbearia não encontrada'
      })) || [];
    }
  });

  // Buscar barbearias
  const { data: barberShops } = useQuery({
    queryKey: ['barber-shops-for-trial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_shops')
        .select('id, name')
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    }
  });

  // Criar período gratuito
  const createFreeTrial = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from('free_trial_periods')
        .insert({
          barber_shop_id: data.barber_shop_id,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-trial-periods'] });
      toast({
        title: "Período gratuito criado",
        description: "Período gratuito criado com sucesso",
      });
      setOpenDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar período gratuito",
        variant: "destructive",
      });
    }
  });

  // Atualizar período gratuito
  const updateFreeTrial = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { data: result, error } = await supabase
        .from('free_trial_periods')
        .update({
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-trial-periods'] });
      toast({
        title: "Período gratuito atualizado",
        description: "Período gratuito atualizado com sucesso",
      });
      setOpenDialog(false);
      setEditingPeriod(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar período gratuito",
        variant: "destructive",
      });
    }
  });

  // Excluir período gratuito
  const deleteFreeTrial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('free_trial_periods')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-trial-periods'] });
      toast({
        title: "Período gratuito excluído",
        description: "Período gratuito excluído com sucesso",
      });
      setPeriodToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir período gratuito",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      barber_shop_id: '',
      start_date: '',
      end_date: '',
      reason: ''
    });
  };

  const handleEdit = (period: FreeTrialPeriod) => {
    setEditingPeriod(period);
    setFormData({
      barber_shop_id: period.barber_shop_id,
      start_date: period.start_date,
      end_date: period.end_date,
      reason: period.reason || ''
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (editingPeriod) {
      updateFreeTrial.mutate({ id: editingPeriod.id, ...formData });
    } else {
      createFreeTrial.mutate(formData);
    }
  };

  const getStatusColor = (period: FreeTrialPeriod) => {
    const today = new Date();
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);

    if (!period.active) return "bg-gray-100 text-gray-800";
    if (today < startDate) return "bg-blue-100 text-blue-800";
    if (today >= startDate && today <= endDate) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusText = (period: FreeTrialPeriod) => {
    const today = new Date();
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);

    if (!period.active) return "Inativo";
    if (today < startDate) return "Aguardando";
    if (today >= startDate && today <= endDate) return "Ativo";
    return "Expirado";
  };

  const calculateDaysLeft = (period: FreeTrialPeriod) => {
    const today = new Date();
    const endDate = new Date(period.end_date);
    const diff = endDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gerenciar Períodos Gratuitos
            </CardTitle>
            <Button onClick={() => setOpenDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Período
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Carregando...</div>
          ) : !freeTrialPeriods?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum período gratuito registrado.
            </div>
          ) : (
            <div className="space-y-4">
              {freeTrialPeriods.map((period) => (
                <div key={period.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-semibold">{period.barber_shop_name}</div>
                      <div className="text-sm text-muted-foreground">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {format(new Date(period.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(period.end_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {period.reason && (
                        <div className="text-sm text-muted-foreground">
                          Motivo: {period.reason}
                        </div>
                      )}
                      {period.active && getStatusText(period) === 'Ativo' && (
                        <div className="text-sm text-green-600">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {calculateDaysLeft(period)} dias restantes
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(period)}>
                        {getStatusText(period)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPeriodToDelete(period)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? "Editar Período Gratuito" : "Novo Período Gratuito"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Barbearia</Label>
              <select
                value={formData.barber_shop_id}
                onChange={(e) => setFormData({ ...formData, barber_shop_id: e.target.value })}
                className="w-full p-2 border rounded-md"
                disabled={!!editingPeriod}
              >
                <option value="">Selecione uma barbearia</option>
                {barberShops?.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Fim</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ex: Teste inicial, Promoção especial..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.barber_shop_id || !formData.start_date || !formData.end_date}
              >
                {editingPeriod ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!periodToDelete} onOpenChange={() => setPeriodToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Período Gratuito</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este período gratuito?
              <br />
              <strong>{periodToDelete?.barber_shop_name}</strong>
              <br />
              {periodToDelete && (
                <>
                  {format(new Date(periodToDelete.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(periodToDelete.end_date), "dd/MM/yyyy", { locale: ptBR })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => periodToDelete && deleteFreeTrial.mutate(periodToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 