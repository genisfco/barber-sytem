import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

interface BarbeiroFormData {
  nome: string;
  email: string;
  telefone: string;
  especialidade: string;
  comissao: string;
}

const Barbeiros = () => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<BarbeiroFormData>();

  const onSubmit = (data: BarbeiroFormData) => {
    console.log(data);
    toast({
      title: "Barbeiro cadastrado com sucesso!",
      description: `${data.nome} foi adicionado à sua equipe.`,
    });
    setOpen(false);
    reset();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display text-barber-dark">Barbeiros</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Barbeiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome do barbeiro"
                  {...register("nome")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o e-mail do barbeiro"
                  {...register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="Digite o telefone do barbeiro"
                  {...register("telefone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  placeholder="Digite a especialidade do barbeiro"
                  {...register("especialidade")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comissao">Comissão (%)</Label>
                <Input
                  id="comissao"
                  type="number"
                  placeholder="Digite a porcentagem de comissão"
                  {...register("comissao")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar barbeiro..."
              className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          <div className="mt-6 text-muted-foreground">
            Nenhum barbeiro cadastrado.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Barbeiros;