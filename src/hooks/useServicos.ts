import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Servico } from "@/types/servico";

interface SupabaseService {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServicos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: servicos, isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      console.log("Buscando serviços...");
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) {
        console.error("Erro ao buscar serviços:", error);
        throw error;
      }

      return data as SupabaseService[];
    },
  });

  const createServico = useMutation({
    mutationFn: async (servico: Omit<Servico, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("services")
        .insert({
          ...servico,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast({
        title: "Serviço cadastrado com sucesso!",
        description: "O serviço foi adicionado à sua lista.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar serviço",
        description: error.message || "Ocorreu um erro ao tentar cadastrar o serviço.",
      });
    },
  });

  const updateServico = useMutation({
    mutationFn: async (servico: Servico) => {
      const { data, error } = await supabase
        .from("services")
        .update({
          name: servico.name,
          price: servico.price,
          duration: servico.duration,
          active: servico.active,
        })
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
        description: "As informações do serviço foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar serviço",
        description: error.message || "Ocorreu um erro ao tentar atualizar o serviço.",
      });
    },
  });

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast({
        title: "Serviço inativado com sucesso!",
        description: "O serviço foi removido da sua lista ativa.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao inativar serviço",
        description: error.message || "Ocorreu um erro ao tentar inativar o serviço.",
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