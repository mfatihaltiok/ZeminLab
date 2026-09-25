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
  const V=Math.max(0,i.loadV??0),H=Math.abs(i.loadH??0),design=i.design??'classical-allowable',warnings:string[]=[]
  if(design==='tbdy-2018'){
    const r=calculateSurfaceFoundation({
      B:i.B,L:i.L,Df:i.Df,gamma1:i.gamma,gamma2:i.gammaSat??i.gamma,c:i.c,phi:i.phi,
      verticalLoad:V,horizontalLoad:H,momentX:i.momentX??0,momentY:i.momentY??0,
      groundSlope:i.soilSlope??0,baseSlope:i.baseSlope??0,resistanceFactor:1.4,method:'TBDY-2018',
      groundwaterDepth:i.waterTableDepth,undrainedCu:i.undrainedCu,
      layers:i.layers?.map((x,idx)=>({topDepth:i.Df+i.layers!.slice(0,idx).reduce((a,y)=>a+y.thickness,0),bottomDepth:i.Df+i.layers!.slice(0,idx+1).reduce((a,y)=>a+y.thickness,0),gamma:x.gamma,gammaSat:x.gammaSat??x.gamma,cohesion:x.c,phi:x.phi}))
    })
    return{
      value:{Nq:r.Nq,Nc:r.Nc,Ngamma:r.Ngamma,sc:r.sc,sq:r.sq,sgamma:r.sg,dc:r.dc,dq:r.dq,dgamma:r.dg,ic:r.ic,iq:r.iq,igamma:r.ig,characteristic:r.qk,designResistance:r.qt,allowableGross:i.FS==null?undefined:r.qk/Math.max(i.FS,1e-9),qApplied:r.qo,BEffective:r.Be,LEffective:r.Le,ex:r.ex,ey:r.ey,qSurcharge:r.surcharge,resistanceFactor:1.4},
      method:'TBDY 2018',source:r.source,warnings:r.warnings,steps:r.steps
    }
  }
  if(i.FS==null||!Number.isFinite(i.FS)||i.FS<=0)throw new Error('Klasik taşıma gücü için FS açıkça girilmelidir.')
  const r=authoritativeBearing({B:i.B,L:i.L,Df:i.Df,gamma:i.gamma,c:i.c,phi:i.phi,FS:i.FS,method:i.method})
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
  const B=Math.max(i.B,0),L=Math.max(i.L??i.B,0),qGross=Math.max(i.q,0),qNet=i.qNet==null?undefined:Math.max(i.qNet,0),q=qNet??qGross,method=i.method??'elastic'
  const warnings:string[]=[]
  if(B<=0||L<=0)warnings.push('B ve L pozitif olmalıdır.')
  if(!i.layers.length)warnings.push('Katman tanımlanmadı.')
  if(method==='schmertmann'&&(i.schmertmannC1==null||i.schmertmannC2==null))warnings.push('Schmertmann C1 ve C2 açıkça verilmelidir; varsayılan 1.0 kullanılmaz.')
  const C1=i.schmertmannC1,C2=i.schmertmannC2
  if(method==='elastic'||method==='2:1') {
    for(const [index,layer] of i.layers.entries()) if(layer.Es==null||!Number.isFinite(layer.Es)||layer.Es<=0) warnings.push('Katman '+(index+1)+': Es eksik.'); else if(layer.nu==null) warnings.push('Katman '+(index+1)+': ν eksik; varsayılan 0.30 kullanılmaz.')
  }
  const results:any[]=[],missing=false
  for(const [index,layer] of i.layers.entries()){
    const H=Math.max(0,layer.thickness),zmid=Math.max(0,H/2),ds=method==='2:1'?q*B*L/Math.max((B+zmid)*(L+zmid),1e-9):Math.max(0,layer.deltaSigma)
    let s=0,type='none'
    if(H>0&&ds>0){
      if(method==='elastic'||method==='2:1'){
        const E=layer.Es
        if(E!=null&&Number.isFinite(E)&&E>0&&layer.nu!=null&&Number.isFinite(layer.nu)&&layer.nu>-1&&layer.nu<.5){const nu=layer.nu;s=ds*H*(1-nu*nu)/E;type=method==='elastic'?'elastic':'2:1 + elastic'}else warnings.push('Katman '+(index+1)+': Es eksik.')
      }else if(method==='janbu'){
        const M=layer.M
        if(M!=null&&Number.isFinite(M)&&M>0){s=ds*H/M;type='Janbu M integration'}else warnings.push('Katman '+(index+1)+': Janbu M eksik; Es otomatik olarak M kabul edilmez.')
      }else if(method==='schmertmann'){
        const E=layer.Es
        const Iz=layer.Iz
        if(C1!=null&&C2!=null&&E!=null&&E>0&&Iz!=null)s=C1*C2*q*Iz*H/E,type='Schmertmann'
        else warnings.push('Katman '+(index+1)+': Schmertmann için C1,C2,Es,Iz birlikte verilmelidir.')
      }else{
        const sigma0=Math.max(layer.sigmaV0,1e-6),sigma1=sigma0+ds
        if(layer.mv!=null&&layer.mv>=0){s=H*layer.mv*ds;type='oedometer'}
        else if(layer.Cc!=null&&layer.e0!=null&&layer.e0>-1){
          const pc=Math.max(layer.sigmaPc??sigma0,sigma0),Cr=Math.max(0,layer.Cr??layer.Cc)
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
