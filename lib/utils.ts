import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export date utilities for backward compatibility
export { 
  formatDateTime, 
  formatDate, 
  formatTime, 
  formatDateTimeLocal,
  formatDateTimeStable,
  formatRelativeTime,
  isOverdue,
  parseDate
} from "./utils/date";

