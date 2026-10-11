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
  const V=i.loadV??0,H=Math.abs(i.loadH??0),design=i.design??'classical-allowable',warnings:string[]=[]
  const required=[i.B,i.L,i.Df,i.gamma,i.c,i.phi]
  if(required.some(x=>!Number.isFinite(x)))throw new Error('Taşıma gücü girdileri sonlu sayılar olmalıdır.')
  if(i.B<=0||i.L<=0||i.Df<0||i.gamma<=0||i.c<0||i.phi<0||i.phi>50)throw new Error('Taşıma gücü girdileri fiziksel sınırlar dışında.')
  if(design!=='classical-allowable'&&design!=='tbdy-2018')throw new Error('Desteklenmeyen taşıma gücü tasarım yolu.')
  if(V<0||!Number.isFinite(V)||!Number.isFinite(H))throw new Error('Düşey ve yatay yükler geçerli olmalıdır.')
  if(i.FS!=null&&(!Number.isFinite(i.FS)||i.FS<=0))throw new Error('Güvenlik katsayısı pozitif olmalıdır.')
  if(i.waterTableDepth!=null&&(!Number.isFinite(i.waterTableDepth)||i.waterTableDepth<0))throw new Error('YASS derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(i.surcharge!=null&&(!Number.isFinite(i.surcharge)||i.surcharge<0))throw new Error('Ek sürşarj negatif olmayan sonlu bir değer olmalıdır.')
  if(i.waterTableDepth!=null&&i.waterTableDepth<=i.Df+i.B&&i.gammaSat==null)throw new Error('YASS temel etki bölgesindeyse γsat girilmelidir.')
  if(i.gammaSat!=null&&(!Number.isFinite(i.gammaSat)||i.gammaSat<=9.80665))throw new Error('γsat, su birim hacim ağırlığından büyük ve sonlu olmalıdır.')
  if(i.layers?.some(x=>!Number.isFinite(x.thickness)||x.thickness<=0||!Number.isFinite(x.c)||x.c<0||!Number.isFinite(x.phi)||x.phi<0||x.phi>50||!Number.isFinite(x.gamma)||x.gamma<=0||(x.gammaSat!=null&&(!Number.isFinite(x.gammaSat)||x.gammaSat<=9.80665))))throw new Error('Taşıma gücü tabaka parametreleri geçersiz.')
  let layerTop=i.Df
  const mappedLayers=i.layers?.map(x=>{const layer={topDepth:layerTop,bottomDepth:layerTop+x.thickness,gamma:x.gamma,gammaSat:x.gammaSat??i.gammaSat,cohesion:x.c,phi:x.phi};layerTop+=x.thickness;return layer})
  if(design==='tbdy-2018'){
    const r=calculateSurfaceFoundation({
      B:i.B,L:i.L,Df:i.Df,gamma1:i.gamma,gamma2:i.gammaSat??i.gamma,c:i.c,phi:i.phi,
      verticalLoad:V,horizontalLoad:H,momentX:i.momentX??0,momentY:i.momentY??0,
      groundSlope:i.soilSlope??0,baseSlope:i.baseSlope??0,resistanceFactor:1.4,additionalSurcharge:i.surcharge??0,method:'TBDY-2018',
      groundwaterDepth:i.waterTableDepth,undrainedCu:i.undrainedCu,
      layers:mappedLayers
    })
    return{
      value:{Nq:r.Nq,Nc:r.Nc,Ngamma:r.Ngamma,sc:r.sc,sq:r.sq,sgamma:r.sg,dc:r.dc,dq:r.dq,dgamma:r.dg,ic:r.ic,iq:r.iq,igamma:r.ig,characteristic:r.qk,designResistance:r.qt,allowableGross:undefined,qApplied:r.qo,BEffective:r.Be,LEffective:r.Le,ex:r.ex,ey:r.ey,qSurcharge:r.surcharge,resistanceFactor:1.4},
      method:'TBDY 2018',source:r.source,warnings:r.warnings,steps:r.steps
    }
  }
  let surcharge=i.surcharge??0,gammaBearing=i.gamma
  if(i.waterTableDepth==null){surcharge+=i.gamma*i.Df}
  else{
    const gwt=i.waterTableDepth
    if(gwt<=i.Df+i.B){
      const gammaSub=i.gammaSat!-9.80665
      surcharge+=gwt<i.Df?i.gamma*gwt+gammaSub*(i.Df-gwt):i.gamma*i.Df
      if(gwt<=i.Df)gammaBearing=gammaSub
      else gammaBearing=gammaSub+((gwt-i.Df)/i.B)*(i.gamma-gammaSub)
      warnings.push('Klasik hesapta YASS etkisi sürşarj ve Nγ terimi için efektif birim hacim ağırlıkla dikkate alındı.')
    }else surcharge+=i.gamma*i.Df
  }
  if(i.waterTableDepth==null)warnings.push('YASS girilmedi; klasik sonuç kuru zemin kabulüyle ön değerlendirmedir.')
  if(i.layers?.length)warnings.push('Klasik yöntem katmanlı zemin parametrelerini hesapta kullanmaz; katmanlı nihai değerlendirme için TBDY yüzeysel temel motoru ve zemin profili analizi gerekir.')
  const r=authoritativeBearing({B:i.B,L:i.L,Df:i.Df,gamma:i.gamma,gammaBearing,surcharge,c:i.c,phi:i.phi,FS:i.FS??3,method:i.method})
  if(H>0)warnings.push('Klasik taşıma gücü API yatay yük ve kayma güvenliğini değerlendirmez; temel kayma kontrolü ayrı yapılmalıdır.')
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
  const B=i.B,L=i.L??i.B,q=i.q,qNet=i.qNet??q,method=i.method??'elastic'
  const warnings:string[]=[]
  if(![B,L,q,qNet].every(Number.isFinite)||B<=0||L<=0||q<0||qNet<0||qNet>q+1e-9)throw new Error('Oturma hesabında B/L pozitif, q≥qNet≥0 ve tüm girdiler sonlu olmalıdır.')
  if(i.timeYears!=null&&(!Number.isFinite(i.timeYears)||i.timeYears<0))throw new Error('Oturma hesabı zamanı negatif olmayan sonlu bir değer olmalıdır.')
  if(!Array.isArray(i.layers)||!i.layers.length)throw new Error('Oturma hesabı için en az bir zemin tabakası gereklidir.')
  if(!['elastic','2:1','janbu','schmertmann','consolidation'].includes(method))throw new Error('Desteklenmeyen oturma yöntemi.')
  if(method==='schmertmann'&&(!Number.isFinite(i.schmertmannC1)||i.schmertmannC1!<=0||!Number.isFinite(i.schmertmannC2)||i.schmertmannC2!<=0))throw new Error('Schmertmann yöntemi için C1 ve C2 sonlu değerlerle girilmelidir.')
  for(const [index,layer] of i.layers.entries()){
    for(const [name,value] of [['Es',layer.Es],['ν',layer.nu],['M',layer.M],['mv',layer.mv],['Cc',layer.Cc],['e0',layer.e0],['Cr',layer.Cr],['σpc',layer.sigmaPc],['Iz',layer.Iz]] as const)if(value!=null&&!Number.isFinite(value))throw new Error('Oturma tabakası '+(index+1)+': '+name+' sonlu olmalıdır.')
    if(!Number.isFinite(layer.thickness)||layer.thickness<=0||!Number.isFinite(layer.sigmaV0)||layer.sigmaV0<=0||!Number.isFinite(layer.deltaSigma)||layer.deltaSigma<0)throw new Error('Oturma tabakası '+(index+1)+': kalınlık, başlangıç gerilmesi veya gerilme artışı geçersiz.')
    if(layer.nu!=null&&(layer.nu<=-1||layer.nu>=0.5))throw new Error('Oturma tabakası '+(index+1)+': Poisson oranı -1 ile 0.5 arasında olmalıdır.')
    if(layer.mv!=null&&layer.mv<0||layer.Cc!=null&&layer.Cc<0||layer.Cr!=null&&layer.Cr<0||layer.e0!=null&&layer.e0<0||layer.sigmaPc!=null&&layer.sigmaPc<=0||layer.Iz!=null&&layer.Iz<0)throw new Error('Oturma tabakası '+(index+1)+': sıkışma ve etki katsayıları fiziksel sınırlar dışında.')
    if(method==='elastic'||method==='2:1'){
      if(!Number.isFinite(layer.Es)||layer.Es!<=0)throw new Error('Oturma tabakası '+(index+1)+': Es pozitif olmalıdır.')
      if(!Number.isFinite(layer.nu)||layer.nu!<=-1||layer.nu!>=0.5)throw new Error('Oturma tabakası '+(index+1)+': elastik integrasyon için geçerli ν açıkça girilmelidir.')
    }
    if(method==='janbu'&&(!Number.isFinite(layer.M)||layer.M!<=0))throw new Error('Oturma tabakası '+(index+1)+': Janbu M parametresi pozitif olmalıdır.')
    if(method==='schmertmann'&&(!Number.isFinite(layer.Es)||layer.Es!<=0||!Number.isFinite(layer.Iz)||layer.Iz!<0))throw new Error('Oturma tabakası '+(index+1)+': Schmertmann Es pozitif ve Iz negatif olmayan bir değer olmalıdır.')
    if(method==='consolidation'&&!(layer.mv!=null&&Number.isFinite(layer.mv)&&layer.mv>=0)&&!(layer.Cc!=null&&Number.isFinite(layer.Cc)&&layer.Cc>=0&&layer.e0!=null&&Number.isFinite(layer.e0)&&layer.e0>=0))throw new Error('Oturma tabakası '+(index+1)+': konsolidasyon için mv veya Cc/e0 parametreleri gereklidir.')
    if(method==='consolidation'&&layer.mv==null&&((layer.Cc==null)!==(layer.e0==null)))throw new Error('Oturma tabakası '+(index+1)+': Cc ve e0 birlikte girilmelidir.')
  }
  const C1=i.schmertmannC1,C2=i.schmertmannC2
  if(i.timeYears!=null)warnings.push('Stage2 uyumluluk hesabında timeYears oturma miktarına uygulanmaz; Schmertmann C2 açık girilmeli, konsolidasyon hızı için Cv ve drenaj yolu içeren ayrı zaman analizi gerekir.')
  const results:any[]=[]
  let cumulativeDepth=0
  for(const [index,layer] of i.layers.entries()){
    const H=layer.thickness,zmid=cumulativeDepth+H/2,ds=method==='2:1'?qNet*B*L/((B+zmid)*(L+zmid)):layer.deltaSigma
    let s=0,type='none'
    if(H>0&&ds>0){
      if(method==='elastic'||method==='2:1'){
        const E=layer.Es
        if(E!=null&&Number.isFinite(E)&&E>0){const nu=layer.nu!;s=ds*H*(1-nu*nu)/E;type=method==='elastic'?'elastic':'2:1 + elastic'}else warnings.push('Katman '+(index+1)+': Es eksik.')
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
          const pc=layer.sigmaPc??sigma0,Cr=layer.Cr??layer.Cc
          if(layer.sigmaPc==null)warnings.push('Katman '+(index+1)+': σpc girilmedi; normal konsolide davranış (σpc=σ′v0) varsayıldı.')
          if(!Number.isFinite(pc)||pc<=0||pc<sigma0||!Number.isFinite(Cr)||Cr<0)throw new Error('Oturma tabakası '+(index+1)+': sigmaPc ve Cr geçersiz.')
          if(pc>sigma0&&layer.Cr==null)throw new Error('Oturma tabakası '+(index+1)+': aşırı konsolide davranış için Cr açıkça girilmelidir; Cc yerine varsayılamaz.')
          s=sigma1<=pc?H*Cr/(1+layer.e0)*Math.log10(sigma1/sigma0):H*Cr/(1+layer.e0)*Math.log10(pc/sigma0)+H*layer.Cc/(1+layer.e0)*Math.log10(sigma1/pc),type='oedometer
        }else warnings.push('Katman '+(index+1)+': mv veya Cc/e0 eksik.')
      }
    }
    results.push({index,thickness:H,zmid,deltaSigma:ds,settlement:s,type})
    cumulativeDepth+=H
  }
  const immediate=results.filter(x=>x.type!=='oedometer').reduce((a,x)=>a+x.settlement,0)
  const consolidation=results.filter(x=>x.type==='oedometer').reduce((a,x)=>a+x.settlement,0)
  if(method==='elastic'||method==='2:1')warnings.push('Elastik tabaka sonucu sadeleştirilmiş katman integrasyonudur; tam elastik yarı-uzay çözümü veya diferansiyel oturma analizinin yerine geçmez.')
  if(method==='consolidation')warnings.push('Bu sonuç birincil konsolidasyon oturmasıdır; zaman-bağımlı konsolidasyon derecesi Cv ve drenaj yolu verilmediğinden hesaplanmaz.')
  return{value:{immediate,consolidation,total:immediate+consolidation,layerResults:results,C1,C2},method,source:'Stage2 uyumluluk katmanı; sadeleştirilmiş tabaka integrasyonu. Nihai tasarımda idealize profil motoru ve uygun kaynak yöntemi kullanılmalıdır.',warnings,steps:[
    {symbol:'Δσ',title:'Katman gerilme artışı',formula:method==='2:1'?'qBL/[(B+z)(L+z)]':'girilen katman Δσ',unit:'kPa'},
    {symbol:'si',title:'Ani oturma',formula:'Katman integrasyonu',value:immediate,unit:'m'},
    {symbol:'sc',title:'Konsolidasyon',formula:'mv·Δσ·H veya Cc/Cr',value:consolidation,unit:'m'},
    {symbol:'st',title:'Toplam',formula:'st=si+sc',value:immediate+consolidation,unit:'m'}
  ]}
}
