import { startOfWeek, addDays, format, parseISO, getDay, setHours, setMinutes, addMinutes, roundToNearestMinutes } from 'date-fns'

const WEEK_START_DAY = 1 // Monday

/**
 * Get the Monday of the week for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_START_DAY })
}

/**
 * Get the date range for a week (Monday to Sunday)
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = getWeekStart(date)
  const end = addDays(start, 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Get all 7 days of the week (Monday to Sunday)
 */
export function getWeekDays(date: Date = new Date()): Date[] {
  const start = getWeekStart(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Round a date to the nearest interval (e.g., 15 minutes)
 */
export function roundToInterval(date: Date, minutes: number = 15): Date {
  return roundToNearestMinutes(date, { nearestTo: minutes })
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

/**
 * Format date range as "Jan 20 – Jan 26"
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = format(start, 'MMM d')
  const endStr = format(end, 'MMM d')
  return `${startStr} – ${endStr}`
}

/**
 * Calculate pixel position for a time in the grid
 * @param time The time to position
 * @param startHour Start hour of the grid (e.g., 6)
 * @param endHour End hour of the grid (e.g., 22)
 * @param hourHeight Height of one hour in pixels
 */
export function getTimePosition(
  time: Date | string,
  startHour: number,
  endHour: number,
  hourHeight: number
): number {
  const date = typeof time === 'string' ? parseISO(time) : time
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const totalMinutes = (hours - startHour) * 60 + minutes
  return (totalMinutes / 60) * hourHeight
}

/**
 * Calculate block height in pixels based on duration
 * @param start Start time
 * @param end End time
 * @param hourHeight Height of one hour in pixels
 */
export function getBlockHeight(
  start: Date | string,
  end: Date | string,
  hourHeight: number
): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start
  const endDate = typeof end === 'string' ? parseISO(end) : end
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours * hourHeight
}

/**
 * Get day of week index (0 = Monday, 6 = Sunday)
 */
export function getDayIndex(date: Date): number {
  const day = getDay(date)
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  return day === 0 ? 6 : day - 1
}

/**
 * Create a date at a specific time on a specific day
 */
export function createDateTime(day: Date, hours: number, minutes: number = 0): Date {
  const date = new Date(day)
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Parse ISO string and return Date in local timezone
 */
export function parseLocalDate(isoString: string): Date {
  return parseISO(isoString)
}

/**
 * Convert Date to ISO string for API
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}
