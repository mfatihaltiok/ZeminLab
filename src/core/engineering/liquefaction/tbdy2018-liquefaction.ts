import { crrM75, finesCorrection, magnitudeCorrection, rdAtDepth } from './liquefaction-formulas'
export interface TBDYLiquefactionInput{depth:number;totalStress:number;effectiveStress:number;rawSPT:number;CE:number;CB:number;CR:number;CS:number;finesContent:number;Mw:number;SDS:number}
export interface TBDYLiquefactionResult{N160:number;N160f:number;CN:number;alpha:number;beta:number;CRRM75:number;CM:number;Rtau:number;rd:number;tauEarthquake:number;FS:number;steps:{symbol:string;formula:string;value:number;source:string}[];warnings:string[]}
export function tbdy2018Liquefaction(i:TBDYLiquefactionInput):TBDYLiquefactionResult{
  if(!Number.isFinite(i.depth)||i.depth<0)throw new Error('Derinlik geçerli olmalıdır.')
  if(!Number.isFinite(i.totalStress)||i.totalStress<0)throw new Error('Toplam gerilme geçerli olmalıdır.')
  if(!Number.isFinite(i.effectiveStress)||i.effectiveStress<=0)throw new Error('Etkin gerilme pozitif olmalıdır.')
  if(!Number.isFinite(i.rawSPT)||i.rawSPT<0)throw new Error('Ham SPT negatif olamaz.')
  if(![i.CE,i.CB,i.CR,i.CS].every(x=>Number.isFinite(x)&&x>0))throw new Error('CE, CB, CR ve CS açıkça ve pozitif girilmelidir.')
  if(!Number.isFinite(i.finesContent)||i.finesContent<0||i.finesContent>100)throw new Error('İnce dane içeriği %0–%100 arasında olmalıdır.')
  if(!Number.isFinite(i.SDS)||i.SDS<0)throw new Error('SDS geçerli olmalıdır.')
  const CN=Math.min(1.70,9.78/Math.sqrt(i.effectiveStress)),N160=i.rawSPT*CN*i.CE*i.CB*i.CR*i.CS
  const f=finesCorrection(i.finesContent),N160f=f.alpha+f.beta*N160,crr=crrM75(N160f)
  if(crr===undefined)throw new Error('(N1)60f değeri 0–34 aralığı dışında; CRR7.5 bağıntısı uygulanamaz.')
  const CM=magnitudeCorrection(i.Mw),Rtau=crr*CM*i.effectiveStress,rd=rdAtDepth(i.depth),tau=.65*i.totalStress*(.4*i.SDS)*rd,FS=tau>0?Rtau/tau:Infinity
  return{N160,N160f,CN,alpha:f.alpha,beta:f.beta,CRRM75:crr,CM,Rtau,rd,tauEarthquake:tau,FS,steps:[
    {symbol:'CN',formula:'min(1.70,9.78/√σ′vo)',value:CN,source:'TBDY 2018 Ek 16B'},
    {symbol:'(N1)60',formula:'N·CN·CE·CB·CR·CS',value:N160,source:'TBDY 2018 Ek 16B'},
    {symbol:'(N1)60f',formula:'α+β(N1)60',value:N160f,source:'TBDY 2018 Ek 16B'},
    {symbol:'CRR7.5',formula:'Ek 16B CRR bağıntısı',value:crr,source:'TBDY 2018 Ek 16B'},
    {symbol:'CM',formula:'10^2.24/Mw^2.56',value:CM,source:'TBDY 2018 Ek 16B'},
    {symbol:'Rτ',formula:'CRR7.5·CM·σ′vo',value:Rtau,source:'TBDY 2018 Ek 16B'},
    {symbol:'rd',formula:'Derinlik bağıntısı',value:rd,source:'TBDY 2018 Ek 16B'},
    {symbol:'τdeprem',formula:'0.65·(0.4SDS)·σvo·rd',value:tau,source:'TBDY 2018 Ek 16B'},
    {symbol:'FS',formula:'Rτ/τdeprem',value:FS,source:'TBDY 2018 16.6.9'}
  ],warnings:[]}
}