import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Produto = Database['public']['Tables']['products']['Row'];

export function useProdutos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        throw error;
      }

      return data as Produto[];
    }
  });

  const createProduto = useMutation({
    mutationFn: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(produto)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast({
        title: "Produto criado com sucesso!",
        description: "O produto foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar produto",
        description: error.message || "Ocorreu um erro ao tentar criar o produto. Tente novamente.",
      });
    },
  });

  const updateProduto = useMutation({
    mutationFn: async (produto: Partial<Produto> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(produto)
        .eq('id', produto.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast({
        title: "Produto atualizado com sucesso!",
        description: "As informações do produto foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar produto",
        description: error.message || "Ocorreu um erro ao tentar atualizar o produto. Tente novamente.",
      });
    },
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast({
        title: "Produto excluído com sucesso!",
        description: "O produto foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: error.message || "Ocorreu um erro ao tentar excluir o produto. Tente novamente.",
      });
    },
  });

  return {
    produtos,
    isLoading,
    createProduto,
    updateProduto,
    deleteProduto,
  };
} 