import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'

export type IdealizedSettlementMethod = 'burland-burbidge' | 'elasticity'

type SettlementLayerResult = {
  layerId: string; order: number; soilName: string; soilCode: string
  topDepth: number; bottomDepth: number; thickness: number; midDepth: number
  sigmaV0: number; porePressure: number; sigmaV0Effective: number; deltaSigma: number
  sigmaVFinal: number; sigmaVFinalEffective: number; representativeN60?: number
  Es?: number; poissonRatio?: number; immediateSettlement: number; consolidationSettlement: number
  totalSettlement: number; method: string; status: 'HESAPLANDI' | 'VERİ EKSİK'; note?: string
}

export interface IdealizedSettlementInput { profile: IdealizedSoilProfile; method: IdealizedSettlementMethod; B: number; L: number; Df: number; qGross: number; groundwaterDepth?: number }
export interface IdealizedSettlementResult {
  method: IdealizedSettlementMethod; layers: SettlementLayerResult[]; totalImmediate: number; totalConsolidation: number; totalSettlement: number
  influenceDepth: number; netFoundationPressure: number; foundationEffectiveStress: number; ready: boolean; warnings: string[]; source: string
}

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

function isCohesive(layer: IdealizedSoilLayer): boolean {
  const code = `${layer.soilCode} ${layer.soilName}`.toUpperCase().replace(/İ/g, 'I')
  return /(^|[^A-Z])(CI[LHM]|SI[LHM]|CL|CH|ML|MH)([^A-Z]|$)/.test(code) || code.includes('KIL') || code.includes('SILT') || code.includes('CLAY') || code.includes('ORGANIK') || code.includes('TURBA')
}

function effectiveStressAtDepth(layers: IdealizedSoilLayer[], depth: number, groundwaterDepth: number) {
  let total = 0
  const sorted = [...layers].sort((a, b) => a.topDepth - b.topDepth)
  for (const layer of sorted) {
    const top = Math.max(0, layer.topDepth)
    const bottom = Math.min(depth, layer.bottomDepth)
    if (bottom <= top) continue
    const above = groundwaterDepth >= 0 ? Math.max(0, Math.min(bottom, groundwaterDepth) - top) : bottom - top
    const below = (bottom - top) - above
    if (above > 0 && finite(layer.gamma)) total += above * layer.gamma
    if (below > 0 && finite(layer.gammaSat ?? layer.gamma)) total += below * (layer.gammaSat ?? layer.gamma)!
  }
  const u = groundwaterDepth >= 0 && depth > groundwaterDepth ? 9.81 * (depth - groundwaterDepth) : 0
  return { total, porePressure: u, effective: Math.max(0, total - u) }
}

function stressIncrement(qNet: number, B: number, L: number, z: number): number { return qNet * B * L / Math.max((B + z) * (L + z), 1e-9) }

function burlandSettlement(layer: IdealizedSoilLayer, qNet: number, B: number, L: number, zTop: number, zBottom: number, influenceDepth: number, midDepth: number, groundwaterDepth: number) {
  const rawN = layer.representativeN60 ?? layer.representativeSptN
  if (!finite(rawN) || rawN <= 0) return { value: 0, note: 'Temsilci N60/SPT değeri yok.' }
  let n60 = rawN
  const code = `${layer.soilCode} ${layer.soilName}`.toUpperCase().replace(/İ/g, 'I')
  const fineSiltySand = code.includes('SISA') || code.includes('SILTY SAND') || code.includes('SM') || code.includes('CLSA')
  if (groundwaterDepth >= 0 && midDepth >= groundwaterDepth && fineSiltySand && n60 > 15) n60 = 15 + 0.5 * (n60 - 15)
  n60 = clamp(n60, 5, 60)
  const Ic = 1.71 / Math.pow(n60, 1.4)
  const ratio = L / Math.max(B, 1e-9)
  const fs = Math.pow((1.25 * ratio) / (ratio + 0.25), 2)
  const top = Math.max(0, zTop)
  const bottom = Math.min(zBottom, influenceDepth)
  if (bottom <= top) return { value: 0, note: 'Tabaka Burland etki derinliği dışında.' }
  const Ftop = (top / influenceDepth) * (2 - top / influenceDepth)
  const Fbottom = (bottom / influenceDepth) * (2 - bottom / influenceDepth)
  const fl = Math.max(0, Fbottom - Ftop)
  const value = Math.max(0, fs * fl * Ic * qNet * Math.pow(B, 0.7))
  return { value, note: `N60=${n60.toFixed(1)}, Ic=${Ic.toFixed(4)}, fs=${fs.toFixed(3)}, fl=${fl.toFixed(3)}` }
}

export function calculateIdealizedSettlement(input: IdealizedSettlementInput): IdealizedSettlementResult {
  const { profile, method, B, L, Df, qGross } = input
  const warnings: string[] = []
  const layers = [...profile.layers].sort((a, b) => a.topDepth - b.topDepth)
  const gwt = finite(input.groundwaterDepth) ? input.groundwaterDepth! : -1
  if (profile.status !== 'SABİTLENDİ') warnings.push('İdealize Zemin Profili henüz SABİTLENDİ değil. Sonuç mühendislik ön değerlendirmesidir.')
  if (B <= 0 || L <= 0 || qGross <= 0) return { method, layers: [], totalImmediate: 0, totalConsolidation: 0, totalSettlement: 0, influenceDepth: 0, netFoundationPressure: 0, foundationEffectiveStress: 0, ready: false, warnings: [...warnings, 'Temel genişliği, uzunluğu ve temel yükü pozitif olmalıdır.'], source: 'ZeminLab İdealize Zemin Profili oturma motoru' }

  const baseStress = effectiveStressAtDepth(layers, Df, gwt)
  const qNet = Math.max(0.1 * qGross, qGross - baseStress.effective)
  const influenceDepth = B <= 30 ? Math.pow(B, 0.76) : 0.5 * B
  let totalImmediate = 0
  let totalConsolidation = 0
  const results: SettlementLayerResult[] = []

  for (const layer of layers) {
    if (layer.bottomDepth <= Df) continue
    const top = Math.max(layer.topDepth, Df)
    const bottom = layer.bottomDepth
    if (bottom <= top) continue
    const thickness = bottom - top
    const zTop = top - Df
    const zBottom = bottom - Df
    const zMidBelowFoundation = (zTop + zBottom) / 2
    const midDepth = Df + zMidBelowFoundation
    const midStress = effectiveStressAtDepth(layers, midDepth, gwt)
    const deltaSigma = stressIncrement(qNet, B, L, zMidBelowFoundation)
    const finalEffective = midStress.effective + deltaSigma
    const cohesive = isCohesive(layer)
    let immediate = 0
    let methodName = ''
    let status: SettlementLayerResult['status'] = 'HESAPLANDI'
    let note = ''

    if (cohesive) {
      methodName = 'Kil: 1B konsolidasyon'
      if (!finite(layer.compressionIndexCc) || !finite(layer.initialVoidRatio) || midStress.effective <= 0) { status = 'VERİ EKSİK'; note = 'Konsolidasyon için Cc ve başlangıç boşluk oranı e₀ gerekir.' }
    } else if (method === 'burland-burbidge') {
      methodName = 'Burland & Burbidge (1985)'
      const r = burlandSettlement(layer, qNet, B, L, zTop, zBottom, influenceDepth, midDepth, gwt)
      immediate = r.value; note = r.note ?? ''
      if (r.note?.includes('yok')) status = 'VERİ EKSİK'
    } else {
      methodName = 'Elastisite teorisi'
      const E = layer.constrainedModulus ?? layer.oedometricModulus
      if (finite(E) && E > 0) {
        const nu = finite(layer.poissonRatio) ? clamp(layer.poissonRatio!, 0, 0.49) : 0.30
        immediate = Math.max(0, (deltaSigma / E) * thickness * (1 - nu * nu) * 1000)
        note = `E=${E.toFixed(1)} kPa, ν=${nu.toFixed(2)}`
      } else { status = 'VERİ EKSİK'; note = 'Elastik ani oturma için Eoed/E ve tercihen ν gerekir.' }
    }

    let consolidation = 0
    if (cohesive && finite(layer.compressionIndexCc) && finite(layer.initialVoidRatio) && midStress.effective > 0) {
      const Cc = layer.compressionIndexCc!
      const e0 = layer.initialVoidRatio!
      consolidation = Math.max(0, (Cc / (1 + e0)) * thickness * Math.log10(Math.max(finalEffective / midStress.effective, 1))) * 1000
    } else if (cohesive) status = 'VERİ EKSİK'

    totalImmediate += immediate
    totalConsolidation += consolidation
    results.push({ layerId: layer.id, order: layer.order, soilName: layer.soilName, soilCode: layer.soilCode, topDepth: top, bottomDepth: bottom, thickness, midDepth, sigmaV0: midStress.total, porePressure: midStress.porePressure, sigmaV0Effective: midStress.effective, deltaSigma, sigmaVFinal: midStress.total + deltaSigma, sigmaVFinalEffective: finalEffective, representativeN60: layer.representativeN60 ?? layer.representativeSptN, Es: layer.constrainedModulus ?? layer.oedometricModulus, poissonRatio: layer.poissonRatio, immediateSettlement: immediate, consolidationSettlement: consolidation, totalSettlement: immediate + consolidation, method: methodName, status, note })
  }

  if (results.some(x => x.status === 'VERİ EKSİK')) warnings.push('Bir veya daha fazla tabakada gerekli oturma parametresi eksik. Eksik değerler varsayılmadı.')
  return { method, layers: results, totalImmediate, totalConsolidation, totalSettlement: totalImmediate + totalConsolidation, influenceDepth, netFoundationPressure: qNet, foundationEffectiveStress: baseStress.effective, ready: results.length > 0 && !results.some(x => x.status === 'VERİ EKSİK'), warnings, source: 'Eski Zemin Etüdü/Jet Grout yazılımındaki Burland & Burbidge + tabaka bazlı gerilme yaklaşımı temel alınarak yeniden düzenlendi; killerde Terzaghi 1B konsolidasyon hesabı kullanılır.' }
}
