import { calculateSpt, fineContentCorrection } from '../engineering/spt/spt-engine'
import { bearingCapacity as bearingEngine, foundationChecks as foundationEngine, jetGrout as jetGroutEngine, liquefaction as liquefactionEngine, settlement as settlementEngine, stressAtDepth as stressEngine, type BearingMethod } from '../engineering/calculation-engine'
import { stage2BearingCapacity, stage2Settlement, type Stage2BearingInput, type Stage2SettlementInput, type Stage2BearingMethod } from '../engineering/stage2-engine'
import { liquefactionProfile as liquefactionProfileEngine, type LiquefactionProfileInput, type LiquefactionProfileResult } from '../engineering/liquefaction/liquefaction-profile'
import { layerSettlement as layerSettlementEngine, schmertmannSettlement, stressSpread21, jetGroutAdvanced as jetGroutAdvancedEngine, type LayerSettlementInput, type SchmertmannLayer } from '../engineering/advanced-geotech'
import { calculateSurfaceFoundation, type SurfaceFoundationInput, type SurfaceFoundationMethod } from '../engineering/surface-foundation'
import { calculateSubgradeReaction, type SubgradeReactionInput } from '../engineering/subgrade-reaction'

export type { BearingMethod, LayerSettlementInput, SchmertmannLayer, LiquefactionProfileInput, LiquefactionProfileResult, Stage2BearingInput, Stage2SettlementInput, Stage2BearingMethod, SurfaceFoundationInput, SurfaceFoundationMethod, SubgradeReactionInput }
export type SoilLayerInput={top:number;bottom:number;soil?:string;gamma:number;gammaSat:number;cohesion?:number;phi?:number;fines?:number;cu?:number;PI?:number}
export type SptInput={depth:number;nField:number;energyRatio?:number;boreholeDiameter?:number;sampler?:'standard'|'without-liner';samplerCorrection?:number;fines?:number}

export function classifySoilISO14688(ll?:number,pi?:number){if(ll==null||pi==null||!Number.isFinite(ll)||!Number.isFinite(pi)||ll<=0)return null;const a=.73*(ll-20);const clay=pi>=a&&pi>=4;const group=ll<35?'L':ll<=50?'M':'H';return{code:clay?`CI${group}`:`Si${group}`,description:clay?'Kil':'Silt',plasticity:group,aLine:a,isClay:clay}}
export function stressAtDepth(depth:number,layers:Pick<SoilLayerInput,'top'|'bottom'|'gamma'|'gammaSat'>[],gwt:number){return stressEngine(depth,layers,gwt)}
export function sptCorrection(x:SptInput,sigmaVPrime:number){const r=calculateSpt({nField:x.nField,energyRatio:x.energyRatio,boreholeDiameterMm:x.boreholeDiameter,sampler:x.sampler==='without-liner'?'without-liner':'standard',samplerCorrection:x.samplerCorrection,effectiveStress:sigmaVPrime,fineContent:x.fines,applyOverburden:true,applyDilatancy:false});const fines=Math.max(0,x.fines??0);const {alpha,beta}=fineContentCorrection(fines);return{CE:r.ce,CB:r.cb,CS:r.cs,CR:r.cr,CN:r.cn,N60:r.n60,N160:r.n1_60,N160f:alpha+beta*r.n1_60,alpha,beta,sigmaVPrime}}

/** Legacy/literature single-layer bearing capacity; values are kN/m². */
export function bearingCapacity(i:{B:number;L:number;Df:number;gamma:number;c:number;phi:number;FS:number;method:BearingMethod;waterReduction?:number}){return{...bearingEngine(i).value,method:i.method}}

/** TBDY 2018 surface-foundation engine. All stresses are kN/m², loads kN, dimensions m. */
export function tbdyBearingCapacity(i:SurfaceFoundationInput){
  return calculateSurfaceFoundation({...i,method:'TBDY-2018',resistanceFactor:i.resistanceFactor ?? 1.4})
}

export function bearingCapacityStage2(i:Stage2BearingInput){return stage2BearingCapacity(i)}
export function settlement(i:{B:number;q:number;Es:number;nu:number;layers?:{thickness:number;Cc?:number;e0?:number;sigma0?:number;dSigma?:number}[]}){return settlementEngine(i).value}
export function settlementStage2(i:Stage2SettlementInput){return stage2Settlement(i)}
export function liquefaction(i:{Mw:number;Sds:number;depth:number;N160f:number;sigmaV:number;sigmaVPrime:number}){return liquefactionEngine(i)}
export function liquefactionProfile(i:LiquefactionProfileInput){return liquefactionProfileEngine(i)}
export function foundationChecks(i:{B:number;L:number;N:number;V:number;Mx:number;My:number;delta?:number;cu?:number;area?:number}){return foundationEngine(i).value}
export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){return jetGroutEngine(i).value}
export function stressSpread2to1(i:{q:number;B:number;L:number;z:number}){return stressSpread21(i)}

/** Winkler ks. Result unit is kN/m³. */
export function subgradeReaction(i:SubgradeReactionInput){return calculateSubgradeReaction(i)}
export function layerSettlement(layers:LayerSettlementInput[]){return layerSettlementEngine(layers)}
export function schmertmann(q:number,layers:SchmertmannLayer[],C1=1,C2=1){return schmertmannSettlement(q,layers,C1,C2)}
export function jetGroutAdvanced(i:Parameters<typeof jetGroutAdvancedEngine>[0]){return jetGroutAdvancedEngine(i)}

export const SOURCE_NOTES={
  investigation:'TBDY 2018 Bölüm 16 ve Ek 16A: zemin araştırmaları, SPT/laboratuvar verileri ve raporlama.',
  liquefaction:'TBDY 2018 Bölüm 16.6 ve Ek 16B: sıvılaşma değerlendirmesi.',
  bearing:'TBDY 2018 16.8.3.2 ve Denklem 16.8: yüzeysel temel taşıma gücü. ZeminLab birimleri: m, kN, kN/m², kN/m³.',
  settlement:'TBDY 2018 Bölüm 16: taşıma gücü ve yerdeğiştirme koşulları birlikte değerlendirilir.',
  stressSpread:'2:1 gerilme yayılımı; q ve Δσ kN/m², boyutlar m.',
  subgrade:'Winkler ks; q/s doğrudan kN/m³ verir. Elastik yaklaşım yalnızca eşdeğer ön tahmindir.',
  foundation:'TBDY 2018 Bölüm 16.7–16.8: temel tasarımı ve taban gerilmesi kontrolleri.',
  jetGrout:'TBDY 2018 Bölüm 16 / Ek 16D: zemin iyileştirmesi.',
  jetGroutAdvanced:'Kompozit rijitlik ve yük paylaşımı modeli; Priebe bağıntıları jet grout için doğrudan TBDY katsayısı olarak uygulanmaz.'
}
