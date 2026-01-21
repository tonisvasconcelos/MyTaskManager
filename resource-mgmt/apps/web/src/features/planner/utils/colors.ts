const PROJECT_PALETTE = [
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#22c55e', // green-500
  '#e11d48', // rose-600
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getProjectColor(projectId: string | null | undefined): string {
  if (!projectId) return '#6b7280' // gray-500
  const idx = hashString(projectId) % PROJECT_PALETTE.length
  return PROJECT_PALETTE[idx]
}

