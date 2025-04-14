import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { Produto } from "@/types/produto";



export function useProdutos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) {
        throw error;
      }

      return data as Produto[];
    },
  });

  const createProduto = useMutation({
    mutationFn: async (produto: Omit<Produto, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("products")
        .insert([produto])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar produto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateProduto = useMutation({
    mutationFn: async (produto: Produto) => {
      const { data, error } = await supabase
        .from("products")
        .update(produto)
        .eq("id", produto.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto. Tente novamente.",
        variant: "destructive",
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