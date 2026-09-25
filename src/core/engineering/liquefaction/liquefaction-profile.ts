import { calculateSpt, fineContentCorrection, type SptEngineInput, type SptTraceStep } from '../spt/spt-engine'
import type { EarthquakeDesignClass } from '../../models/project'

export interface LiquefactionSoilLayer{
  top:number;bottom:number;gamma:number;gammaSat:number;soil?:string;finesContent?:number;plasticityIndex?:number;clayContent?:number
}
export interface LiquefactionSptRecord{
  depth:number;nField:number;fineContent?:number;energyRatio?:number;hammerType?:SptEngineInput['hammerType'];boreholeDiameterMm?:number
  sampler?:SptEngineInput['sampler'];samplerCorrection?:number;rodLengthM?:number;plasticityIndex?:number;waterContent?:number;clayContent?:number;soil?:string
}
export interface LiquefactionProfileInput{
  Mw:number;Sds:number;gwt:number;layers:LiquefactionSoilLayer[];spt:LiquefactionSptRecord[];gammaW?:number;applyDilatancy?:boolean;dts?:EarthquakeDesignClass
}
export interface LiquefactionProfileRow{
  depth:number;soil?:string;fineContent?:number;plasticityIndex?:number;clayContent?:number;waterContent?:number
  sigmaV:number;porePressure:number;sigmaVPrime:number;ce:number;cb:number;cs:number;cr:number;cn:number;n60:number;n1_60:number;alpha:number;beta:number;n1_60f:number
  crrM75?:number;CM?:number;tauResistance?:number;rd:number;tauEarthquake?:number;FS?:number
  saturated:boolean;potentiallyLiquefiable:boolean;mandatoryAnalysis:boolean;triggerRequired:boolean;postLiquefactionRequired:boolean
  status:'ANALİZ GEREKLİ'|'ANALİZ GEREKMİYOR'|'TETİKLENME DEĞERLENDİRMESİ'|'VERİ EKSİK'
  liquefactionCheck:'evaluate'|'not-evaluable';trace:SptTraceStep[]
}
export interface LiquefactionProfileResult{rows:LiquefactionProfileRow[];method:string;source:string;warnings:string[];mandatoryByProject:boolean;postLiquefactionRequired:boolean}

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
  const depth=Math.max(z,0)
  if(depth<=9.15)return 1-.00765*depth
  if(depth<=23)return 1.174-.0267*depth
  if(depth<=30)return .744-.008*depth
  return .50
}
function magnitudeCorrection(Mw:number){return Math.pow(10,2.24)/Math.pow(Math.max(Mw,.01),2.56)}
function soilIsPotential(code:string,pi:number|undefined){
  const c=code.trim().toUpperCase().replace(/İ/g,'I')
  if(pi!=null&&pi>=12)return false
  return c==='SA'||c==='GRSA'||c==='SISA'||c==='CLSA'||c==='SM'||c==='SI'||c.includes('KUM')||c.includes('SAND')||c==='SP'||c==='SW'||c==='ML'
}
function mandatoryForDts(dts:EarthquakeDesignClass|undefined){return dts==='1'||dts==='1a'||dts==='2'||dts==='2a'}

export function liquefactionProfile(input:LiquefactionProfileInput):LiquefactionProfileResult{
  if(!Number.isFinite(input.Mw)||input.Mw<=0)throw new Error('Mw geçerli olmalıdır.')
  if(!Number.isFinite(input.Sds)||input.Sds<0)throw new Error('SDS geçerli olmalıdır.')
  if(!Number.isFinite(input.gwt)||input.gwt<0)throw new Error('Sıvılaşma değerlendirmesi için geçerli YASS derinliği gereklidir.')
  const gammaW=input.gammaW??9.81
  if(!Number.isFinite(gammaW)||gammaW<=0)throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
  const CM=magnitudeCorrection(input.Mw),warnings:string[]=[]
  const mandatoryByProject=mandatoryForDts(input.dts)
  if(input.dts===undefined)warnings.push('DTS tanımlı değil; 16.6.1 kapsam zorunluluğu otomatik belirlenemedi.')
  const rows=[...input.spt].filter(x=>finite(x.depth)&&x.depth>=0).sort((a,b)=>a.depth-b.depth).map((record):LiquefactionProfileRow=>{
    const layer=input.layers.find(l=>record.depth>=l.top&&record.depth<l.bottom)
    const stress=stressAtDepth(record.depth,input.layers,input.gwt,gammaW)
    const fineContent=record.fineContent??layer?.finesContent
    const pi=record.plasticityIndex??layer?.plasticityIndex
    const clayContent=record.clayContent??layer?.clayContent
    const soil=record.soil??layer?.soil
    const npt=calculateSpt({
      nField:record.nField,energyRatio:record.energyRatio,hammerType:record.hammerType,boreholeDiameterMm:record.boreholeDiameterMm,
      sampler:record.sampler,samplerCorrection:record.samplerCorrection,rodLengthM:record.rodLengthM,effectiveStress:stress.sigmaVPrime,fineContent,
      applyOverburden:true,applyDilatancy:false
    })
    const fines=clamp(fineContent??0,0,100),{alpha,beta}=fineContentCorrection(fines),n1_60f=alpha+beta*npt.n1_60
    const saturated=record.depth>input.gwt+1e-9
    const within20=record.depth<=20+1e-9
    const potentiallyLiquefiable=saturated&&within20&&soilIsPotential(soil??'',pi)
    const dt4ExceptionA=input.dts==='4'&&clayContent!=null&&pi!=null&&clayContent>20&&pi>10
    const dt4ExceptionB=input.dts==='4'&&fineContent!=null&&fineContent>35&&npt.n1_60>20
    const exemption=dt4ExceptionA||dt4ExceptionB
    const mandatoryAnalysis=potentiallyLiquefiable&&mandatoryByProject&&!exemption
    const triggerRequired=potentiallyLiquefiable&&!exemption&&npt.n1_60<30
    const postLiquefactionRequired=triggerRequired
    const trace:SptTraceStep[]=[...npt.trace,
      {symbol:'α',title:'İnce dane katsayısı',formula:'Ek 16B.2.2',value:alpha,note:'IDI='+fines.toFixed(2)+' %'},
      {symbol:'β',title:'İnce dane katsayısı',formula:'β=0.99+IDI^1.5/1000',value:beta},
      {symbol:'(N1)60f',title:'İnce dane düzeltilmiş SPT',formula:'(N1)60f=α+β(N1)60',value:n1_60f}
    ]
    const base={depth:record.depth,soil,fineContent:record.fineContent??layer?.finesContent,plasticityIndex:pi,clayContent,waterContent:record.waterContent,...stress,ce:npt.ce,cb:npt.cb,cs:npt.cs,cr:npt.cr,cn:npt.cn,n60:npt.n60,n1_60:npt.n1_60,alpha,beta,n1_60f,rd:rdAtDepth(record.depth),saturated,potentiallyLiquefiable,mandatoryAnalysis,triggerRequired,postLiquefactionRequired}
    if(stress.covered<Math.max(0,record.depth)-1e-9){
      trace.push({symbol:'Kapsama',title:'Katman kapsamı',formula:'ΣΔz=z',value:stress.covered,unit:'m',note:'SPT derinliğine kadar sürekli γ profili yok.'})
      return{...base,status:'VERİ EKSİK',liquefactionCheck:'not-evaluable',trace}
    }
    if(!saturated){
      trace.push({symbol:'YASS',title:'Doygunluk',formula:'z>YASS',value:input.gwt,unit:'m',note:'SPT noktası YASS üzerinde; 16.6.2 kapsamında sıvılaşma değerlendirilmez.'})
      return{...base,status:'ANALİZ GEREKMİYOR',liquefactionCheck:'not-evaluable',trace}
    }
    if(!within20){
      trace.push({symbol:'z',title:'Derinlik sınırı',formula:'z≤20 m',value:record.depth,unit:'m',note:'16.6.2 kapsamı dışında.'})
      return{...base,status:'ANALİZ GEREKMİYOR',liquefactionCheck:'not-evaluable',trace}
    }
    if(!potentiallyLiquefiable){
      trace.push({symbol:'Potansiyel',title:'Potansiyel sıvılaşabilir zemin',formula:'16.6.4 + PI<12',value:pi??0,note:'Zemin tanımı/PI, 16.6.4 kapsamına girmiyor.'})
      return{...base,status:'ANALİZ GEREKMİYOR',liquefactionCheck:'not-evaluable',trace}
    }
    if(exemption){
      trace.push({symbol:'DTS4',title:'16.6.6 istisnası',formula:'DTS=4 ve istisna koşulu',value:input.dts==='4'?4:0,note:dt4ExceptionA?'kil içeriği >20% ve PI>10': 'FC>35% ve (N1)60>20'})
      return{...base,status:'ANALİZ GEREKMİYOR',liquefactionCheck:'not-evaluable',trace}
    }
    if(npt.n1_60>=30){
      trace.push({symbol:'(N1)60',title:'SPT tetiklenme eşiği',formula:'(N1)60<30',value:npt.n1_60,note:'16.6.5 gereği tetiklenme değerlendirmesi yapılmaz.'})
      return{...base,status:mandatoryAnalysis?'ANALİZ GEREKLİ':'ANALİZ GEREKMİYOR',liquefactionCheck:'not-evaluable',trace}
    }
    if(n1_60f>=34){
      trace.push({symbol:'(N1)60f',title:'CRR üst sınırı',formula:'(N1)60f<34',value:n1_60f,note:'Ek 16B.3.2 kapsamında CRR bağıntısı uygulanmaz.'})
      return{...base,status:'TETİKLENME DEĞERLENDİRMESİ',liquefactionCheck:'not-evaluable',trace}
    }
    const crrM75=1/(34-n1_60f)+n1_60f/135+50/Math.pow(10*n1_60f+45,2)-1/200
    const tauResistance=crrM75*CM*stress.sigmaVPrime
    const tauEarthquake=.65*(.4*input.Sds)*stress.sigmaV*rdAtDepth(record.depth)
    const FS=tauEarthquake>0?tauResistance/tauEarthquake:Infinity
    trace.push(
      {symbol:'CRR7.5',title:'Çevrimsel dayanım oranı',formula:'Ek 16B.3.2',value:crrM75},
      {symbol:'CM',title:'Deprem büyüklüğü düzeltmesi',formula:'CM=10^2.24/Mw^2.56',value:CM},
      {symbol:'Rτ',title:'Sıvılaşma direnci',formula:'Rτ=CRR7.5·CM·σ′v0',value:tauResistance,unit:'kPa'},
      {symbol:'rd',title:'Gerilme azaltma katsayısı',formula:'Ek 16B.4.1',value:rdAtDepth(record.depth)},
      {symbol:'τdeprem',title:'Deprem kayma gerilmesi',formula:'τdeprem=0.65·(0.4SDS)·σv0·rd',value:tauEarthquake,unit:'kPa'},
      {symbol:'FS',title:'Sıvılaşmaya karşı güvenlik',formula:'Rτ/τdeprem',value:FS,note:'TBDY 16.6.9: FS≥1.10'}
    )
    return{...base,crrM75,CM,tauResistance,tauEarthquake:tauEarthquake,FS,status:'TETİKLENME DEĞERLENDİRMESİ',liquefactionCheck:'evaluate',trace}
  })
  if(!input.spt.length)warnings.push('SPT kaydı bulunmadığı için profil hesabı üretilemedi.')
  if(!input.layers.length)warnings.push('Zemin katmanı yok; düşey gerilme hesabı yapılamaz.')
  if(input.spt.some(x=>x.fineContent==null))warnings.push('Bazı SPT noktalarında ince dane içeriği yok; IDI geçici olarak 0 kabul edildi. Nihai raporda laboratuvar verisiyle yenilenmelidir.')
  if(rows.some(x=>x.triggerRequired))warnings.push('16.6.7 gereği sıvılaşma sonrası dayanım/rijitlik kaybı, oturma, yanal yayılma ve olası taşıma gücü kaybı ayrıca değerlendirilmelidir.')
  return{rows,method:'TBDY 2018 Bölüm 16.6 + Ek 16B SPT tabanlı sıvılaşma değerlendirmesi',source:'TBDY 2018 16.6.1–16.6.10 ve Ek 16B.2–16B.4',warnings,mandatoryByProject,postLiquefactionRequired:rows.some(x=>x.postLiquefactionRequired)}
}