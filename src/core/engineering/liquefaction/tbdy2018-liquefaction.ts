export interface TBDYLiquefactionInput{depth:number;totalStress:number;effectiveStress:number;rawSPT:number;CE:number;CB:number;CR:number;CS:number;finesContent:number;Mw:number;SDS:number}
export interface TBDYLiquefactionResult{
  N160:number;N160f:number;CN:number;alpha:number;beta:number;CRRM75:number;CM:number;Rtau:number;rd:number;tauEarthquake:number;FS:number
  steps:{symbol:string;formula:string;value:number;source:string}[];warnings:string[]
}
export function tbdy2018Liquefaction(i:TBDYLiquefactionInput):TBDYLiquefactionResult{
  const warnings:string[]=[]
  if(!Number.isFinite(i.depth)||i.depth<0)throw new Error('SPT derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(!Number.isFinite(i.totalStress)||i.totalStress<0)throw new Error('Toplam düşey gerilme sıfır veya pozitif olmalıdır.')
  if(!Number.isFinite(i.effectiveStress)||i.effectiveStress<=0)throw new Error('Sıvılaşma hesabı için efektif düşey gerilme pozitif olmalıdır.')
  if(!Number.isFinite(i.rawSPT)||i.rawSPT<0)throw new Error('Ham SPT N değeri sıfır veya pozitif olmalıdır.')
  for(const [name,value] of [['CE',i.CE],['CB',i.CB],['CR',i.CR],['CS',i.CS],['SDS',i.SDS],['Mw',i.Mw],['finesContent',i.finesContent]] as const){
    if(!Number.isFinite(value))throw new Error(name+' geçerli bir sayı olmalıdır.')
  }
  if(i.CE<=0||i.CB<=0||i.CR<=0||i.CS<=0)throw new Error('SPT düzeltme katsayıları pozitif olmalıdır.')
  if(i.Mw<=0||i.SDS<0||i.finesContent<0||i.finesContent>100)throw new Error('Mw, SDS ve ince dane oranı geçerli aralıkta olmalıdır.')
  const sv=i.effectiveStress,z=i.depth,CN=Math.min(1.70,9.78/Math.sqrt(sv))
  const N160=i.rawSPT*CN*i.CE*i.CB*i.CR*i.CS
  const f=i.finesContent
  let alpha=0,beta=1
  if(f<=5){alpha=0;beta=1}else if(f<35){alpha=Math.exp(1.76-190/(f*f));beta=.99+Math.pow(f,1.5)/1000}else{alpha=5;beta=1.2}
  const N160f=alpha+beta*N160
  const n=N160f
  const CRRM75=n>0&&n<34?1/(34-n)+n/135+50/(10*n+45)**2-1/200:NaN
  const CM=Math.pow(10,2.24)/Math.pow(Math.max(i.Mw,.1),2.56)
  const Rtau=Number.isFinite(CRRM75)?CRRM75*CM*sv:NaN
  const rd=z<=9.15?1-.00765*z:z<=23?1.174-.0267*z:z<=30?.744-.008*z:.5
  const tau=.65*i.totalStress*(.4*i.SDS)*rd
  const FS=Number.isFinite(Rtau)&&tau>0?Rtau/tau:NaN
  if(N160f<=0||N160f>=34)warnings.push('N1,60f CRR bağıntısının geçerli aralığında değil; CRR, Rτ ve FS üretilemez.')
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