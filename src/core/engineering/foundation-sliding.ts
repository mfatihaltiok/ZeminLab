import { ENGINEERING_CONSTANTS } from '../models/project'
export interface FoundationCheckInput{B:number;L:number;N:number;Vx?:number;Vy?:number;V?:number;Mx:number;My:number;deltaTan:number;cu?:number;area?:number;groundwaterDepth?:number;foundationDepth?:number;passiveResistanceCharacteristic?:number;usePassiveResistance?:boolean;gammaRh?:number;gammaRp?:number}
export function foundationChecks(i:FoundationCheckInput){
  if(i.B<=0||i.L<=0)throw new Error('Temel boyutları pozitif olmalıdır.')
  const N=Math.max(0,i.N),ex=N!==0?i.My/N:0,ey=N!==0?i.Mx/N:0,qAvg=N/(i.B*i.L),qMax=qAvg*(1+6*Math.abs(ex)/i.B+6*Math.abs(ey)/i.L),qMin=qAvg*(1-6*Math.abs(ex)/i.B-6*Math.abs(ey)/i.L)
  const effectiveLength=Math.max(0,i.L-2*Math.abs(ey)),effectiveWidth=Math.max(0,i.B-2*Math.abs(ex)),contactArea=i.area??effectiveWidth*effectiveLength
  if(!Number.isFinite(i.deltaTan)||i.deltaTan<0)throw new Error('Temel tabanı tanδ parametresi açıkça girilmelidir.')
  const rh=i.gammaRh??ENGINEERING_CONSTANTS.TBDY_GAMMA_RH,rp=i.gammaRp??ENGINEERING_CONSTANTS.TBDY_GAMMA_RP,rawTan=i.deltaTan,deltaTan=Math.min(.60,rawTan),warnings:string[]=[]
  let rth=0
  const submerged=i.groundwaterDepth!=null&&i.foundationDepth!=null&&i.groundwaterDepth<=i.foundationDepth
  if(submerged){if(i.cu!=null&&i.cu>0)rth=contactArea*i.cu/rh;else warnings.push('Temel YASS altında/aynı kotta. TBDY 16.8.4.6 gereği deprem sürtünme direnci cu ile hesaplanmalı; cu girilmedi.')}else{rth=N*deltaTan/rh;if(rawTan>0.60)warnings.push('tanδ, TBDY Tablo 16.3 üst sınırı olan 0.60 ile sınırlandı.')}
  const rpk=Math.max(0,i.passiveResistanceCharacteristic??0),rpt=i.usePassiveResistance?rpk/rp:0
  if(rpk>0&&!i.usePassiveResistance)warnings.push('Karakteristik pasif direnç girilmiş ancak pasif direnç kredilendirmesi kapalıdır.')
  const designResistance=rth+.30*rpt,vx=Math.abs(i.Vx??i.V??0),vy=Math.abs(i.Vy??0),utilizationX=designResistance>0?vx/designResistance:Infinity,utilizationY=designResistance>0?vy/designResistance:Infinity,safeX=designResistance>0&&vx<=designResistance,safeY=designResistance>0&&vy<=designResistance
  if(N===0&&(i.Mx!==0||i.My!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; qmin<0 olabilir.')
  if(submerged&&(i.cu==null||i.cu<=0))warnings.push('Kayma hesabı veri eksik: drenajsız Cu gerekli.')
  return{ex,ey,qAvg,qMax,qMin,contactArea,effectiveWidth,effectiveLength,slidingFS:Math.abs(i.V??0)>0?designResistance/Math.abs(i.V!):Infinity,slidingCapacityX:designResistance,slidingCapacityY:designResistance,slidingUtilizationX:utilizationX,slidingUtilizationY:utilizationY,slidingSafeX:safeX,slidingSafeY:safeY,slidingResistanceFactor:rh,passiveResistanceDesign:rpt,passiveResistanceCharacteristic:rpk,slidingTanDelta:deltaTan,slidingMode:submerged?'undrained-cu':'drained-interface',evaluable:!(submerged&&(i.cu==null||i.cu<=0)),warnings}
}