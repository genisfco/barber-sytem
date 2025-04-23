import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Barbeiro = Database['public']['Tables']['barbers']['Row'];

export function useBarbeiros() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: barbeiros, isLoading } = useQuery({
    queryKey: ['barbeiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error("Erro ao buscar barbeiros:", error);
        throw error;
      }

      return data as Barbeiro[];
    }
  });

  const createBarbeiro = useMutation({
    mutationFn: async (barbeiro: Omit<Barbeiro, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('barbers')
        .insert({
          ...barbeiro,
          commission_rate: barbeiro.commission_rate || 30
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbeiros'] });
      toast({
        title: "Barbeiro criado com sucesso!",
        description: "O barbeiro foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar criar o barbeiro. Tente novamente.",
      });
    },
  });

  const updateBarbeiro = useMutation({
    mutationFn: async (barbeiro: Partial<Barbeiro> & { id: string }) => {
      const { data, error } = await supabase
        .from('barbers')
        .update({
          ...barbeiro,
          commission_rate: barbeiro.commission_rate || 30
        })
        .eq('id', barbeiro.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbeiros'] });
      toast({
        title: "Barbeiro atualizado com sucesso!",
        description: "As informações do barbeiro foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar atualizar o barbeiro. Tente novamente.",
      });
    },
  });

  const deleteBarbeiro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('barbers')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbeiros'] });
      toast({
        title: "Barbeiro desativado com sucesso!",
        description: "O barbeiro foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao desativar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar desativar o barbeiro. Tente novamente.",
      });
    },
  });

  return {
    barbeiros,
    isLoading,
    createBarbeiro,
    updateBarbeiro,
    deleteBarbeiro,
  };
}
