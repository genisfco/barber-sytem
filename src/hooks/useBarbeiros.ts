
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Barbeiro {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string | null;
  commission_rate: number;
  created_at?: string;
  updated_at?: string;
}

export function useBarbeiros() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: barbeiros, isLoading } = useQuery({
    queryKey: ["barbeiros"],
    queryFn: async () => {
      console.log("Buscando barbeiros...");
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .order("name");

      if (error) {
        console.error("Erro ao buscar barbeiros:", error);
        throw error;
      }

      return data as Barbeiro[];
    },
  });

  const createBarbeiro = useMutation({
    mutationFn: async (barbeiro: Omit<Barbeiro, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("barbers")
        .insert(barbeiro)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbeiros"] });
      toast({
        title: "Barbeiro cadastrado com sucesso!",
        description: "O barbeiro foi adicionado à sua equipe.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar cadastrar o barbeiro.",
      });
    },
  });

  const updateBarbeiro = useMutation({
    mutationFn: async (barbeiro: Barbeiro) => {
      const { data, error } = await supabase
        .from("barbers")
        .update({
          name: barbeiro.name,
          email: barbeiro.email,
          phone: barbeiro.phone,
          specialty: barbeiro.specialty,
          commission_rate: barbeiro.commission_rate,
        })
        .eq("id", barbeiro.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbeiros"] });
      toast({
        title: "Barbeiro atualizado com sucesso!",
        description: "As informações do barbeiro foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar barbeiro",
        description: error.message || "Ocorreu um erro ao tentar atualizar o barbeiro.",
      });
    },
  });

  const deleteBarbeiro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("barbers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbeiros"] });
      toast({
        title: "Barbeiro excluído com sucesso!",
        description: "O barbeiro foi removido da sua equipe.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir barbeiro",
        description: error.message || "Ocorreu um erro ao tentar excluir o barbeiro.",
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
