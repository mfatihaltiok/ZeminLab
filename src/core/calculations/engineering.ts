import { calculateSpt } from '../engineering/spt/spt-engine'
import { bearingCapacity as bearingEngine, foundationChecks as foundationEngine, jetGrout as jetGroutEngine, liquefaction as liquefactionEngine, settlement as settlementEngine, stressAtDepth as stressEngine, tbdyBearingCapacity as tbdyBearingEngine, type BearingMethod } from '../engineering/calculation-engine'

export type { BearingMethod }
export type SoilLayerInput={top:number;bottom:number;soil:string;gamma:number;gammaSat:number;cohesion:number;phi:number;fines:number;cu?:number;PI?:number}
export type SptInput={depth:number;nField:number;energyRatio?:number;boreholeDiameter?:number;sampler?:'standard'|'without-liner';fines?:number}

export function classifySoilISO14688(ll?:number,pi?:number){if(ll==null||pi==null||!Number.isFinite(ll)||!Number.isFinite(pi)||ll<=0)return null;const a=.73*(ll-20),clay=pi>=a&&pi>=4,group=ll<35?'L':ll<=50?'M':'H';return{code:clay?`CI${group}`:`Si${group}`,description:clay?'Kil':'Silt',plasticity:group,aLine:a,isClay:clay}}
export function stressAtDepth(depth:number,layers:SoilLayerInput[],gwt:number){return stressEngine(depth,layers.map(l=>({top:l.top,bottom:l.bottom,gamma:l.gamma,gammaSat:l.gammaSat})),gwt)}
/** Compatibility facade. All SPT corrections now run through the single SPT engine. */
export function sptCorrection(x:SptInput,sigmaVPrime:number){const r=calculateSpt({nField:x.nField,energyRatio:x.energyRatio,boreholeDiameterMm:x.boreholeDiameter,sampler:x.sampler==='without-liner'?'without-liner':'standard',effectiveStress:sigmaVPrime,fineContent:x.fines,applyOverburden:true,applyDilatancy:false});return{CE:r.ce,CB:r.cb,CS:r.cs,CR:r.cr,CN:r.cn,N60:r.n60,N160:r.n1_60,N160f:r.n1_60,alpha:0,beta:1,sigmaVPrime}}
export function bearingCapacity(i:{B:number;L:number;Df:number;gamma:number;c:number;phi:number;FS:number;method:BearingMethod;waterReduction?:number}){return {...bearingEngine(i).value,method:i.method}}
export type TbdyBearingInput={B:number;L:number;Df:number;gamma1:number;gamma2:number;c:number;phi:number;verticalLoad:number;horizontalLoad:number;momentX:number;momentY:number;groundSlope:number;baseSlope:number;resistanceFactor:number}
export function tbdyBearingCapacity(i:TbdyBearingInput){return tbdyBearingEngine(i).value}
export function settlement(i:{B:number;q:number;Es:number;nu:number;layers?:{thickness:number;Cc?:number;e0?:number;sigma0?:number;dSigma?:number}[]}){return settlementEngine(i).value}
export function liquefaction(i:{Mw:number;Sds:number;depth:number;N160f:number;sigmaV:number;sigmaVPrime:number}){return liquefactionEngine(i).value}
export function foundationChecks(i:{B:number;L:number;N:number;V:number;Mx:number;My:number;delta?:number;cu?:number;area?:number}){return foundationEngine(i).value}
export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){return jetGroutEngine(i).value}
export const SOURCE_NOTES={investigation:'TBDY 2018 Bölüm 16 ve Ek 16A: zemin araştırmaları, SPT/laboratuvar verileri ve raporlama.',liquefaction:'TBDY 2018 Bölüm 16.6: sıvılaşma değerlendirmesi. Uygulanan yöntem ve varsayımlar hesap izinde ayrıca gösterilir.',bearing:'TBDY 2018 16.8.3.2 ve Denklem 16.8: yüzeysel temel taşıma gücü.',settlement:'TBDY 2018 Bölüm 16: taşıma gücü ve yerdeğiştirme koşulları birlikte değerlendirilir; eksik zemin parametreleri korelasyon kaynağı ile belirtilmelidir.',foundation:'TBDY 2018 16.7–16.8: temel tasarımı ve taban gerilmesi kontrolleri.',jetGrout:'TBDY 2018 Bölüm 16 / Ek 16D: zemin iyileştirmesi; proje deneyleri ile doğrulama gerekir.'}
