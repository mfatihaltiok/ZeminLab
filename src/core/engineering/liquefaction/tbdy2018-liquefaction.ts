export interface TBDYLiquefactionInput {
  depth:number
  totalStress:number
  effectiveStress:number
  rawSPT:number
  CE:number
  CB:number
  CR:number
  CS:number
  finesContent:number
  Mw:number
  SDS:number
}
export interface TBDYLiquefactionResult {
  N160:number; N160f:number; CN:number; alpha:number; beta:number; CRRM75:number; CM:number; Rtau:number; rd:number; tauEarthquake:number; FS:number
  steps:{symbol:string;formula:string;value:number;source:string}[]; warnings:string[]
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x))
export function tbdy2018Liquefaction(i:TBDYLiquefactionInput):TBDYLiquefactionResult{
 const warnings:string[]=[]
 const sv=Math.max(i.effectiveStress,1e-9), z=Math.max(i.depth,0)
 const CN=Math.min(1.70,9.78/Math.sqrt(sv))
 const N160=i.rawSPT*CN*i.CE*i.CB*i.CR*i.CS
 const f=clamp(i.finesContent,0,100)
 let alpha=0,beta=1
 if(f<=5){alpha=0;beta=1}
 else if(f<35){alpha=Math.exp(1.76-190/(f*f));beta=0.99+f/1000}
 else{alpha=5;beta=1.2}
 const N160f=N160+alpha*beta
 const n=Math.max(N160f,0.1)
 const CRRM75=1/(34-n)+n/135+50/((10*n+45)**2)-1/200
 const CM=Math.pow(10,2.24)/Math.pow(Math.max(i.Mw,0.1),2.56)
 const Rtau=CRRM75*CM*sv
 let rd=1
 if(z<=9.15)rd=1-0.00765*z
 else if(z<=23)rd=1.174-0.0267*z
 else if(z<=30)rd=0.744-0.008*z
 else rd=0.50
 const tau=0.65*i.totalStress*(0.4*i.SDS)*rd
 const FS=tau>0?Rtau/tau:Infinity
 if(i.effectiveStress<=0)warnings.push('Efektif düşey gerilme sıfır/negatif.')
 if(i.rawSPT<0)warnings.push('Ham SPT negatif olamaz.')
 if(i.finesContent<0||i.finesContent>100)warnings.push('İnce dane içeriği %0-%100 aralığına sınırlandı.')
 return{N160,N160f,CN,alpha,beta,CRRM75,CM,Rtau,rd,tauEarthquake:tau,FS,steps:[
  {symbol:'CN',formula:'min(1.70, 9.78/√σ′vo)',value:CN,source:'TBDY 2018 Denk. 16B.2'},
  {symbol:'N1,60',formula:'N·CN·CE·CB·CR·CS',value:N160,source:'TBDY 2018 Denk. 16B.1'},
  {symbol:'N1,60f',formula:'N1,60 + αβ',value:N160f,source:'TBDY 2018 Denk. 16B.3a'},
  {symbol:'CRR_M7.5',formula:'TBDY Denk. 16B.4b',value:CRRM75,source:'TBDY 2018 Denk. 16B.4b'},
  {symbol:'CM',formula:'10^2.24 / Mw^2.56',value:CM,source:'TBDY 2018 Denk. 16B.4c'},
  {symbol:'Rτ',formula:'CRR_M7.5·CM·σ′vo',value:Rtau,source:'TBDY 2018 Denk. 16B.4a'},
  {symbol:'rd',formula:'z derinliğine bağlı parçaçıl bağıntı',value:rd,source:'TBDY 2018 Denk. 16B.6'},
  {symbol:'τdeprem',formula:'0.65·σvo·(0.4·SDS)·rd',value:tau,source:'TBDY 2018 Denk. 16B.5'},
  {symbol:'FS',formula:'Rτ/τdeprem',value:FS,source:'ZeminLab türetilmiş karşılaştırma'}],warnings}
}
