import { calculateSurfaceFoundation, type SurfaceFoundationLayer } from './surface-foundation'
import { foundationChecks, type FoundationCheckInput } from './calculation-engine'
import { liquefactionProfile, type LiquefactionProfileInput, type LiquefactionProfileResult } from './liquefaction/liquefaction-profile'
import { calculateIdealizedSettlement, type IdealizedSettlementInput, type IdealizedSettlementResult } from './idealized-settlement-engine'
import { type ProjectInfo, normalizeProjectInfo, classifyVs30 } from '../models/project'

export type FinalStatus='UYGUN'|'UYGUN DEĞİL'|'VERİ EKSİK'

export interface SeismicFoundationActions{vertical?:number;vx?:number;vy?:number;mx?:number;my?:number;source:string;designAction?:boolean}
export interface FoundationLoadCombinationInput{G:number;Q?:number;S?:number;H?:number;EdH?:number;EdZ?:number;direction?:'+'|'-';includeVerticalEarthquake?:boolean}
export interface FoundationLoadCombination{name:string;N:number;H:number;Vz:number;source:string}
export interface FinalFoundationInput{
  project:ProjectInfo|Partial<ProjectInfo>
  actions?:SeismicFoundationActions
  surfaceLayers?:SurfaceFoundationLayer[]
  settlement?:Omit<IdealizedSettlementInput,'profile'|'B'|'L'|'Df'|'qGross'|'groundwaterDepth'> & {profile:IdealizedSettlementInput['profile']}
  liquefaction?:LiquefactionProfileInput
  seismicBelowGroundwater?:boolean
}
export interface FinalFoundationResult{
  status:FinalStatus;evaluable:boolean
  project:{dts?:string;bks?:number;sds?:number;soilGroup?:string;vs30?:number;zfSiteSpecificRequired:boolean}
  actions:{N:number;Vx:number;Vy:number;Mx:number;My:number;source:string}
  bearing?:ReturnType<typeof calculateSurfaceFoundation>;sliding?:ReturnType<typeof foundationChecks>;settlement?:IdealizedSettlementResult;liquefaction?:LiquefactionProfileResult
  failedChecks:string[];missingData:string[];warnings:string[]
  trace:Array<{check:string;status:FinalStatus;source:string;details:string}>
}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const finiteOr=(x:unknown,d:number)=>finite(x)?x:d

export function buildTBDYSeismicCombinations(i:FoundationLoadCombinationInput):FoundationLoadCombination[]{
  if(!finite(i.G)||i.G<0)throw new Error('G sabit yükü sıfır veya pozitif olmalıdır.')
  for(const [name,v] of [['Q',i.Q],['S',i.S],['H',i.H],['EdH',i.EdH],['EdZ',i.EdZ]] as const)if(v!=null&&!finite(v))throw new Error(name+' sonlu olmalıdır.')
  if(i.Q!=null&&i.Q<0)throw new Error('Q negatif olamaz.')
  if(i.S!=null&&i.S<0)throw new Error('S negatif olamaz.')
  if(i.EdH==null&&i.EdZ==null)throw new Error('EdH veya EdZ girilmelidir.')
  const q=i.Q??0,s=i.S??0,h=i.H??0,eh=i.EdH??0,ez=i.EdZ??0,sign=i.direction==='-'?-1:1
  const vz=i.includeVerticalEarthquake===false?0:sign*ez
  return[
    {name:'4.11',N:i.G+q+.2*s+vz,H:h+sign*eh,Vz:vz,source:'TBDY 2018 4.4.4.1 Denk. 4.11'},
    {name:'4.12',N:.9*i.G+vz,H:h+sign*eh,Vz:vz,source:'TBDY 2018 4.4.4.1 Denk. 4.12'}
  ]
}

export function evaluateFoundationSystem(input:FinalFoundationInput):FinalFoundationResult{
  const p=normalizeProjectInfo(input.project),missing:string[]=[],failed:string[]=[],warnings:string[]=[],trace:FinalFoundationResult['trace']=[]
  const soilGroup=p.geophysical.soilGroup??p.soilParameters.classification.code
  const zf=soilGroup==='ZF'
  if(zf&&!p.geophysical.siteSpecificResponseAnalysisCompleted)missing.push('ZF için sahaya özel zemin davranış analizi')
  if(p.geophysical.vs30!=null){const inferred=classifyVs30(p.geophysical.vs30);if(inferred&&soilGroup&&inferred!==soilGroup&&soilGroup!=='ZF')warnings.push('VS30 ile seçilen zemin grubu farklı; kaynak/tercih raporda açıkça gösterilmelidir.')}
  const fp=p.foundationParameters,sp=p.soilParameters
  const N=finiteOr(input.actions?.vertical,fp.verticalLoad),Vx=finiteOr(input.actions?.vx,fp.vtX),Vy=finiteOr(input.actions?.vy,fp.vtY),Mx=finiteOr(input.actions?.mx,fp.momentX),My=finiteOr(input.actions?.my,fp.momentY)
  const actions={N,Vx,Vy,Mx,My,source:input.actions?.source??'Temele aktarılan tasarım kuvvetleri'}
  if(!finite(N)||!finite(Vx)||!finite(Vy)||!finite(Mx)||!finite(My))missing.push('Temele aktarılan tasarım kuvvetleri')
  let bearing:ReturnType<typeof calculateSurfaceFoundation>|undefined
  let sliding:ReturnType<typeof foundationChecks>|undefined
  if(missing.length===0){
    try{
      bearing=calculateSurfaceFoundation({B:fp.footingWidth,L:fp.footingLength,Df:fp.footingDepth,gamma1:sp.unitWeight,gamma2:sp.saturatedUnitWeight,c:sp.cohesion,phi:sp.frictionAngle,verticalLoad:N,horizontalLoad:Math.hypot(Vx,Vy),momentX:Mx,momentY:My,groundSlope:sp.surfaceSlope,baseSlope:sp.foundationBaseSlope,resistanceFactor:fp.resistanceFactorRv,method:'TBDY-2018',safetyFactor:fp.safetyFactor,foundationType:fp.foundationType,groundwaterDepth:sp.groundwaterDepth,layers:input.surfaceLayers,undrainedCu:sp.undrainedCohesion})
      trace.push({check:'Taşıma gücü',status:bearing.adequate&&bearing.finalDesignEligible?'UYGUN':'UYGUN DEĞİL',source:'TBDY 2018 16.8.2–16.8.3',details:'q0='+bearing.qo.toFixed(3)+' kPa; qt='+bearing.qt.toFixed(3)+' kPa'})
      if(!bearing.adequate||!bearing.finalDesignEligible)failed.push('Taşıma gücü')
      warnings.push(...bearing.warnings)
      const si:FoundationCheckInput={B:fp.footingWidth,L:fp.footingLength,N,Vx,Vy,Mx,My,deltaTan:fp.baseFrictionTanDelta,cu:sp.undrainedCohesion,groundwaterDepth:sp.groundwaterDepth,foundationDepth:fp.footingDepth,passiveResistanceCharacteristic:fp.passiveResistanceCharacteristic,usePassiveResistance:fp.usePassiveResistance,seismic:input.seismicBelowGroundwater??true,interfaceType:'cast-in-place-soil'}
      sliding=foundationChecks(si)
      const slideStatus=sliding.evaluable?(sliding.slidingSafeResultant?'UYGUN':'UYGUN DEĞİL'):'VERİ EKSİK'
      trace.push({check:'Kayma',status:slideStatus,source:'TBDY 2018 16.8.4',details:'Vh='+sliding.horizontalResultant.toFixed(3)+'; R='+sliding.slidingCapacityResultant.toFixed(3)})
      if(!sliding.evaluable)missing.push('Deprem + YASS altında kayma için cu');else if(!sliding.slidingSafeResultant)failed.push('Kayma')
      warnings.push(...sliding.warnings)
    }catch(e){missing.push(e instanceof Error?e.message:'Temel hesabı doğrulanamadı')}
  }
  if(input.settlement&&bearing){
    try{
      const settlement=calculateIdealizedSettlement({...input.settlement,profile:input.settlement.profile,B:fp.footingWidth,L:fp.footingLength,Df:fp.footingDepth,qGross:bearing.qo,groundwaterDepth:sp.groundwaterDepth})
      trace.push({check:'Oturma',status:settlement.ready?'UYGUN':'VERİ EKSİK',source:'TBDY 2018 16.8.3.4 + seçilen yöntem',details:'Toplam oturma='+settlement.totalSettlement.toFixed(3)+' mm'})
      if(!settlement.ready)missing.push('Oturma için gerekli profil parametreleri')
      warnings.push(...settlement.warnings)
    }catch(e){missing.push(e instanceof Error?e.message:'Oturma hesabı doğrulanamadı')}
  }
  let liquefaction:LiquefactionProfileResult|undefined
  if(input.liquefaction){
    try{
      liquefaction=liquefactionProfile(input.liquefaction)
      const bad=liquefaction.rows.some(r=>r.conclusion==='SIVILAŞMA RİSKİ VAR'),incomplete=liquefaction.rows.some(r=>r.status==='VERİ EKSİK'||r.liquefactionCheck==='not-evaluable')
      trace.push({check:'Sıvılaşma',status:bad?'UYGUN DEĞİL':incomplete?'VERİ EKSİK':'UYGUN',source:'TBDY 2018 16.6 + Ek 16B',details=String(liquefaction.rows.length)+' SPT noktası'})
      if(bad)failed.push('Sıvılaşma');if(incomplete)missing.push('Sıvılaşma için eksik saha/laboratuvar verisi');warnings.push(...liquefaction.warnings)
    }catch(e){missing.push(e instanceof Error?e.message:'Sıvılaşma hesabı doğrulanamadı')}
  }
  if(!finite(p.seismic.sds))missing.push('SDS')
  if(!p.seismic.dts)missing.push('DTS')
  if(!p.seismic.bks)missing.push('BKS')
  if(!soilGroup)missing.push('Zemin grubu')
  const m=[...new Set(missing)],f=[...new Set(failed)],status:FinalStatus=f.length?'UYGUN DEĞİL':m.length?'VERİ EKSİK':'UYGUN'
  return{status,evaluable:status!=='VERİ EKSİK',project:{dts:p.seismic.dts,bks:p.seismic.bks,sds:p.seismic.sds,soilGroup,vs30:p.geophysical.vs30,zfSiteSpecificRequired:zf},actions,failedChecks:f,missingData:m,warnings:[...new Set(warnings)],trace,bearing,sliding,liquefaction}
}
