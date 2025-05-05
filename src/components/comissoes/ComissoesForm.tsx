import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useBarbeiros } from "@/hooks/useBarbeiros";

const formSchema = z.object({
  barbeiroId: z.string({ required_error: "Selecione um barbeiro" }),
  tipoBusca: z.enum(["dataEspecifica", "periodo"], {
    required_error: "Selecione o tipo de busca"
  }).default("dataEspecifica"),
  dataEspecifica: z.date().optional(),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  status: z.enum(["pendente", "pago", "cancelado", "todos"], {
    required_error: "Selecione o status"
  }).default("todos"),
}).refine((data) => {
  if (data.tipoBusca === "dataEspecifica") {
    return !!data.dataEspecifica;
  } else {
    return !!data.dataInicio && !!data.dataFim;
  }
}, {
  message: "Preencha as datas corretamente",
  path: ["dataEspecifica", "dataInicio", "dataFim"]
});

export type ComissoesFormValues = z.infer<typeof formSchema>;

interface ComissoesFormProps {
  onSubmit: (data: ComissoesFormValues) => void;
}

export function ComissoesForm({ onSubmit }: ComissoesFormProps) {
  const { barbeiros } = useBarbeiros();
  
  const form = useForm<ComissoesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoBusca: "dataEspecifica",
      dataEspecifica: new Date(),
      dataInicio: new Date(),
      dataFim: new Date(),
      status: "todos",
    },
  });

  const tipoBusca = form.watch("tipoBusca");

  const handleSubmit = (data: ComissoesFormValues) => {
    let dataSubmit = { ...data };

    if (data.tipoBusca === "dataEspecifica" && data.dataEspecifica) {
      // Define o início do dia (00:00:00)
      const inicioData = new Date(data.dataEspecifica);
      inicioData.setHours(0, 0, 0, 0);

      // Define o fim do dia (23:59:59)
      const fimData = new Date(data.dataEspecifica);
      fimData.setHours(23, 59, 59, 999);

      dataSubmit = {
        ...dataSubmit,
        dataInicio: inicioData,
        dataFim: fimData,
      };
    } else if (data.tipoBusca === "periodo" && data.dataInicio && data.dataFim) {
      // Define o início do primeiro dia (00:00:00)
      const inicioData = new Date(data.dataInicio);
      inicioData.setHours(0, 0, 0, 0);

      // Define o fim do último dia (23:59:59)
      const fimData = new Date(data.dataFim);
      fimData.setHours(23, 59, 59, 999);

      dataSubmit = {
        ...dataSubmit,
        dataInicio: inicioData,
        dataFim: fimData,
      };
    }

    onSubmit(dataSubmit);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="barbeiroId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barbeiro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o barbeiro" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {barbeiros?.map((barbeiro) => (
                      <SelectItem key={barbeiro.id} value={barbeiro.id}>
                        {barbeiro.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tipoBusca"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Busca</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de busca" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="dataEspecifica">Data Específica</SelectItem>
                  <SelectItem value="periodo">Período</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipoBusca === "dataEspecifica" ? (
          <FormField
            control={form.control}
            name="dataEspecifica"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={ptBR}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dataInicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Inicial</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataFim"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Final</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit">Buscar</Button>
        </div>
      </form>
    </Form>
  );
}
