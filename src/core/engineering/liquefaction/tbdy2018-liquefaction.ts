export interface TBDYLiquefactionInput{depth:number;totalStress:number;effectiveStress:number;rawSPT:number;CE:number;CB:number;CR:number;CS:number;finesContent:number;Mw:number;SDS:number}
export interface TBDYLiquefactionResult{
  N160:number;N160f:number;CN:number;alpha:number;beta:number;CRRM75:number;CM:number;Rtau:number;rd:number;tauEarthquake:number;FS:number
  steps:{symbol:string;formula:string;value:number;source:string}[];warnings:string[]
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x))
export function tbdy2018Liquefaction(i:TBDYLiquefactionInput):TBDYLiquefactionResult{
  const warnings:string[]=[]
  const sv=Math.max(i.effectiveStress,1e-9),z=Math.max(i.depth,0),CN=Math.min(1.70,9.78/Math.sqrt(sv))
  const N160=i.rawSPT*CN*i.CE*i.CB*i.CR*i.CS
  const f=clamp(i.finesContent,0,100)
  let alpha=0,beta=1
  if(f<=5){alpha=0;beta=1}else if(f<35){alpha=Math.exp(1.76-190/(f*f));beta=.99+Math.pow(f,1.5)/1000}else{alpha=5;beta=1.2}
  const N160f=alpha+beta*N160
  const n=N160f
  const CRRM75=n>0&&n<34?1/(34-n)+n/135+50/(10*n+45)**2-.005:NaN
  const CM=Math.pow(10,2.24)/Math.pow(Math.max(i.Mw,.1),2.56)
  const Rtau=Number.isFinite(CRRM75)?CRRM75*CM*sv:NaN
  const rd=z<=9.15?1-.00765*z:z<=23?1.174-.0267*z:z<=30?.744-.008*z:.5
  const tau=.65*i.totalStress*(.4*i.SDS)*rd
  const FS=Number.isFinite(Rtau)&&tau>0?Rtau/tau:NaN
  if(i.effectiveStress<=0)warnings.push('Efektif düşey gerilme sıfır/negatif.')
  if(i.rawSPT<0)warnings.push('Ham SPT negatif olamaz.')
  if(i.finesContent<0||i.finesContent>100)warnings.push('İnce dane içeriği %0-%100 aralığına sınırlandı.')
  if(N160f<=0||N160f>=34)warnings.push('N1,60f CRR bağıntısının geçerli aralığında değil; tetiklenme hesabı üretilmedi.')
  return{N160,N160f,CN,alpha,beta,CRRM75,CM,Rtau,rd,tauEarthquake:tau,FS,steps:[
    {symbol:'CN',formula:'min(1.70,9.78/√σ′vo)',value:CN,source:'TBDY 2018 Ek 16B'},
    {symbol:'(N1)60',formula:'N·CN·CE·CB·CR·CS',value:N160,source:'TBDY 2018 Ek 16B'},
    {symbol:'(N1)60f',formula:'α+β(N1)60',value:N160f,source:'TBDY 2018 Ek 16B'},
    {symbol:'CRR7.5',formula:'Ek 16B CRR bağıntısı',value:CRRM75,source:'TBDY 2018 Ek 16B'},
    {symbol:'CM',formula:'10^2.24/Mw^2.56',value:CM,source:'TBDY 2018 Ek 16B'},
    {symbol:'Rτ',formula:'CRR7.5·CM·σ′vo',value:Rtau,source:'TBDY 2018 Ek 16B'},
    {symbol:'rd',formula:'Derinlik bağıntısı',value:rd,source:'TBDY 2018 Ek 16B'},
    {symbol:'τdeprem',formula:'0.65·(0.4SDS)·σvo·rd',value:tau,source:'TBDY 2018 Ek 16B'},
    {symbol:'FS',formula:'Rτ/τdeprem',value:FS,source:'TBDY 2018 16.6.9'}
  ],warnings}
}