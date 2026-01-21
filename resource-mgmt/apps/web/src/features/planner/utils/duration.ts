import { parseISO } from 'date-fns'

export function getDurationMinutes(startAt: string, endAt: string): number {
  const start = parseISO(startAt)
  const end = parseISO(endAt)
  const diff = Math.round((end.getTime() - start.getTime()) / 60000)
  return Math.max(0, diff)
}

export function formatDurationHours(minutes: number, fractionDigits: number = 1): string {
  const hours = minutes / 60
  return hours.toFixed(fractionDigits)
}

