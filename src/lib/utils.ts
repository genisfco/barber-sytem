import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD) considerando o fuso horário local
 */
export function getHojeISO() {
  const hoje = new Date();
  const offset = hoje.getTimezoneOffset();
  const hojeLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
  return hojeLocal.toISOString().split('T')[0];
}
