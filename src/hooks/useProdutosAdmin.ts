import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { logError } from "@/utils/logger";
import { useBarberShopContext } from "@/contexts/BarberShopContext";

type Produto = Database['public']['Tables']['products']['Row'];

export function useProdutosAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBarberShop } = useBarberShopContext();

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos-admin', selectedBarberShop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barber_shop_id', selectedBarberShop?.id)
        .order('name');

      if (error) {
        logError(error, "Erro ao buscar produtos:");
        throw error;
      }

      return data as Produto[];
    },
    enabled: !!selectedBarberShop?.id
  });

  const createProduto = useMutation({
    mutationFn: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...produto,
          active: true,
          barber_shop_id: selectedBarberShop.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['produtos', selectedBarberShop?.id] });
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
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { data, error } = await supabase
        .from('products')
        .update(produto)
        .eq('id', produto.id)
        .eq('barber_shop_id', selectedBarberShop.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['produtos', selectedBarberShop?.id] });
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

  const toggleProdutoStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!selectedBarberShop) {
        throw new Error("Barbearia não selecionada");
      }

      const { error } = await supabase
        .from('products')
        .update({ active })
        .eq('id', id)
        .eq('barber_shop_id', selectedBarberShop.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produtos-admin', selectedBarberShop?.id] });
      queryClient.invalidateQueries({ queryKey: ['produtos', selectedBarberShop?.id] });
      toast({
        title: variables.active ? "Produto ativado com sucesso!" : "Produto desativado com sucesso!",
        description: variables.active 
          ? "O produto foi reativado no sistema." 
          : "O produto foi marcado como inativo no sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status do produto",
        description: error.message || "Ocorreu um erro ao tentar alterar o status do produto. Tente novamente.",
      });
    },
  });

  return {
    produtos,
    isLoading,
    createProduto,
    updateProduto,
    toggleProdutoStatus,
  };
} 