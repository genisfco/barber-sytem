import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Servico {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const useServicos = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: servicos, isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Servico[];
    },
  });

  const createServico = useMutation({
    mutationFn: async (servico: Omit<Servico, "id">) => {
      const { data, error } = await supabase
        .from("services")
        .insert([servico])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast({
        title: "Serviço cadastrado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar serviço",
        description: error.message,
      });
    },
  });

  const updateServico = useMutation({
    mutationFn: async (servico: Servico) => {
      const { data, error } = await supabase
        .from("services")
        .update(servico)
        .eq("id", servico.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast({
        title: "Serviço atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar serviço",
        description: error.message,
      });
    },
  });

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast({
        title: "Serviço excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir serviço",
        description: error.message,
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
}; 