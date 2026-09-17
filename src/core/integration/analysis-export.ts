export interface AnalysisNode { id: string; x: number; y: number; z: number }
export interface AnalysisElement { id: string; nodeI: string; nodeJ: string; section?: string }
export interface AnalysisLoad { nodeId: string; fx?: number; fy?: number; fz?: number; mx?: number; my?: number; mz?: number }
export interface AnalysisModel { units: string; nodes: AnalysisNode[]; elements: AnalysisElement[]; loads: AnalysisLoad[] }

/** Neutral interchange model. The desktop app does not silently claim to have driven CSI/OpenSees until a version-specific adapter is configured. */
export function toSap2000Interchange(model: AnalysisModel) { return { format: 'ZeminLab-SAP2000-Interchange', version: 1, units: model.units, nodes: model.nodes, elements: model.elements, loads: model.loads } }
export function toOpenSeesTcl(model: AnalysisModel): string {
  const lines = [`# ZeminLab OpenSees export`, `# units: ${model.units}`]
  for (const n of model.nodes) lines.push(`node ${n.id} ${n.x} ${n.y} ${n.z}`)
  for (const e of model.elements) lines.push(`# element ${e.id} ${e.nodeI} ${e.nodeJ}${e.section ? ` section=${e.section}` : ''}`)
  for (const l of model.loads) lines.push(`# load ${l.nodeId} ${l.fx ?? 0} ${l.fy ?? 0} ${l.fz ?? 0} ${l.mx ?? 0} ${l.my ?? 0} ${l.mz ?? 0}`)
  return lines.join('\n')
}
