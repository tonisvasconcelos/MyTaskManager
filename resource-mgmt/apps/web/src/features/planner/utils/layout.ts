import type { WorkBlock } from '../../../shared/types/api'
import { parseISO } from 'date-fns'

export interface BlockLane {
  block: WorkBlock
  lane: number
  totalLanes: number
}

/**
 * Compute lanes for overlapping blocks to display them side-by-side
 * Algorithm: Sort by start time, assign to first available lane
 */
export function computeLanes(blocks: WorkBlock[]): BlockLane[] {
  if (blocks.length === 0) return []

  // Sort blocks by start time
  const sorted = [...blocks].sort((a, b) => {
    const startA = parseISO(a.startAt).getTime()
    const startB = parseISO(b.startAt).getTime()
    return startA - startB
  })

  const lanes: BlockLane[] = []
  const laneEnds: number[] = [] // Track when each lane's current block ends

  for (const block of sorted) {
    const blockStart = parseISO(block.startAt).getTime()
    const blockEnd = parseISO(block.endAt).getTime()

    // Find first available lane (where lane's current block has ended)
    let assignedLane = -1
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= blockStart) {
        assignedLane = i
        break
      }
    }

    // If no lane available, create a new one
    if (assignedLane === -1) {
      assignedLane = laneEnds.length
      laneEnds.push(blockEnd)
    } else {
      laneEnds[assignedLane] = blockEnd
    }

    lanes.push({
      block,
      lane: assignedLane,
      totalLanes: laneEnds.length,
    })
  }

  return lanes
}

/**
 * Group blocks by day
 */
export function groupBlocksByDay(blocks: WorkBlock[]): Map<string, WorkBlock[]> {
  const grouped = new Map<string, WorkBlock[]>()

  for (const block of blocks) {
    const date = parseISO(block.startAt)
    const dayKey = date.toISOString().split('T')[0] // YYYY-MM-DD

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(block)
  }

  return grouped
}
