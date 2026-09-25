import { fineContentCorrection } from '../spt/spt-engine'
export interface TBDYLiquefactionInput{depth:number;totalStress:number;effectiveStress:number;rawSPT:number;CE:number;CB:number;CR:number;CS:number;finesContent:number;Mw:number;SDS:number}
export interface TBDYLiquefactionResult{N160:number;N160f:number;CN:number;alpha:number;beta:number;CRRM75:number;CM:number;Rtau:number;rd:number;tauEarthquake:number;FS:number;steps:{symbol:string;formula:string;value:number;source:string}[];warnings:string[]}
const finite=(x:number)=>Number.isFinite(x)
function rdAtDepth(z:number){const d=Math.max(0,z);return d<=9.15?1-.00765*d:d<=23?1.174-.0267*d:d<=30?.744-.008*d:.5}
function magnitudeCorrection(Mw:number){return 10**2.24/Mw**2.56}
export function tbdy2018Liquefaction(i:TBDYLiquefactionInput):TBDYLiquefactionResult{
 if([i.depth,i.totalStress,i.effectiveStress,i.rawSPT,i.CE,i.CB,i.CR,i.CS,i.finesContent,i.Mw,i.SDS].some(v=>!finite(v)))throw new Error('Tek nokta sıvılaşma girdilerinde geçersiz sayı bulundu.')
 if(i.depth<0||i.totalStress<0||i.effectiveStress<=0||i.rawSPT<0||i.CE<=0||i.CB<=0||i.CR<=0||i.CS<=0||i.Mw<=0||i.SDS<0)throw new Error('Tek nokta sıvılaşma girdileri fiziksel olarak geçersiz.')
 const CN=Math.min(1.70,9.78/Math.sqrt(i.effectiveStress)),N160=i.rawSPT*i.CE*i.CB*i.CS*i.CR,fc=fineContentCorrection(i.finesContent),N160f=fc.alpha+fc.beta*N160
 if(N160f>=34)throw new Error('(N1)60f ≥ 34; CRR bağıntısı bu aralıkta kullanılmaz.')
 const CRRM75=1/(34-N160f)+N160f/135+50/Math.pow(10*N160f+45,2)-.005,CM=magnitudeCorrection(i.Mw),Rtau=CRRM75*CM*i.effectiveStress,rd=rdAtDepth(i.depth),tauEarthquake=.65*.4*i.SDS*i.totalStress*rd,FS=tauEarthquake>0?Rtau/tauEarthquake:Infinity
 return{N160,N160f,CN,alpha:fc.alpha,beta:fc.beta,CRRM75,CM,Rtau,rd,tauEarthquake,FS,steps:[
 {symbol:'CN',formula:'min(1.70,9.78/√σ′v0)',value:CN,source:'TBDY 2018 Ek 16B'},
 {symbol:'(N1)60',formula:'N·CN·CE·CB·CR·CS',value:N160,source:'TBDY 2018 Ek 16B'},
 {symbol:'(N1)60f',formula:'α+β(N1)60',value:N160f,source:'TBDY 2018 Ek 16B'},
 {symbol:'CRR7.5',formula:'Ek 16B CRR bağıntısı',value:CRRM75,source:'TBDY 2018 Ek 16B'},
 {symbol:'CM',formula:'10^2.24/Mw^2.56',value:CM,source:'TBDY 2018 Ek 16B'},
 {symbol:'Rτ',formula:'CRR7.5·CM·σ′v0',value:Rtau,source:'TBDY 2018 Ek 16B'},
 {symbol:'rd',formula:'Ek 16B derinlik bağıntısı',value:rd,source:'TBDY 2018 Ek 16B'},
 {symbol:'τdeprem',formula:'0.65·0.4·SDS·σv0·rd',value:tauEarthquake,source:'TBDY 2018 Ek 16B'},
 {symbol:'FS',formula:'Rτ/τdeprem',value:FS,source:'TBDY 2018 16.6.9'}
 ],warnings:[]}
}