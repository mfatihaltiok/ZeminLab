import { EROL_SOURCE_KEYS } from '../provenance/erol-sources'
import { bearingCapacity as authoritativeBearing } from './calculation-engine'
import { calculateSurfaceFoundation } from './surface-foundation'

export type Stage2BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'
export type Stage2BearingDesign = 'classical-allowable' | 'tbdy-2018'
export type Stage2SettlementMethod = 'elastic' | '2:1' | 'janbu' | 'schmertmann' | 'consolidation'

export interface Stage2Step { symbol: string; title: string; formula: string; value?: number; unit?: string; source?: string; note?: string }
export interface Stage2Result<T> { value: T; steps: Stage2Step[]; method: string; source: string; warnings: string[] }

const rad = (deg: number) => deg * Math.PI / 180
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const positive = (v: number | undefined, fallback = 0) => Number.isFinite(v) ? Math.max(v as number, 0) : fallback

export interface BearingLayer { thickness: number; c: number; phi: number; gamma: number }
export interface Stage2BearingInput {
  B: number; L: number; Df: number; gamma: number; c: number; phi: number
  FS?: number
  method: Stage2BearingMethod
  design?: Stage2BearingDesign
  waterTableDepth?: number
  surcharge?: number
  loadV?: number
  loadH?: number
  momentX?: number
  momentY?: number
  soilSlope?: number
  baseSlope?: number
  layers?: BearingLayer[]
}

function factors(phiDeg: number) {
  const phi = clamp(phiDeg, 0, 89.9)
  const t = Math.tan(rad(phi))
  const Nq = Math.exp(Math.PI * t) * Math.pow(Math.tan(rad(45 + phi / 2)), 2)
  const Nc = phi === 0 ? 5.14 : (Nq - 1) / t
  const NgammaV = 2 * (Nq + 1) * t
  const NgammaM = (Nq - 1) * Math.tan(rad(1.4 * phi))
  return { phi, t, Nq, Nc, NgammaV, NgammaM }
}

function waterTableGamma(i: Stage2BearingInput, B: number) {
  const gw = i.waterTableDepth
  if (gw == null || !Number.isFinite(gw)) return { gamma: i.gamma, note: 'Yeraltı su seviyesi girilmedi.' }
  const z = gw - i.Df
  if (z <= 0) return { gamma: Math.max(1e-6, i.gamma - 9.81), note: 'Su seviyesi temel tabanı üzerinde/aynı seviyede: γ′ kullanıldı.' }
  if (z >= B) return { gamma: i.gamma, note: 'Su seviyesi temel tabanından B kadar veya daha derinde: q altındaki γ değişmedi.' }
  const gammaSub = Math.max(1e-6, i.gamma - 9.81)
  const ratio = z / B
  return { gamma: ratio * i.gamma + (1 - ratio) * gammaSub, note: 'Su seviyesi temel tabanı ile B arasında: γ etkin aralık için ağırlıklandırıldı.' }
}

function methodFactors(method: Stage2BearingMethod, B: number, L: number, phi: number, Df: number) {
  const ratio = clamp(B / Math.max(L, 1e-9), 0, 1)
  const t = Math.tan(rad(phi))
  const depth = Df / Math.max(B, 1e-9)
  if (method === 'Terzaghi') return { sc: 1, sq: 1, sgamma: 1, dc: 1, dq: 1, dgamma: 1, source: 'Terzaghi klasik bağıntıları' }
  if (method === 'Meyerhof') return {
    sc: 1 + 0.2 * ratio, sq: 1 + 0.1 * ratio, sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.2 * depth, dq: 1 + 0.1 * depth, dgamma: 1,
    source: 'Meyerhof sığ temel düzeltme bağıntıları'
  }
  if (method === 'Hansen') return {
    sc: 1 + (B / Math.max(L, 1e-9)) * (Math.sin(rad(phi)) / Math.max(Math.cos(rad(phi)), 1e-9)),
    sq: 1 + ratio * t,
    sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.4 * depth,
    dq: 1 + 2 * depth * t * Math.pow(1 - Math.sin(rad(phi)), 2),
    dgamma: 1,
    source: 'Hansen genel taşıma gücü düzeltme bağıntıları'
  }
  return {
    sc: 1 + ratio * t,
    sq: 1 + ratio * t,
    sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.4 * depth,
    dq: 1 + 2 * depth * t * Math.pow(1 - Math.sin(rad(phi)), 2),
    dgamma: 1,
    source: 'Vesic genel taşıma gücü düzeltme bağıntıları'
  }
}

export function stage2BearingCapacity(i: Stage2BearingInput): Stage2Result<any> {
  const V = i.loadV ?? 0
  const H = i.loadH ?? 0
  if (i.design === 'tbdy-2018') {
    const r = calculateSurfaceFoundation({
      B:i.B,L:i.L,Df:i.Df,gamma1:i.gamma,gamma2:i.gamma,c:i.c,phi:i.phi,
      verticalLoad:Math.max(0,V),horizontalLoad:H,momentX:i.momentX??0,momentY:i.momentY??0,
      groundSlope:i.soilSlope??0,baseSlope:i.baseSlope??0,resistanceFactor:1.4,
      method:'TBDY-2018',groundwaterDepth:i.waterTableDepth,
      layers:i.layers?.map((x,idx)=>({topDepth:i.Df+(idx===0?0:i.layers!.slice(0,idx).reduce((a,y)=>a+y.thickness,0)),bottomDepth:i.Df+i.layers!.slice(0,idx+1).reduce((a,y)=>a+y.thickness,0),gamma:x.gamma,cohesion:x.c,phi:x.phi}))
    })
    return {
      value:{Nq:r.Nq,Nc:r.Nc,Ngamma:r.Ngamma,sc:r.sc,sq:r.sq,sgamma:r.sg,dc:r.dc,dq:r.dq,dgamma:r.dg,ic:r.ic,iq:r.iq,igamma:r.ig,characteristic:r.qk,designResistance:r.qt,allowableGross:r.qk/Math.max(i.FS??3,1e-9),qApplied:r.qo,BEffective:r.Be,LEffective:r.Le,ex:r.ex,ey:r.ey,qSurcharge:r.surcharge,resistanceFactor:1.4},
      method:'TBDY 2018',source:r.source,warnings:r.warnings,steps:r.steps
    }
  }
  const r=authoritativeBearing({B:i.B,L:i.L,Df:i.Df,gamma:i.gamma,c:i.c,phi:i.phi,FS:Math.max(i.FS??3,0.1),method:i.method})
  const warnings:string[]=[]
  if(Math.abs(i.momentX??0)>0||Math.abs(i.momentY??0)>0)warnings.push('Klasik sonuç merkezi düşey yük varsayımıyla hesaplanır; momentli temas kontrolü için temel kontrol motoru kullanılmalıdır.')
  return {
    value:{Nq:r.value.Nq,Nc:r.value.Nc,Ngamma:r.value.Ngamma,sc:r.value.sc,sq:r.value.sq,sgamma:r.value.sg,dc:r.value.dc,dq:r.value.dq,dgamma:r.value.dg,ic:1,iq:1,igamma:1,characteristic:r.value.ultimate,designResistance:undefined,allowableGross:r.value.allowableGross,qApplied:Math.max(0,V)/(Math.max(i.B*i.L,1e-9)),BEffective:i.B,LEffective:i.L,ex:0,ey:0,qSurcharge:i.gamma*i.Df,resistanceFactor:undefined},
    method:i.method,source:r.source,warnings,steps:r.steps
  }
}

export interface Stage2SettlementLayer {
  thickness: number
  sigmaV0: number
  deltaSigma: number
  Es?: number
  nu?: number
  M?: number
  mv?: number
  Cc?: number
  e0?: number
  Cr?: number
  sigmaPc?: number
  Iz?: number
}
export interface Stage2SettlementInput {
  B: number
  L?: number
  q: number
  qNet?: number
  layers: Stage2SettlementLayer[]
  method?: Stage2SettlementMethod
  schmertmannC1?: number
  schmertmannC2?: number
  timeYears?: number
}

function stress21(q: number, B: number, L: number, z: number) {
  return Math.max(0, q) * B * L / Math.max((B + z) * (L + z), 1e-9)
}
function schmertmannIz(z: number, B: number) {
  if (z < 0 || z > 2 * B) return 0
  if (z <= 0.5 * B) return z / Math.max(0.5 * B, 1e-9)
  return Math.max(0, (2 * B - z) / (1.5 * B))
}

export function stage2Settlement(i: Stage2SettlementInput): Stage2Result<any> {
  const B = Math.max(i.B, 0.01), L = Math.max(i.L ?? i.B, 0.01), q = Math.max(i.q, 0)
  const method = i.method ?? 'elastic'
  const C1 = i.schmertmannC1 ?? clamp(1 - 0.5 * (i.qNet ?? q) / Math.max(i.layers[0]?.sigmaV0 ?? 1, 1e-6), 0.5, 1)
  const C2 = i.schmertmannC2 ?? (i.timeYears != null ? 1 + 0.2 * Math.log10(Math.max(i.timeYears, 0.1) / 0.1) : 1)
  let immediate = 0, consolidation = 0, depth = 0
  const layerResults: any[] = []
  for (const [index, layer] of i.layers.entries()) {
    const H = Math.max(0, layer.thickness)
    const top = depth, bottom = depth + H, zmid = (top + bottom) / 2
    const ds = method === '2:1' ? stress21(q, B, L, zmid) : Math.max(0, layer.deltaSigma)
    let s = 0, type = 'none'
    if (H > 0 && ds > 0) {
      if (method === 'elastic') {
        const nu = clamp(layer.nu ?? 0.30, 0, 0.49)
        s = ds * H * (1 - nu * nu) / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = 'elastic'
      } else if (method === '2:1') {
        const nu = clamp(layer.nu ?? 0.30, 0, 0.49)
        s = ds * H * (1 - nu * nu) / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = '2:1 + elastic'
      } else if (method === 'janbu') {
        const M = Math.max(layer.M ?? layer.Es ?? 0, 1e-9)
        s = ds * H / M
        immediate += s; type = 'Janbu M integration'
      } else if (method === 'schmertmann') {
        const Iz = layer.Iz ?? schmertmannIz(zmid, B)
        s = C1 * C2 * q * Math.max(0, Iz) * H / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = 'Schmertmann'
      } else if (method === 'consolidation') {
        const sigma0 = Math.max(layer.sigmaV0, 1e-6), sigma1 = sigma0 + ds
        if (layer.mv != null && layer.mv >= 0) {
          s = H * layer.mv * ds
        } else if (layer.Cc != null && layer.e0 != null && layer.e0 > -1) {
          const pc = Math.max(layer.sigmaPc ?? sigma0, sigma0)
          const Cr = Math.max(0, layer.Cr ?? layer.Cc)
          if (sigma1 <= pc) s = H * Cr / (1 + layer.e0) * Math.log10(sigma1 / sigma0)
          else s = H * Cr / (1 + layer.e0) * Math.log10(pc / sigma0) + H * layer.Cc / (1 + layer.e0) * Math.log10(sigma1 / pc)
        }
        consolidation += Math.max(0, s); type = 'oedometer'
      }
    }
    layerResults.push({ index, top, bottom, zmid, deltaSigma: ds, Iz: method === 'schmertmann' ? layer.Iz ?? schmertmannIz(zmid, B) : undefined, settlement: Math.max(0, s), type })
    depth = bottom
  }
  const warnings: string[] = []
  if (!i.layers.length) warnings.push('Katman tanımlanmadı.')
  if (method === 'elastic' || method === '2:1') warnings.push('Elastik modül yaklaşımı için Es değerlerinin saha/laboratuvar korelasyonlarıyla doğrulanması gerekir. Erol & Çekinmez (2014) parametre seçimi kaynağı olarak rapora eklenebilir.')
  if (method === 'janbu' && i.layers.some(x => x.M == null && x.Es == null)) warnings.push('Janbu hesabında M veya Es verilmemiş katmanlar sıfır katkı verir.')
  if (method === 'schmertmann') warnings.push('Schmertmann yöntemi tabaka bazında Iz integrasyonu ile uygulanır; şekilsel Iz dağılımı, temel geometrisi ve zaman düzeltmesi rapor izinde gösterilir.')
  return {
    value: { immediate, consolidation, total: immediate + consolidation, layerResults, C1, C2 },
    method,
    source: `${method} settlement framework; Erol & Çekinmez (2014) field-test correlations are registered as secondary parameter-selection provenance (${EROL_SOURCE_KEYS.fieldTests}).`,
    warnings,
    steps: [
      { symbol: 'Δσ', title: 'Katman gerilme artışı', formula: method === '2:1' ? 'Δσ=qBL/[(B+z)(L+z)]' : 'Katman verisi / Schmertmann etkilenim katsayısı', unit: 'kPa' },
      { symbol: 'sᵢ', title: 'Anlık oturma', formula: 'Katman integrasyonu', value: immediate, unit: 'm' },
      { symbol: 's꜀', title: 'Konsolidasyon oturması', formula: 'mv·Δσ·H veya Cc/Cr logaritmik bağıntısı', value: consolidation, unit: 'm' },
      { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ=sᵢ+s꜀', value: immediate + consolidation, unit: 'm' }
    ]
  }
}
