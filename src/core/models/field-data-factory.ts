import type { BoreholeRecord, SptRecord } from './field-data'
import { DEFAULT_BOREHOLE_LOG_SETTINGS } from './field-data'

/** Creates a genuinely empty borehole. The first SPT depth remains the project rule at 1.50 m. */
export function createEmptyBorehole(index: number): BoreholeRecord {
  return {
    id: crypto.randomUUID(),
    name: `SK-${String(index).padStart(2, '0')}`,
    firstSptDepth: 1.5,
    totalDepth: 0,
    lithology: [],
    spt: [],
    logObservations: [],
    logSettings: { ...DEFAULT_BOREHOLE_LOG_SETTINGS }
  }
}

/** Creates a field SPT row without inventing measured N values. */
export function createEmptySpt(depth: number): SptRecord {
  return {
    id: crypto.randomUUID(),
    depth,
    depthTo: depth + 0.45,
    testType: 'SPT',
    laboratoryLinked: true,
    correction: { applyOverburdenCorrection: true, applyDilatancyCorrection: false },
    source: 'manual',
    confirmed: false
  }
}

export function nextSptDepth(borehole: BoreholeRecord): number {
  const rows = borehole.spt
    .filter(row => row.testType === 'SPT' && Number.isFinite(row.depth))
    .sort((a, b) => a.depth - b.depth)

  return rows.length ? rows[rows.length - 1].depth + 1.5 : borehole.firstSptDepth
}

/** Adds an SPT and grows the explicitly empty borehole only as far as the new test requires. */
export function appendSpt(borehole: BoreholeRecord): BoreholeRecord | null {
  const depth = nextSptDepth(borehole)
  const depthTo = depth + 0.45
  const row = createEmptySpt(depth)

  if (depth < 0 || !Number.isFinite(depth)) return null

  return {
    ...borehole,
    totalDepth: Math.max(borehole.totalDepth, depthTo),
    spt: [...borehole.spt, row].sort((a, b) => a.depth - b.depth)
  }
}
