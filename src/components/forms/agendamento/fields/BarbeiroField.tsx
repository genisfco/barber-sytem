
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBarbeiros } from "@/hooks/useBarbeiros";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";

interface BarbeiroFieldProps {
  form: UseFormReturn<FormValues>;
}

export function BarbeiroField({ form }: BarbeiroFieldProps) {
  const { barbeiros } = useBarbeiros();

  return (
    <FormField
      control={form.control}
      name="barbeiroId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Barbeiro</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="truncate">
                <SelectValue placeholder="Selecione o barbeiro" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-[200px]">
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
  );
}
