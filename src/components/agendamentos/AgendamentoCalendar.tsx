import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBarberShopUnavailability } from "@/hooks/useBarberShopUnavailability";
import { format } from "date-fns";
import { da, ptBR } from "date-fns/locale";
import { Store, Check } from "lucide-react";

interface AgendamentoCalendarProps {
  date: Date;
  onDateSelect: (date: Date | undefined) => void;
}

export function AgendamentoCalendar({ date, onDateSelect }: AgendamentoCalendarProps) {
  const [isBarbeariaIndisponivel, setIsBarbeariaIndisponivel] = useState(false);
  const { indisponibilizarBarbearia, disponibilizarBarbearia, verificarSeBarbeariaIndisponivel } = useBarberShopUnavailability();

  // Verificar se a barbearia está indisponível quando a data muda
  useEffect(() => {
    const verificarIndisponibilidade = async () => {
      const indisponivel = await verificarSeBarbeariaIndisponivel(date);
      setIsBarbeariaIndisponivel(indisponivel);
    };

    verificarIndisponibilidade();
  }, [date, verificarSeBarbeariaIndisponivel]);

  const handleIndisponibilizar = () => {
    indisponibilizarBarbearia.mutate({ data: date });
  };

  const handleDisponibilizar = () => {
    disponibilizarBarbearia.mutate({ data: date });
  };

  const dataFormatada = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });  

  return (
    <Card>
      <CardHeader>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            {dataFormatada}
          </h2>
        </div>        
      </CardHeader>

      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          className="ml-2 mr-2 mb-10 rounded-md border"
        />
        
        <div className="space-y-2">         
          
          {isBarbeariaIndisponivel ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <Store className="h-4 w-4" />
                <span className="font-medium">Barbearia fechada nesta data</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisponibilizar}
                disabled={disponibilizarBarbearia.isPending}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                {disponibilizarBarbearia.isPending ? "Disponibilizando..." : "Abrir Barbearia"}
              </Button>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Fechar Barbearia na Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fechar Agendamento </AlertDialogTitle>
                  <AlertDialogDescription>
                    Atenção: Utilize esta função apenas em casos especiais.<br></br><br></br>
                    
                    Tem certeza que deseja fechar a agenda para o dia {dataFormatada}? 
                    
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleIndisponibilizar}
                    disabled={indisponibilizarBarbearia.isPending}
                  >
                    {indisponibilizarBarbearia.isPending ? "Indisponibilizando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>      
    </Card>
  );
}
