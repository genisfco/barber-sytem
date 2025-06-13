import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HourPickerProps {
  value: string; // Expected format "HH:00"
  onChange: (value: string) => void; // Will return "HH:00"
  disabled?: boolean;
}

export const HourPicker: React.FC<HourPickerProps> = ({ value, onChange, disabled }) => {
  const currentHour = value ? value.split(":")[0] : "00";

  const handleValueChange = (newHour: string) => {
    onChange(`${newHour}:00`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Select onValueChange={handleValueChange} value={currentHour} disabled={disabled}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Hora" />
      </SelectTrigger>
      <SelectContent>
        {hours.map((hour) => (
          <SelectItem key={hour} value={hour}>
            {hour}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}; 