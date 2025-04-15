import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Servico = Database['public']['Tables']['services']['Row'];

export function useServicos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) {
        console.error("Erro ao buscar serviços:", error);
        throw error;
      }

      return data as Servico[];
    }
  });

  const createServico = useMutation({
    mutationFn: async (servico: Omit<Servico, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('services')
        .insert(servico)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({
        title: "Serviço criado com sucesso!",
        description: "O serviço foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar serviço",
        description: error.message || "Ocorreu um erro ao tentar criar o serviço. Tente novamente.",
      });
    },
  });

  const updateServico = useMutation({
    mutationFn: async (servico: Partial<Servico> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(servico)
        .eq('id', servico.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({
        title: "Serviço atualizado com sucesso!",
        description: "As informações do serviço foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar serviço",
        description: error.message || "Ocorreu um erro ao tentar atualizar o serviço. Tente novamente.",
      });
    },
  });

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({
        title: "Serviço excluído com sucesso!",
        description: "O serviço foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir serviço",
        description: error.message || "Ocorreu um erro ao tentar excluir o serviço. Tente novamente.",
      });
    },
  });

  return {
    servicos,
    isLoading,
    createServico,
    updateServico,
    deleteServico,
  };
} 