
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

interface AgendamentoCalendarProps {
  date: Date;
  onDateSelect: (date: Date | undefined) => void;
}

export function AgendamentoCalendar({ date, onDateSelect }: AgendamentoCalendarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
}
