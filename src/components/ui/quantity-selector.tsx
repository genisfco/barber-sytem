import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  className = ""
}: QuantitySelectorProps) {
  const handleIncrement = () => {
    if (disabled) return;
    if (max && value >= max) return;
    onChange(value + 1);
  };

  const handleDecrement = () => {
    if (disabled) return;
    if (value <= min) return;
    onChange(value - 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = parseInt(e.target.value) || min;
    
    if (newValue < min) {
      onChange(min);
    } else if (max && newValue > max) {
      onChange(max);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className={`flex items-center gap-1 sm:gap-2 ${className}`} style={{ minHeight: '44px' }}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-12 w-12 p-0 flex-shrink-0 sm:h-10 sm:w-10 touch-manipulation"
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
      
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled}
        className="w-20 h-12 text-center flex-shrink-0 sm:w-16 sm:h-10 text-lg sm:text-base touch-manipulation"
        aria-label="Quantidade"
        inputMode="numeric"
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleIncrement}
        disabled={disabled || (max ? value >= max : false)}
        className="h-12 w-12 p-0 flex-shrink-0 sm:h-10 sm:w-10 touch-manipulation"
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
} 