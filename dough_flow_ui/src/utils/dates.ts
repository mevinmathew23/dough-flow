import { format } from 'date-fns'

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

export function formatDate(dateStr: string, pattern: string = 'MMM d, yyyy'): string {
  return format(parseDateString(dateStr), pattern)
}

export function formatMonth(dateStr: string): string {
  return format(parseDateString(dateStr), 'MMM yyyy')
}
