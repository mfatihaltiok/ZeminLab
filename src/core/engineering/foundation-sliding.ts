import { TBDY_GAMMA_RH, TBDY_GAMMA_RP } from '../models/project'
export interface FoundationSlidingInput{B:number;L:number;N:number;Vx?:number;Vy?:number;V?:number;Mx:number;My:number;deltaTan?:number;cu?:number;area?:number;groundwaterDepth?:number;foundationDepth?:number;passiveResistanceCharacteristic?:number;usePassiveResistance?:boolean}
export interface FoundationSlidingResult{ex:number;ey:number;qAvg:number;qMax:number;qMin:number;contactArea:number;effectiveWidth:number;effectiveLength:number;slidingFS:number;slidingCapacityX:number;slidingCapacityY:number;slidingUtilizationX:number;slidingUtilizationY:number;slidingSafeX:boolean;slidingSafeY:boolean;slidingResistanceFactor:number;passiveResistanceDesign:number;passiveResistanceCharacteristic:number;slidingTanDelta?:number;slidingMode:'undrained-cu'|'drained-interface';evaluable:boolean;warnings:string[]}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
export function calculateFoundationSliding(i:FoundationSlidingInput):FoundationSlidingResult{
 if(!finite(i.B)||!finite(i.L)||i.B<=0||i.L<=0)throw new Error('Temel B ve L pozitif olmalıdır.')
 if(!finite(i.N)||i.N<0)throw new Error('Düşey temel yükü N negatif olamaz.')
 const N=i.N,ex=N>0?(i.My??0)/N:0,ey=N>0?(i.Mx??0)/N:0,effectiveWidth=Math.max(0,i.B-2*Math.abs(ex)),effectiveLength=Math.max(0,i.L-2*Math.abs(ey)),contactArea=i.area??effectiveWidth*effectiveLength
 const qAvg=N/(i.B*i.L),qMax=qAvg*(1+6*Math.abs(ex)/i.B+6*Math.abs(ey)/i.L),qMin=qAvg*(1-6*Math.abs(ex)/i.B-6*Math.abs(ey)/i.L),warnings:string[]=[]
 if(N===0&&(i.Mx!==0||i.My!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
 if(effectiveWidth<=0||effectiveLength<=0||contactArea<=0)warnings.push('Eksantrisite etkin temas alanını tüketiyor.')
 if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; qmin negatif olabilir.')
 const submerged=i.groundwaterDepth!=null&&i.foundationDepth!=null&&finite(i.groundwaterDepth)&&finite(i.foundationDepth)&&i.groundwaterDepth!<=i.foundationDepth!
 const vx=Math.abs(i.Vx??0),vy=Math.abs(i.Vy??0),resultantH=Math.hypot(vx,vy)
 let rth:number|undefined,deltaTan=i.deltaTan
 if(submerged){if(!finite(i.cu)||i.cu!<=0)warnings.push('Temel YASS altında/aynı kotta olduğundan TBDY 16.8.4.6 için Cu gereklidir; Cu olmadan Rth hesaplanmaz.');else if(contactArea>0)rth=contactArea*i.cu!/TBDY_GAMMA_RH}
 else{if(!finite(deltaTan)||deltaTan!<0)warnings.push('Drenajlı durumda tanδ girilmelidir; gizli 0.60 varsayımı kullanılmaz.');else{if(deltaTan!>0.60){deltaTan=.60;warnings.push('tanδ=0.60 üst sınırına sınırlandı.')}rth=N*deltaTan!/TBDY_GAMMA_RH}}
 const rpk=Math.max(0,i.passiveResistanceCharacteristic??0),rpt=i.usePassiveResistance?rpk/TBDY_GAMMA_RP:0
 if(rpk>0&&!i.usePassiveResistance)warnings.push('Rpk girilmiş ancak pasif direnç kredisi kapalı; Rpt=0.')
 const designResistance=rth==null?0:rth+.30*rpt,utilizationX=designResistance>0?vx/designResistance:Infinity,utilizationY=designResistance>0?vy/designResistance:Infinity,safeX=designResistance>0&&vx<=designResistance,safeY=designResistance>0&&vy<=designResistance
 return{ex,ey,qAvg,qMax,qMin,contactArea,effectiveWidth,effectiveLength,slidingFS:resultantH>0?designResistance/resultantH:Infinity,slidingCapacityX:designResistance,slidingCapacityY:designResistance,slidingUtilizationX:utilizationX,slidingUtilizationY:utilizationY,slidingSafeX:safeX,slidingSafeY:safeY,slidingResistanceFactor:TBDY_GAMMA_RH,passiveResistanceDesign:rpt,passiveResistanceCharacteristic:rpk,slidingTanDelta:deltaTan,slidingMode:submerged?'undrained-cu':'drained-interface',evaluable:rth!==undefined,warnings}
}
