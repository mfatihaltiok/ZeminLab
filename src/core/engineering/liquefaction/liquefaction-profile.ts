import { calculateSpt, fineContentCorrection, type SptEngineInput, type SptTraceStep } from '../spt/spt-engine'
import type { EarthquakeDesignClass } from '../../models/project'

export type LiquefactionSoilGroup='ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF'
export interface LiquefactionSoilLayer{
  top:number;bottom:number;gamma:number;gammaSat:number;soil?:string;finesContent?:number;plasticityIndex?:number;clayContent?:number
}
export interface LiquefactionSptRecord{
  depth:number;nField:number;fineContent?:number;energyRatio?:number;hammerType?:SptEngineInput['hammerType'];boreholeDiameterMm?:number
  sampler?:SptEngineInput['sampler'];samplerCorrection?:number;rodLengthM?:number;plasticityIndex?:number;waterContent?:number;clayContent?:number;soil?:string
}
export interface LiquefactionProfileInput{
  Mw:number;Sds:number;gwt:number;layers:LiquefactionSoilLayer[];spt:LiquefactionSptRecord[];gammaW?:number;applyDilatancy?:boolean
  dts?:EarthquakeDesignClass;soilGroup?:LiquefactionSoilGroup
}
export interface LiquefactionProfileRow{
  depth:number;soil?:string;fineContent?:number;plasticityIndex?:number;clayContent?:number;waterContent?:number
  sigmaV:number;porePressure:number;sigmaVPrime:number;ce:number;cb:number;cs:number;cr:number;cn:number;n60:number;n1_60:number;alpha:number;beta:number;n1_60f:number
  crrM75?:number;CM?:number;tauResistance?:number;rd:number;tauEarthquake?:number;FS?:number
  saturated:boolean;potentiallyLiquefiable:boolean;mandatoryAnalysis:boolean;triggerRequired:boolean;postLiquefactionRequired:boolean
  status:'ANALİZ GEREKLİ'|'ANALİZ GEREKMİYOR'|'TETİKLENME DEĞERLENDİRMESİ'|'VERİ EKSİK'
  conclusion:'SIVILAŞMA RİSKİ VAR'|'SIVILAŞMA RİSKİ YOK'|'DEĞERLENDİRİLMEDİ'|'VERİ EKSİK'
  liquefactionCheck:'evaluate'|'not-evaluable';trace:SptTraceStep[]
}
export interface LiquefactionProfileResult{
  rows:LiquefactionProfileRow[];method:string;source:string;warnings:string[]
  mandatoryByProject:boolean;postLiquefactionRequired:boolean
}

const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x))
function stressAtDepth(depth:number,layers:LiquefactionSoilLayer[],gwt:number,gammaW:number){
  let sigmaV=0,covered=0
  for(const layer of [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)){
    const z0=Math.max(0,layer.top),z1=Math.min(depth,layer.bottom)
    if(z1<=z0)continue
    covered+=z1-z0
    const dry=Math.max(0,Math.min(z1,gwt)-z0),sat=Math.max(0,z1-Math.max(z0,gwt))
    sigmaV+=dry*Math.max(0,layer.gamma)+sat*Math.max(0,layer.gammaSat)
  }
  const u=Math.max(0,depth-gwt)*gammaW
  return{sigmaV,porePressure:u,sigmaVPrime:Math.max(.01,sigmaV-u),covered}
}
function rdAtDepth(z:number){
  const d=Math.max(z,0)
  if(d<=9.15)return 1-.00765*d
  if(d<=23)return 1.174-.0267*d
  if(d<=30)return .744-.008*d
  return .50
}
function magnitudeCorrection(Mw:number){return Math.pow(10,2.24)/Math.pow(Math.max(Mw,.01),2.56)}
function soilIsPotential(code:string,pi:number|undefined){
  const c=code.trim().toUpperCase().replace(/İ/g,'I')
  if(pi!=null&&pi>=12)return false
  return c==='SA'||c==='GRSA'||c==='SISA'||c==='CLSA'||c==='SM'||c==='SI'||c==='ML'||c==='SP'||c==='SW'||c.includes('KUM')||c.includes('SAND')
}
function mandatoryDts(dts:EarthquakeDesignClass|undefined){return dts==='1'||dts==='1a'||dts==='2'||dts==='2a'}
function mandatorySoilGroup(group:LiquefactionSoilGroup|undefined){return group==='ZD'||group==='ZE'||group==='ZF'}

export function liquefactionProfile(input:LiquefactionProfileInput):LiquefactionProfileResult{
  if(!finite(input.Mw)||input.Mw<=0)throw new Error('Mw geçerli olmalıdır.')
  if(!finite(input.Sds)||input.Sds<0)throw new Error('SDS geçerli olmalıdır.')
  if(!finite(input.gwt)||input.gwt<0)throw new Error('Sıvılaşma değerlendirmesi için geçerli YASS gerekir.')
  const gammaW=input.gammaW??9.81
  if(!finite(gammaW)||gammaW<=0)throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
  const CM=magnitudeCorrection(input.Mw),warnings:string[]=[]
  const mandatoryByProject=mandatoryDts(input.dts)&&mandatorySoilGroup(input.soilGroup)
  if(!input.dts||!input.soilGroup)warnings.push('DTS veya TBDY zemin grubu eksik; 16.6.1 zorunluluğu kesinleştirilemedi.')
  if(input.soilGroup==='ZF')warnings.push('ZF için 16.5.1.3 sahaya özel zemin davranış analizi gerekir; bu ekran o analizi yerine geçmez.')
  const rows=input.spt.filter(x=>finite(x.depth)&&x.depth>=0).sort((a,b)=>a.depth-b.depth).map((record):LiquefactionProfileRow=>{
    const layer=input.layers.find(l=>record.depth>=l.top&&record.depth<l.bottom)
    const stress=stressAtDepth(record.depth,input.layers,input.gwt,gammaW)
    const fineContent=record.fineContent??layer?.finesContent,pi=record.plasticityIndex??layer?.plasticityIndex
    const clayContent=record.clayContent??layer?.clayContent,soil=record.soil??layer?.soil
    const waterContent=record.waterContent
    const npt=calculateSpt({
      nField:record.nField,energyRatio:record.energyRatio,hammerType:record.hammerType,boreholeDiameterMm:record.boreholeDiameterMm,
      sampler:record.sampler,samplerCorrection:record.samplerCorrection,rodLengthM:record.rodLengthM,effectiveStress:stress.sigmaVPrime,fineContent,
      applyOverburden:true,applyDilatancy:false
    })
    const fines=clamp(fineContent??0,0,100),fc=fineContentCorrection(fines),n1_60f=fc.alpha+fc.beta*npt.n1_60
    const saturated=record.depth>input.gwt+1e-9,within20=record.depth<=20+1e-9,potentiallyLiquefiable=saturated&&within20&&soilIsPotential(soil??'',pi)
    const exceptionA=input.dts==='4'&&clayContent!=null&&pi!=null&&clayContent>20&&pi>10,exceptionB=input.dts==='4'&&fineContent!=null&&fineContent>35&&npt.n1_60>20,exemption=exceptionA||exceptionB
    const mandatoryAnalysis=potentiallyLiquefiable&&mandatoryByProject&&!exemption
    const researchDataComplete=fineContent!=null&&pi!=null&&waterContent!=null
    const triggerRequired=mandatoryAnalysis&&researchDataComplete&&npt.n1_60<30
    const postLiquefactionRequired=triggerRequired
    const trace:SptTraceStep[]=[...npt.trace,
      {symbol:'α',title:'İnce dane katsayısı',formula:'α=f(IDI)',value:fc.alpha,note:'IDI='+fines.toFixed(2)+' %'},
      {symbol:'β',title:'İnce dane katsayısı',formula:'β=0.99+IDI^1.5/1000',value:fc.beta},
      {symbol:'(N1)60f',title:'İnce dane düzeltilmiş SPT',formula:'(N1)60f=α+β(N1)60',value:n1_60f}
    ]
    const base={depth:record.depth,soil,fineContent,plasticityIndex:pi,clayContent,waterContent,...stress,ce:npt.ce,cb:npt.cb,cs:npt.cs,cr:npt.cr,cn:npt.cn,n60:npt.n60,n1_60:npt.n1_60,alpha:fc.alpha,beta:fc.beta,n1_60f,rd:rdAtDepth(record.depth),saturated,potentiallyLiquefiable,mandatoryAnalysis,triggerRequired,postLiquefactionRequired}
    if(stress.covered<Math.max(0,record.depth)-1e-9){
      trace.push({symbol:'Kapsama',title:'Katman kapsamı',formula:'ΣΔz=z',value:stress.covered,unit:'m',note:'SPT derinliğine kadar sürekli γ profili yok.'})
      return{...base,status:'VERİ EKSİK',conclusion:'VERİ EKSİK',liquefactionCheck:'not-evaluable',trace}
    }
    if(!saturated||!within20||!potentiallyLiquefiable||exemption){
      const note=!saturated?'YASS üzerinde':!within20?'20 m dışında':!potentiallyLiquefiable?'16.6.4 potansiyel zemin tanımına girmiyor':'DTS=4 istisnası'
      trace.push({symbol:'Kapsam',title:'TBDY kapsam kontrolü',formula:'16.6.1–16.6.6',value:record.depth,note})
      return{...base,status:'ANALİZ GEREKMİYOR',conclusion:'DEĞERLENDİRİLMEDİ',liquefactionCheck:'not-evaluable',trace}
    }
    if(!mandatoryAnalysis){
      trace.push({symbol:'DTS/Zemin',title:'16.6.1 zorunluluğu',formula:'DTS=1/1a/2/2a ve ZD/ZE/ZF',value:0,note:'Proje koşulları zorunlu sıvılaşma ekranını tetiklemedi.'})
      return{...base,status:'ANALİZ GEREKMİYOR',conclusion:'DEĞERLENDİRİLMEDİ',liquefactionCheck:'not-evaluable',trace}
    }
    if(!researchDataComplete){
      trace.push({symbol:'Veri',title:'Zemin araştırması veri seti',formula:'SPT + dane dağılımı + w + Atterberg',value:0,note:'16.6.3 asgari veri seti tamamlanmadan nihai SPT sıvılaşma sonucu üretilmez.'})
      return{...base,status:'VERİ EKSİK',conclusion:'VERİ EKSİK',liquefactionCheck:'not-evaluable',trace}
    }
    if(npt.n1_60>=30){
      trace.push({symbol:'(N1)60',title:'Tetiklenme eşiği',formula:'(N1)60<30',value:npt.n1_60,note:'16.6.5 gereği tetiklenme değerlendirmesi yapılmaz.'})
      return{...base,status:'ANALİZ GEREKLİ',conclusion:'DEĞERLENDİRİLMEDİ',liquefactionCheck:'not-evaluable',trace}
    }
    if(n1_60f>=34){
      trace.push({symbol:'(N1)60f',title:'CRR aralığı',formula:'(N1)60f<34',value:n1_60f,note:'Ek 16B CRR bağıntısı için geçerli aralık dışı.'})
      return{...base,status:'TETİKLENME DEĞERLENDİRMESİ',conclusion:'DEĞERLENDİRİLMEDİ',liquefactionCheck:'not-evaluable',trace}
    }
    const crrM75=1/(34-n1_60f)+n1_60f/135+50/Math.pow(10*n1_60f+45,2)-1/200
    const tauResistance=crrM75*CM*stress.sigmaVPrime
    const tauEarthquake=.65*(.4*input.Sds)*stress.sigmaV*rdAtDepth(record.depth)
    const FS=tauEarthquake>0?tauResistance/tauEarthquake:Infinity
    trace.push(
      {symbol:'CRR7.5',title:'Çevrimsel dayanım oranı',formula:'Ek 16B',value:crrM75},
      {symbol:'CM',title:'Deprem büyüklüğü düzeltmesi',formula:'CM=10^2.24/Mw^2.56',value:CM},
      {symbol:'Rτ',title:'Sıvılaşma direnci',formula:'Rτ=CRR7.5·CM·σ′v0',value:tauResistance,unit:'kPa'},
      {symbol:'rd',title:'Gerilme azaltma katsayısı',formula:'Ek 16B',value:rdAtDepth(record.depth)},
      {symbol:'τdeprem',title:'Deprem kayma gerilmesi',formula:'0.65·(0.4SDS)·σv0·rd',value:tauEarthquake,unit:'kPa'},
      {symbol:'FS',title:'Sıvılaşmaya karşı güvenlik',formula:'Rτ/τdeprem',value:FS,note:'TBDY 16.6.9: FS≥1.10'}
    )
    return{...base,crrM75,CM,tauResistance,tauEarthquake,FS,status:'TETİKLENME DEĞERLENDİRMESİ',conclusion:FS<1.10?'SIVILAŞMA RİSKİ VAR':'SIVILAŞMA RİSKİ YOK',liquefactionCheck:'evaluate',trace}
  })
  if(!input.spt.length)warnings.push('SPT kaydı bulunmadığı için profil hesabı üretilemedi.')
  if(!input.layers.length)warnings.push('Zemin katmanı yok; düşey gerilme hesabı yapılamaz.')
  if(rows.some(x=>x.triggerRequired))warnings.push('16.6.7/16.6.9: sıvılaşma sonrası dayanım/rijitlik kaybı, taşıma gücü kaybı, oturma ve yanal yayılma ayrıca değerlendirilmelidir.')
  return{rows,method:'TBDY 2018 Bölüm 16.6 + Ek 16B SPT tabanlı sıvılaşma değerlendirmesi',source:'TBDY 2018 16.6.1–16.6.10 ve Ek 16B.2–16B.4',warnings,mandatoryByProject,postLiquefactionRequired:rows.some(x=>x.postLiquefactionRequired)}
}