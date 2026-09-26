import type { UnitSystem } from '../models/project'
import { stressToBase, unitWeightToBase } from '../units/project-units'
import type { BoreholeRecord, LaboratoryRecord, LithologyLayer, SptRecord } from '../models/field-data'
import { deriveSptValues } from '../engineering/field-calculations'
import type { IdealizedParameterSource, IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'

export interface IdealizedProfileInput {
  boreholes: BoreholeRecord[]
  laboratories: LaboratoryRecord[]
  targetLayerCount: number
  unitSystem: UnitSystem
  previous?: IdealizedSoilProfile
}

type DepthPoint = { depth: number; kind: 'lithology' | 'spt' | 'lab' }

const median = (values: number[]): number | undefined => {
  if (!values.length) return undefined
  const a = [...values].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

const mode = (values: string[]): string | undefined => {
  if (!values.length) return undefined
  const counts = new Map<string, number>()
  values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

const overlap = (from: number, to: number, top: number, bottom: number) => from < bottom && to > top

function intervalLithology(boreholes: BoreholeRecord[], top: number, bottom: number): LithologyLayer[] {
  return boreholes.flatMap(b => b.lithology.filter(x => overlap(x.from, x.to, top, bottom)))
}

function intervalSpt(boreholes: BoreholeRecord[], top: number, bottom: number): Array<SptRecord & { boreholeId: string }> {
  return boreholes.flatMap(b => b.spt.filter(x => x.depth >= top && x.depth < bottom).map(x => ({ ...x, boreholeId: b.id })))
}

function buildSources(lithology: LithologyLayer[], spt: Array<SptRecord & { boreholeId: string }>, labs: LaboratoryRecord[]): Record<string, IdealizedParameterSource> {
  const sources: Record<string, IdealizedParameterSource> = {}
  if (lithology.some(x => x.unitWeight != null)) sources.gamma = { type: 'LİTOLOJİ' }
  if (lithology.some(x => x.saturatedUnitWeight != null)) sources.gammaSat = { type: 'LİTOLOJİ' }
  if (labs.some(x => x.unitWeight != null)) sources.gamma = { type: 'LABORATUVAR', sampleIds: labs.filter(x => x.unitWeight != null).map(x => x.id) }
  if (labs.some(x => x.waterContent != null)) sources.waterContent = { type: 'LABORATUVAR', sampleIds: labs.filter(x => x.waterContent != null).map(x => x.id) }
  if (labs.some(x => x.liquidLimit != null)) sources.liquidLimit = { type: 'LABORATUVAR', sampleIds: labs.filter(x => x.liquidLimit != null).map(x => x.id) }
  if (labs.some(x => x.plasticLimit != null)) sources.plasticLimit = { type: 'LABORATUVAR', sampleIds: labs.filter(x => x.plasticLimit != null).map(x => x.id) }
  if (labs.some(x => x.plasticityIndex != null)) sources.plasticityIndex = { type: 'LABORATUVAR', sampleIds: labs.filter(x => x.plasticityIndex != null).map(x => x.id) }
  if (labs.some(x => x.finesContent != null)) sources.finesContent = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.c != null || x.directShearC != null || x.uuC != null)) sources.cohesion = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.phi != null || x.directShearPhi != null || x.uuPhi != null)) sources.frictionAngle = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.consolidationCc != null)) sources.compressionIndexCc = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.consolidationCs != null)) sources.recompressionIndexCr = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.voidRatio != null)) sources.initialVoidRatio = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (labs.some(x => x.elasticModulus != null)) {
    sources.oedometricModulus = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
    sources.constrainedModulus = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  }
  if (labs.some(x => x.poissonRatio != null)) sources.poissonRatio = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (spt.length) sources.representativeSptN = { type: 'SPT_KORELASYONU', boreholeIds: spt.map(x => x.boreholeId), note: 'SPT sayımı saha kaydından alınır; otomatik olarak dayanım veya sıkışabilirlik parametresine dönüştürülmez.' }
  return sources
}

function collectCandidateCuts(boreholes: BoreholeRecord[], laboratories: LaboratoryRecord[], maxDepth: number): number[] {
  const points: DepthPoint[] = []
  boreholes.forEach(b => b.lithology.forEach(x => {
    if (x.from > 0 && x.from < maxDepth) points.push({ depth: x.from, kind: 'lithology' })
    if (x.to > 0 && x.to < maxDepth) points.push({ depth: x.to, kind: 'lithology' })
  }))
  boreholes.forEach(b => b.spt.forEach(x => { if (x.depth > 0 && x.depth < maxDepth) points.push({ depth: x.depth, kind: 'spt' }) }))
  laboratories.forEach(x => { if (x.depth > 0 && x.depth < maxDepth) points.push({ depth: x.depth, kind: 'lab' }) })
  const grouped = new Map<number, DepthPoint[]>()
  points.forEach(p => { const key = Math.round(p.depth * 100) / 100; grouped.set(key, [...(grouped.get(key) ?? []), p]) })
  return [...grouped.entries()].sort((a, b) => a[0] - b[0]).sort((a, b) => {
    const priority = (x: DepthPoint[]) => Math.max(...x.map(p => p.kind === 'lithology' ? 3 : p.kind === 'lab' ? 2 : 1))
    return priority(b[1]) - priority(a[1])
  }).map(([depth]) => depth)
}

function chooseCuts(candidates: number[], maxDepth: number, target: number): number[] {
  if (target <= 1) return [0, maxDepth]
  const usable = [...new Set(candidates.filter(x => x > 0 && x < maxDepth))].sort((a, b) => a - b)
  if (!usable.length) return Array.from({ length: target + 1 }, (_, i) => Math.round((maxDepth * i / target) * 100) / 100)
  if (usable.length <= target - 1) return [0, ...usable, maxDepth]
  const selected = new Set<number>()
  const spacing = maxDepth / target
  for (let i = 1; i < target; i += 1) {
    const targetDepth = spacing * i
    const candidate = usable.reduce((best, x) => Math.abs(x - targetDepth) < Math.abs(best - targetDepth) ? x : best, usable[0])
    selected.add(candidate)
  }
  return [0, ...selected].sort((a, b) => a - b).concat(maxDepth).filter((x, i, arr) => i === 0 || x !== arr[i - 1])
}

function makeLayer(boreholes: BoreholeRecord[], laboratories: LaboratoryRecord[], top: number, bottom: number, order: number, unitSystem: UnitSystem): IdealizedSoilLayer {
  const lithology = intervalLithology(boreholes, top, bottom)
  const spt = intervalSpt(boreholes, top, bottom)
  const labs = laboratories.filter(x => x.depth >= top && x.depth < bottom && boreholes.some(b => b.id === x.boreholeId && b.lithology.some(l => overlap(l.from,l.to,top,bottom))))
  const descriptions = lithology.map(x => x.description).filter(Boolean).concat(labs.map(x => x.soilDescription).filter(Boolean) as string[])
  const codes = lithology.map(x => x.code).filter(Boolean).concat(labs.map(x => x.soilCode).filter(Boolean) as string[])
  const nValues = spt.map(x => x.n2 != null && x.n3 != null ? x.n2 + x.n3 : undefined).filter((x): x is number => x != null)
  const correctedNValues = spt.map(x => {
    const borehole = boreholes.find(b => b.id === x.boreholeId)
    if (!borehole) return undefined
    const derived = deriveSptValues(borehole, x, laboratories)
    return derived.overburdenCorrectionApplied && Number.isFinite(derived.n1_60) && derived.n1_60 > 0 && Number.isFinite(derived.n60) && derived.n60 > 0
      ? { n60: derived.n60, n1_60: derived.n1_60 }
      : undefined
  }).filter((x): x is { n60:number; n1_60:number } => x != null && Number.isFinite(x.n60) && x.n60 > 0 && Number.isFinite(x.n1_60) && x.n1_60 > 0)
  const gamma = median(lithology.map(x => x.unitWeight).filter((x): x is number => x != null).concat(labs.map(x => x.unitWeight).filter((x): x is number => x != null)))
  const gammaSat = median(lithology.map(x => x.saturatedUnitWeight).filter((x): x is number => x != null))
  const firstDefined = (values: Array<number | undefined>) => values.find(x => x != null)
  const labMedian = (values: Array<number | undefined>) => median(values.filter((x): x is number => x != null))
  const cLab = labMedian(labs.map(x => x.directShearC ?? x.c ?? x.uuC))
  const phiLab = labMedian(labs.map(x => x.directShearPhi ?? x.phi ?? x.uuPhi))
  const sources = buildSources(lithology, spt, labs)

  if (gamma != null && sources.gamma?.type === 'LİTOLOJİ' && labs.some(x => x.unitWeight != null)) sources.gamma = { type: 'LABORATUVAR', sampleIds: labs.map(x => x.id) }
  if (correctedNValues.length) sources.representativeN60 = { type: 'SPT_KORELASYONU', boreholeIds: [...new Set(spt.map(x => x.boreholeId))], note: 'TBDY Ek 16B düzeltmeleri uygulanmış (N1)60; eksik gerilme/enerji girdilerinde değer üretilmez.' }

  return {
    id: crypto.randomUUID(), order, topDepth: top, bottomDepth: bottom,
    soilName: mode(descriptions) ?? 'Tanımlanmamış zemin', soilCode: mode(codes) ?? '',
    boreholeIds: [...new Set([...lithology.flatMap(() => boreholes.filter(b => b.lithology.some(x => overlap(x.from, x.to, top, bottom))).map(b => b.id)), ...spt.map(x => x.boreholeId), ...labs.map(x => x.boreholeId)])],
    sptRecordIds: spt.map(x => x.id), laboratoryRecordIds: labs.map(x => x.id),
    representativeSptN: median(nValues), representativeN60: median(correctedNValues.map(x => x.n60)), representativeN1_60: median(correctedNValues.map(x => x.n1_60)),
    gamma: gamma == null ? undefined : unitWeightToBase(gamma, unitSystem),
    gammaSat: gammaSat == null ? undefined : unitWeightToBase(gammaSat, unitSystem),
    waterContent: labMedian(labs.map(x => x.waterContent)), liquidLimit: labMedian(labs.map(x => x.liquidLimit)),
    plasticLimit: labMedian(labs.map(x => x.plasticLimit)), plasticityIndex: labMedian(labs.map(x => x.plasticityIndex)),
    finesContent: labMedian(labs.map(x => x.finesContent ?? x.sieve200Passing)),
    cohesion: (() => { const v = cLab ?? firstDefined(lithology.map(x => x.cohesion)); return v == null ? undefined : stressToBase(v, unitSystem) })(), frictionAngle: phiLab ?? firstDefined(lithology.map(x => x.frictionAngle)),
    compressionIndexCc: labMedian(labs.map(x => x.consolidationCc)), recompressionIndexCr: labMedian(labs.map(x => x.consolidationCs)),
    initialVoidRatio: labMedian(labs.map(x => x.voidRatio)),
    constrainedModulus: (() => { const v = labMedian(labs.map(x => x.elasticModulus)); return v == null ? undefined : stressToBase(v, unitSystem) })(), oedometricModulus: (() => { const v = labMedian(labs.map(x => x.elasticModulus)); return v == null ? undefined : stressToBase(v, unitSystem) })(),
    poissonRatio: labMedian(labs.map(x => x.poissonRatio)), parameterSources: sources, userOverride: false,
  }
}

export function generateIdealizedSoilProfile(input: IdealizedProfileInput): IdealizedSoilProfile {
  const { boreholes, laboratories, previous, unitSystem } = input
  const targetLayerCount = Math.max(1, Math.min(20, Math.round(input.targetLayerCount)))
  const maxDepth = Math.max(...boreholes.map(x => x.totalDepth), 1)
  const candidates = collectCandidateCuts(boreholes, laboratories, maxDepth)
  const cuts = chooseCuts(candidates, maxDepth, targetLayerCount)
  const layers = cuts.slice(0, -1).map((top, i) => makeLayer(boreholes, laboratories, top, cuts[i + 1], i + 1, unitSystem))
  return {
    id: previous?.id ?? crypto.randomUUID(), version: previous?.version ?? 1, status: 'TASLAK', targetLayerCount,
    generatedAt: new Date().toISOString(), unitSystem, sourceBoreholeIds: [...new Set(boreholes.map(x => x.id))],
    sourceLaboratoryIds: [...new Set(laboratories.map(x => x.id))], layers,
    methodology: 'TBDY 2018 ve yürürlükteki Türk mevzuatı esas alınır. Otomatik katmanlama; litoloji sınırları, SPT derinlikleri ve laboratuvar numune derinliklerini aday sınırlar olarak kullanır. SPT, dayanım veya sıkışabilirlik parametrelerine otomatik korelasyonla dönüştürülmez. Nihai mühendislik kararı kullanıcıya aittir.',
    notes: 'Otomatik profil bir mühendislik taslağıdır. Kullanıcı sınırları ve parametreleri değiştirdiğinde ilgili katman userOverride olarak işaretlenir.',
  }
}
