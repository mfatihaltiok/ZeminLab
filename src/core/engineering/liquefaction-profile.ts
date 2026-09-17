import { calculateSpt, fineContentCorrection, type SptEngineInput, type SptTraceStep } from './spt/spt-engine'

export interface LiquefactionSoilLayer { top:number; bottom:number; gamma:number; gammaSat:number; soil?:string }
export interface LiquefactionSptRecord { depth:number; nField:number; fineContent?:number; energyRatio?:number; boreholeDiameterMm?:number; sampler?:SptEngineInput['sampler']; samplerCorrection?:number; rodLengthM?:number }
export interface LiquefactionProfileInput { Mw:number; Sds:number; gwt:number; layers:LiquefactionSoilLayer[]; spt:LiquefactionSptRecord[]; gammaW?:number; applyDilatancy?:boolean }
export interface LiquefactionProfileRow { depth:number; soil?:string; fineContent?:number; sigmaV:number; porePressure:number; sigmaVPrime:number; ce:number; cb:number; cs:number; cr:number; cn:number; n60:number; n1_60:number; alpha:number; beta:number; n1_60f:number; crrM75?:number; CM?:number; tauResistance?:number; rd:number; tauEarthquake?:number; FS?:number; liquefactionCheck:'evaluate'|'not-evaluable'; trace:SptTraceStep[] }
export interface LiquefactionProfileResult { rows:LiquefactionProfileRow[]; method:string; source:string; warnings:string[] }

function stressAtDepth(depth:number,layers:LiquefactionSoilLayer[],gwt:number,gammaW:number){
  let sigmaV=0
  let covered=0
  for(const layer of [...layers].sort((a,b)=>a.top-b.top)){
    const z0=Math.max(0,layer.top),z1=Math.min(depth,layer.bottom)
    if(z1<=z0)continue
    covered+=z1-z0
    const dry=Math.max(0,Math.min(z1,gwt)-z0)
    const sat=Math.max(0,z1-Math.max(z0,gwt))
    sigmaV+=dry*layer.gamma+sat*layer.gammaSat
  }
  const u=Math.max(0,depth-gwt)*gammaW
  return{sigmaV,porePressure:u,sigmaVPrime:Math.max(.01,sigmaV-u),covered}
}

function rdAtDepth(z:number){
  const depth=Math.max(z,0)
  if(depth<=9.15)return 1-0.00765*depth
  if(depth<=23)return 1.174-0.0267*depth
  if(depth<=30)return 0.744-0.008*depth
  return 0.50
}

function magnitudeCorrection(Mw:number){
  return Math.pow(10,2.24)/Math.pow(Math.max(Mw,0.01),2.56)
}

export function liquefactionProfile(input:LiquefactionProfileInput):LiquefactionProfileResult{
  if(!Number.isFinite(input.Mw)||input.Mw<=0)throw new Error('Mw geçerli olmalıdır.')
  if(!Number.isFinite(input.Sds)||input.Sds<0)throw new Error('SDS geçerli olmalıdır.')
  if(!Number.isFinite(input.gwt)||input.gwt<0)throw new Error('YASS derinliği geçerli olmalıdır.')
  if(!Number.isFinite(input.gammaW)||((input.gammaW??9.81)<=0))throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
  const gammaW=input.gammaW??9.81
  const CM=magnitudeCorrection(input.Mw)
  const warnings:string[]=[]

  const rows=[...input.spt].sort((a,b)=>a.depth-b.depth).map((record):LiquefactionProfileRow=>{
    if(record.depth<0)throw new Error('SPT derinliği negatif olamaz.')
    const stress=stressAtDepth(record.depth,input.layers,input.gwt,gammaW)
    const spt=calculateSpt({
      nField:record.nField,energyRatio:record.energyRatio,boreholeDiameterMm:record.boreholeDiameterMm,
      sampler:record.sampler,samplerCorrection:record.samplerCorrection,rodLengthM:record.rodLengthM,
      effectiveStress:stress.sigmaVPrime,fineContent:record.fineContent,applyOverburden:true,
      applyDilatancy:input.applyDilatancy??false
    })
    const fines=Math.max(0,record.fineContent??0)
    const {alpha,beta}=fineContentCorrection(fines)
    const n1_60f=alpha+beta*spt.n1_60
    const rd=rdAtDepth(record.depth)
    const soil=input.layers.find(l=>record.depth>=l.top&&record.depth<l.bottom)?.soil
    const trace:SptTraceStep[]=[...spt.trace,
      {symbol:'α',title:'İnce dane katsayısı',formula:'Ek 16B.2.2',value:alpha,note:`IDI = ${fines.toFixed(2)} %`},
      {symbol:'β',title:'İnce dane katsayısı',formula:'Ek 16B.2.2',value:beta},
      {symbol:'(N₁)₆₀f',title:'İnce dane düzeltilmiş SPT',formula:'(N₁)₆₀f = α + β(N₁)₆₀',value:n1_60f}
    ]

    const base={depth:record.depth,soil,fineContent:record.fineContent,...stress,ce:spt.ce,cb:spt.cb,cs:spt.cs,cr:spt.cr,cn:spt.cn,n60:spt.n60,n1_60:spt.n1_60,alpha,beta,n1_60f,rd}
    if(stress.covered < Math.max(0,record.depth)-1e-9){
      trace.push({symbol:'Kapsama',title:'Katman kapsamı',formula:'ΣΔz = z',value:stress.covered,unit:'m',note:'SPT derinliğinin bir bölümü katman tanımı dışında kaldı; gerilme hesabı eksik veri içeriyor.'})
      return {...base,liquefactionCheck:'not-evaluable',trace}
    }
    if(record.depth <= input.gwt + 1e-9){
      trace.push({symbol:'YASS',title:'Doygunluk kontrolü',formula:'z > YASS',value:input.gwt,unit:'m',note:'SPT noktası YASS altında olmadığı için sıvılaşma hesabı uygulanmadı.'})
      return {...base,liquefactionCheck:'not-evaluable',trace}
    }
    if(spt.n1_60>=30 || n1_60f>=30){
      trace.push({symbol:'(N₁)₆₀',title:'Tetikleme sınırı',formula:'(N₁)₆₀ < 30',value:spt.n1_60,note:'TBDY 2018 16.6.5 kapsamında SPT tabanlı sıvılaşma değerlendirmesi için eşik sağlanmadı.'})
      return {...base,liquefactionCheck:'not-evaluable',trace}
    }

    const crrRaw=1/(34-n1_60f)+n1_60f/135+50/Math.pow(10*n1_60f+45,2)-1/200
    const crrM75=Math.min(2,Math.max(0,crrRaw))
    const tauResistance=crrM75*CM*stress.sigmaVPrime
    const tauEarthquake=.65*(.4*input.Sds)*stress.sigmaV*rd
    const FS=tauResistance/Math.max(tauEarthquake,1e-9)
    trace.push(
      {symbol:'CRR₇.₅',title:'Çevrimsel dayanım oranı',formula:'Ek 16B.3.2',value:crrM75,note:crrRaw>2?'CRR değeri 2.0 üst sınırına sınırlandırıldı.':undefined},
      {symbol:'Cᴹ',title:'Deprem büyüklüğü düzeltmesi',formula:'Cᴹ = 10²·²⁴ / Mʷ²·⁵⁶',value:CM},
      {symbol:'τᴿ',title:'Sıvılaşma direnci',formula:'τᴿ = CRR₇.₅·Cᴹ·σ′ᵥ₀',value:tauResistance,unit:'kPa'},
      {symbol:'rᵈ',title:'Gerilme azaltma katsayısı',formula:'Ek 16B.4.1, parçalı bağıntı',value:rd},
      {symbol:'τdeprem',title:'Deprem kayma gerilmesi',formula:'τdeprem = 0.65·(0.4SDS)·σᵥ₀·rᵈ',value:tauEarthquake,unit:'kPa'},
      {symbol:'FS',title:'Sıvılaşmaya karşı güvenlik',formula:'FS = τᴿ/τdeprem',value:FS,note:'TBDY 2018 güvenlik koşulu: FS ≥ 1.10.'}
    )
    return {...base,crrM75,CM,tauResistance,tauEarthquake,FS,liquefactionCheck:'evaluate',trace}
  })

  if(!input.spt.length)warnings.push('SPT kaydı bulunmadığı için profil hesabı üretilemedi.')
  if(!input.layers.length)warnings.push('Zemin katmanı tanımlanmamış; düşey gerilme hesabı üretilemez.')
  if(input.spt.some(x=>x.fineContent==null))warnings.push('Bazı SPT noktalarında ince dane içeriği yok; IDI = 0 kabul edilmiştir. Laboratuvar verisi geldiğinde satırlar yeniden hesaplanmalıdır.')
  if(input.spt.some(x=>x.depth<=input.gwt))warnings.push('YASS üzerinde kalan SPT noktaları sıvılaşma hesabına alınmadı.')
  return{rows,method:'TBDY 2018 Ek 16B SPT tabanlı sıvılaşma değerlendirmesi',source:'TBDY 2018 Ek 16B.2–16B.4; AFAD yayımlı TBDY 2018. CM, rd, SPT düzeltmeleri ve FS koşulu yönetmelik bağıntılarıyla izlenebilir biçimde hesaplanır.',warnings}
}
