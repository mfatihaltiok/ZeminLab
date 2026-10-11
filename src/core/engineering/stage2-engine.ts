import { bearingCapacity as authoritativeBearing } from './calculation-engine'
import { calculateSurfaceFoundation } from './surface-foundation'

export type Stage2BearingMethod='Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export type Stage2BearingDesign='classical-allowable'|'tbdy-2018'
export type Stage2SettlementMethod='elastic'|'2:1'|'janbu'|'schmertmann'|'consolidation'

export interface Stage2Step{symbol:string;title:string;formula:string;value?:number;unit?:string;source?:string;note?:string}
export interface Stage2Result<T>{value:T;steps:Stage2Step[];method:string;source:string;warnings:string[]}

export interface BearingLayer{thickness:number;c:number;phi:number;gamma:number;gammaSat?:number}
export interface Stage2BearingInput{
  B:number;L:number;Df:number;gamma:number;gammaSat?:number;c:number;phi:number;FS?:number;method:Stage2BearingMethod;design?:Stage2BearingDesign
  waterTableDepth?:number;surcharge?:number;loadV?:number;loadH?:number;momentX?:number;momentY?:number;soilSlope?:number;baseSlope?:number
  layers?:BearingLayer[];undrainedCu?:number
}

export function stage2BearingCapacity(i:Stage2BearingInput):Stage2Result<any>{
  const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
  for(const [name,value] of Object.entries({B:i.B,L:i.L,Df:i.Df,gamma:i.gamma,c:i.c,phi:i.phi})){
    if(!finite(value))throw new Error(`${name} sonlu bir sayı olmalıdır.`)
  }
  if(i.B<=0||i.L<=0||i.Df<0||i.gamma<=0||i.c<0||i.phi<0||i.phi>50)throw new Error('Taşıma gücü girdileri fiziksel sınırlar içinde olmalıdır: B,L,γ > 0; Df,c ≥ 0; 0° ≤ φ ≤ 50°.')
  for(const [name,value] of Object.entries({gammaSat:i.gammaSat,FS:i.FS,waterTableDepth:i.waterTableDepth,surcharge:i.surcharge,loadV:i.loadV,loadH:i.loadH,momentX:i.momentX,momentY:i.momentY,soilSlope:i.soilSlope,baseSlope:i.baseSlope,undrainedCu:i.undrainedCu})){
    if(value!==undefined&&!finite(value))throw new Error(`${name} sonlu bir sayı olmalıdır.`)
  }
  if(i.gammaSat!==undefined&&i.gammaSat<=0)throw new Error('γsat pozitif olmalıdır.')
  if(i.FS!==undefined&&i.FS<=0)throw new Error('FS pozitif olmalıdır.')
  if(i.waterTableDepth!==undefined&&i.waterTableDepth<0)throw new Error('YASS derinliği negatif olamaz.')
  if((i.loadV??0)<0)throw new Error('Düşey yük negatif olamaz.')
  if(i.undrainedCu!==undefined&&i.undrainedCu<0)throw new Error('cu negatif olamaz.')
  if(Math.abs(i.soilSlope??0)>=90||Math.abs(i.baseSlope??0)>=90)throw new Error('Arazi ve temel tabanı eğimleri 90° altında olmalıdır.')
  if(i.layers?.some(l=>![l.thickness,l.c,l.phi,l.gamma].every(finite)||l.thickness<=0||l.c<0||l.phi<0||l.phi>50||l.gamma<=0||(l.gammaSat!==undefined&&(!finite(l.gammaSat)||l.gammaSat<=0))))throw new Error('Tabakalı taşıma gücü girdilerinde kalınlık, c, φ, γ veya γsat geçersiz.')
  const V=i.loadV??0,H=Math.abs(i.loadH??0),design=i.design??'classical-allowable',warnings:string[]=[]
  if(design==='tbdy-2018'){
    const r=calculateSurfaceFoundation({
      B:i.B,L:i.L,Df:i.Df,gamma1:i.gamma,gamma2:i.gammaSat??i.gamma,c:i.c,phi:i.phi,
      verticalLoad:V,horizontalLoad:H,momentX:i.momentX??0,momentY:i.momentY??0,
      groundSlope:i.soilSlope??0,baseSlope:i.baseSlope??0,resistanceFactor:1.4,method:'TBDY-2018',
      groundwaterDepth:i.waterTableDepth,undrainedCu:i.undrainedCu,
      layers:i.layers?.map((x,idx)=>({topDepth:i.Df+i.layers!.slice(0,idx).reduce((a,y)=>a+y.thickness,0),bottomDepth:i.Df+i.layers!.slice(0,idx+1).reduce((a,y)=>a+y.thickness,0),gamma:x.gamma,gammaSat:x.gammaSat??x.gamma,cohesion:x.c,phi:x.phi}))
    })
    return{
      value:{Nq:r.Nq,Nc:r.Nc,Ngamma:r.Ngamma,sc:r.sc,sq:r.sq,sgamma:r.sg,dc:r.dc,dq:r.dq,dgamma:r.dg,ic:r.ic,iq:r.iq,igamma:r.ig,characteristic:r.qk,designResistance:r.qt,allowableGross:r.qk/Math.max(i.FS??3,1e-9),qApplied:r.qo,BEffective:r.Be,LEffective:r.Le,ex:r.ex,ey:r.ey,qSurcharge:r.surcharge,resistanceFactor:1.4},
      method:'TBDY 2018',source:r.source,warnings:r.warnings,steps:r.steps
    }
  }
  const r=authoritativeBearing({B:i.B,L:i.L,Df:i.Df,gamma:i.gamma,c:i.c,phi:i.phi,FS:Math.max(i.FS??3,.1),method:i.method})
  if((i.momentX??0)!==0||(i.momentY??0)!==0)warnings.push('Klasik taşıma gücü API merkezi düşey yük varsayar; momentli temas için TBDY motoru kullanılmalıdır.')
  return{
    value:{Nq:r.value.Nq,Nc:r.value.Nc,Ngamma:r.value.Ngamma,sc:r.value.sc,sq:r.value.sq,sgamma:r.value.sg,dc:r.value.dc,dq:r.value.dq,dgamma:r.value.dg,ic:r.value.ic,iq:r.value.iq,igamma:r.value.ig,characteristic:r.value.ultimate,designResistance:undefined,allowableGross:r.value.allowableGross,qApplied:V/Math.max(i.B*i.L,1e-9),BEffective:i.B,LEffective:i.L,ex:0,ey:0,qSurcharge:i.gamma*i.Df,resistanceFactor:undefined},
    method:i.method,source:r.source,warnings,steps:r.steps
  }
}

export interface Stage2SettlementLayer{
  thickness:number;sigmaV0:number;deltaSigma:number;Es?:number;nu?:number;M?:number;mv?:number;Cc?:number;e0?:number;Cr?:number;sigmaPc?:number;Iz?:number
}
export interface Stage2SettlementInput{
  B:number;L?:number;q:number;qNet?:number;layers:Stage2SettlementLayer[];method?:Stage2SettlementMethod;schmertmannC1?:number;schmertmannC2?:number;timeYears?:number
}

export function stage2Settlement(i:Stage2SettlementInput):Stage2Result<any>{
  const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
  for(const [name,value] of Object.entries({B:i.B,q:i.q}))if(!finite(value))throw new Error(`${name} sonlu bir sayı olmalıdır.`)
  const L=i.L??i.B,qNet=i.qNet??i.q,method=i.method??'elastic'
  if(!finite(L)||L<=0||i.B<=0)throw new Error('Temel B ve L boyutları pozitif ve sonlu olmalıdır.')
  if(i.q<0||!finite(qNet)||qNet<0)throw new Error('q ve net temel basıncı negatif olamaz; sonlu değer girilmelidir.')
  if(!Array.isArray(i.layers)||i.layers.length===0)throw new Error('Oturma hesabı için en az bir zemin tabakası tanımlanmalıdır.')
  const B=i.B,q=i.q
  if(!['elastic','2:1','janbu','schmertmann','consolidation'].includes(method))throw new Error('Desteklenmeyen oturma yöntemi.')
  if(i.schmertmannC1!==undefined&&(!finite(i.schmertmannC1)||i.schmertmannC1<=0))throw new Error('Schmertmann C1 pozitif ve sonlu olmalıdır.')
  if(i.schmertmannC2!==undefined&&(!finite(i.schmertmannC2)||i.schmertmannC2<=0))throw new Error('Schmertmann C2 pozitif ve sonlu olmalıdır.')
  for(const [index,layer] of i.layers.entries()){
    if(!finite(layer.thickness)||layer.thickness<=0)throw new Error(`Katman ${index+1}: kalınlık pozitif ve sonlu olmalıdır.`)
    for(const key of ['sigmaV0','deltaSigma'] as const)if(!finite(layer[key]))throw new Error(`Katman ${index+1}: ${key} sonlu olmalıdır.`)
    if(layer.deltaSigma<0)throw new Error(`Katman ${index+1}: Δσ negatif olamaz.`)
    if(layer.Es!==undefined&&(!finite(layer.Es)||layer.Es<=0))throw new Error(`Katman ${index+1}: Es pozitif olmalıdır.`)
    if(layer.nu!==undefined&&(!finite(layer.nu)||layer.nu<=-1||layer.nu>=0.5))throw new Error(`Katman ${index+1}: Poisson oranı -1 < ν < 0.5 olmalıdır.`)
    if(layer.M!==undefined&&(!finite(layer.M)||layer.M<=0))throw new Error(`Katman ${index+1}: Janbu M modülü pozitif olmalıdır.`)
    if(layer.mv!==undefined&&(!finite(layer.mv)||layer.mv<0))throw new Error(`Katman ${index+1}: mv negatif olamaz.`)
    if(layer.Cc!==undefined&&(!finite(layer.Cc)||layer.Cc<0))throw new Error(`Katman ${index+1}: Cc negatif olamaz.`)
    if(layer.Cr!==undefined&&(!finite(layer.Cr)||layer.Cr<0))throw new Error(`Katman ${index+1}: Cr negatif olamaz.`)
    if(layer.e0!==undefined&&(!finite(layer.e0)||layer.e0<=-1))throw new Error(`Katman ${index+1}: e0 > -1 olmalıdır.`)
    if(layer.sigmaV0<=0&&method==='consolidation')throw new Error(`Katman ${index+1}: konsolidasyon için σ′v0 pozitif olmalıdır.`)
    if(layer.sigmaPc!==undefined&&(!finite(layer.sigmaPc)||layer.sigmaPc<=0))throw new Error(`Katman ${index+1}: σ′pc pozitif olmalıdır.`)
    if(layer.Iz!==undefined&&(!finite(layer.Iz)||layer.Iz<0))throw new Error(`Katman ${index+1}: Iz negatif olamaz.`)
  }
  const warnings:string[]=[]
  if(method==='schmertmann'&&i.schmertmannC1==null)warnings.push('Schmertmann C1 verilmedi; 1.0 kullanılmadı, sonuç yalnız verilen katsayılarla üretilebilir.')
  const C1=i.schmertmannC1,C2=i.schmertmannC2
  const results:any[]=[]
  for(const [index,layer] of i.layers.entries()){
    const H=layer.thickness,zmid=H/2,ds=method==='2:1'?qNet*B*L/((B+zmid)*(L+zmid)):layer.deltaSigma
    let s=0,type='none'
    if(H>0&&ds>0){
      if(method==='elastic'||method==='2:1'){
        const E=layer.Es
        if(E!=null&&Number.isFinite(E)&&E>0){const nu=layer.nu??0;s=ds*H*(1-nu*nu)/E;type=method==='elastic'?'elastic':'2:1 + elastic'}else warnings.push('Katman '+(index+1)+': Es eksik.')
      }else if(method==='janbu'){
        const M=layer.M
        if(M!=null&&Number.isFinite(M)&&M>0){s=ds*H/M;type='Janbu M integration'}else warnings.push('Katman '+(index+1)+': Janbu için açık M parametresi eksik; Es otomatik olarak M yerine kullanılmaz.')
      }else if(method==='schmertmann'){
        const E=layer.Es
        const Iz=layer.Iz
        if(C1!=null&&C2!=null&&E!=null&&E>0&&Iz!=null)s=C1*C2*qNet*Iz*H/E,type='Schmertmann'
        else warnings.push('Katman '+(index+1)+': Schmertmann için C1,C2,Es,Iz birlikte verilmelidir.')
      }else{
        const sigma0=layer.sigmaV0,sigma1=sigma0+ds
        if(layer.mv!=null&&layer.mv>=0){s=H*layer.mv*ds;type='oedometer'}
        else if(layer.Cc!=null&&layer.e0!=null&&layer.e0>-1){
          const pc=Math.max(layer.sigmaPc??sigma0,sigma0),Cr=layer.Cr??layer.Cc
          s=sigma1<=pc?H*Cr/(1+layer.e0)*Math.log10(sigma1/sigma0):H*Cr/(1+layer.e0)*Math.log10(pc/sigma0)+H*layer.Cc/(1+layer.e0)*Math.log10(sigma1/pc),type='oedometer'
        }else warnings.push('Katman '+(index+1)+': mv veya Cc/e0 eksik.')
      }
    }
    results.push({index,thickness:H,zmid,deltaSigma:ds,settlement:Math.max(0,s),type})
  }
  const immediate=results.filter(x=>x.type!=='oedometer').reduce((a,x)=>a+x.settlement,0)
  const consolidation=results.filter(x=>x.type==='oedometer').reduce((a,x)=>a+x.settlement,0)
  return{value:{immediate,consolidation,total:immediate+consolidation,layerResults:results,C1,C2},method,source:'Stage2 compatibility facade; authoritative geotechnical engines are preferred.',warnings,steps:[
    {symbol:'Δσ',title:'Katman gerilme artışı',formula:method==='2:1'?'qBL/[(B+z)(L+z)]':'girilen katman Δσ',unit:'kPa'},
    {symbol:'si',title:'Ani oturma',formula:'Katman integrasyonu',value:immediate,unit:'m'},
    {symbol:'sc',title:'Konsolidasyon',formula:'mv·Δσ·H veya Cc/Cr',value:consolidation,unit:'m'},
    {symbol:'st',title:'Toplam',formula:'st=si+sc',value:immediate+consolidation,unit:'m'}
  ]}
}
