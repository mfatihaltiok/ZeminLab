import type { FoundationType, UnitSystem } from '../models/project'

export type SurfaceFoundationMethod='TBDY-2018'|'Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export interface SurfaceFoundationLayer{topDepth:number;bottomDepth:number;gamma:number;gammaSat?:number;cohesion:number;phi:number;name?:string}
export interface SurfaceFoundationInput{
  B:number;L:number;Df:number;gamma1:number;gamma2?:number;c:number;phi:number;verticalLoad:number;horizontalLoad?:number;momentX?:number;momentY?:number
  groundSlope?:number;baseSlope?:number;resistanceFactor?:number;method?:SurfaceFoundationMethod;safetyFactor?:number;undrainedCu?:number
  foundationType?:FoundationType;unitSystem?:UnitSystem;groundwaterDepth?:number;layers?:SurfaceFoundationLayer[]
}
export interface SurfaceFoundationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}
export interface SurfaceFoundationResult{
  Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;dc:number;dq:number;dg:number;ic:number;iq:number;ig:number;gc:number;gq:number;gg:number;bc:number;bq:number;bg:number
  surcharge:number;gammaBelow:number;ex:number;ey:number;Be:number;Le:number;effectiveArea:number;qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number
  representativeC:number;representativePhi:number;representativeGamma:number;ultimateClassical?:number;allowableClassical?:number;undrainedQk?:number
  layerChecks:Array<{top:number;bottom:number;c:number;phi:number;gamma:number;qk:number;controlling:boolean}>;warnings:string[];method:SurfaceFoundationMethod;foundationType:FoundationType;source:string;steps:SurfaceFoundationStep[]
  value:{Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;dc:number;dq:number;dg:number;ic:number;iq:number;ig:number;gc:number;gq:number;gg:number;bc:number;bq:number;bg:number;surcharge:number;gammaBelow:number;ex:number;ey:number;Be:number;Le:number;effectiveArea:number;qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number}
}
const gammaW=9.80665
const rad=(deg:number)=>deg*Math.PI/180
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))

function factors(phiDeg:number,method:SurfaceFoundationMethod){
  const phi=clamp(phiDeg,0,50),t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
  let Ngamma=0
  if(phi>0){
    if(method==='Meyerhof')Ngamma=(Nq-1)*Math.tan(rad(1.4*phi))
    else if(method==='Hansen')Ngamma=1.5*(Nq-1)*t
    else if(method==='Vesic')Ngamma=2*(Nq+1)*t
    else Ngamma=2*(Nq-1)*t
  }
  return{phi,t,Nq,Nc,Ngamma}
}

function groundwater(Df:number,B:number,gammaNatural:number,gammaSat?:number,gwt?:number){
  const gs=Math.max((finite(gammaSat)?gammaSat:gammaNatural)-gammaW,0.001)
  if(!finite(gwt)||gwt!<0)return{surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
  if(gwt<=Df)return{surcharge:gammaNatural*Math.max(gwt,0)+gs*Math.max(Df-Math.max(gwt,0),0),gammaBelow:gs}
  if(gwt<=Df+B){
    const z=gwt-Df
    return{surcharge:gammaNatural*Df,gammaBelow:gs+(z/B)*(gammaNatural-gs)}
  }
  return{surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
}

function vesicGroundFactors(betaDeg:number,phi:number,Nq:number){
  const beta=Math.abs(betaDeg)
  if(beta===0)return{gc:1,gq:1,gg:1}
  if(phi<=0)throw new Error('TBDY yüzeysel temel hesabında eğimli arazi için φ′>0 gerekir; drenajsız özel durum ayrı değerlendirilmelidir.')
  if(beta>=phi)throw new Error('Arazi eğimi β, içsel sürtünme açısı φ′ değerinden küçük olmalıdır.')
  const gq=Math.max(0,(1-Math.tan(rad(beta)))**2),gg=gq
  const gc=Math.max(0,gq-(1-gq)/Math.max(Nq-1,1e-9))
  return{gc,gq,gg}
}

function vesicBaseFactors(thetaDeg:number,phi:number,Nq:number){
  const theta=Math.abs(thetaDeg)
  if(theta===0)return{bc:1,bq:1,bg:1}
  if(theta>=90)throw new Error('Temel tabanı eğimi 90° veya daha büyük olamaz.')
  if(phi<=0)return{bc:Math.max(0,1-theta/147),bq:1,bg:1}
  const bq=Math.max(0,(1-theta*Math.tan(rad(phi))/57)**2),bg=bq
  const bc=Math.max(0,bq-(1-bq)/Math.max(Nq-1,1e-9))
  return{bc,bq,bg}
}

function methodFactors(method:SurfaceFoundationMethod,B:number,L:number,Df:number,phi:number,Nq:number,Nc:number,H:number,N:number,c:number,groundSlope:number,baseSlope:number){
  const r=Math.min(B,L)/Math.max(L,1e-9),t=Math.tan(rad(phi)),sin=Math.sin(rad(phi))
  const Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
  const slope=method==='TBDY-2018'||method==='Hansen'||method==='Vesic'?vesicGroundFactors(groundSlope,phi,Nq):{gc:1,gq:1,gg:1}
  const base=method==='TBDY-2018'||method==='Hansen'||method==='Vesic'?vesicBaseFactors(baseSlope,phi,Nq):{bc:1,bq:1,bg:1}
  if(method==='Terzaghi')return{sc:Math.abs(B-L)<1e-9?1.3:1,sq:1,sg:Math.abs(B-L)<1e-9?.8:1,dc:1,dq:1,dg:1,ic:1,iq:1,ig:1,...slope,...base}
  const sc=method==='Meyerhof'?1+.2*Nphi*r:1+(Nq/Math.max(Nc,1e-9))*r
  const sq=method==='Meyerhof'?(phi>10?1+.1*Nphi*r:1):1+r*t
  const sg=method==='Meyerhof'?(phi>10?sq:1):Math.max(.6,1-.4*r)
  const k=Df/Math.max(B,1e-9),kk=k<=1?k:Math.atan(k)
  const dc=method==='Meyerhof'?1+.2*Math.sqrt(Nphi)*k:1+.4*kk
  const dq=method==='Meyerhof'?(phi>10?1+.1*Math.sqrt(Nphi)*k:1):1+2*t*(1-sin)**2*kk
  let ic=1,iq=1,ig=1
  if(H>0&&N>0){
    if(phi===0){
      iq=1
      ic=Math.max(0,1-H/Math.max(B*L*c*Nc,1e-9))
      ig=Math.max(0,1-H/Math.max(N,1e-9))
    }else{
      const area=B*L
      const denom=N+area*c/Math.max(t,1e-9)
      const ratio=Math.min(.999999,H/Math.max(denom,1e-9))
      const m=Math.max((2+r)/(1+r),Math.min((2+1/r)/(1+1/r),2))
      iq=Math.max(0,(1-ratio)**m)
      ic=Math.max(0,iq-(1-iq)/Math.max(Nq-1,1e-9))
      ig=Math.max(0,(1-ratio)**(m+1))
    }
  }
  return{sc,sq,sg,dc,dq,dg:1,ic,iq,ig,...slope,...base}
}

function layerChecks(layers:SurfaceFoundationLayer[]|undefined,Df:number,influence:number,baseQ:number,mf:ReturnType<typeof methodFactors>,method:SurfaceFoundationMethod){
  if(!layers?.length)return[]
  const active=layers.filter(l=>l.bottomDepth>Df&&l.topDepth<Df+influence&&l.bottomDepth>l.topDepth&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
  return active.map(l=>{
    const phi=clamp(l.phi,0,50),ff=factors(phi,method),gamma=l.gammaSat!=null?Math.max(l.gammaSat-gammaW,.001):Math.max(l.gamma,.001)
    const qk=Math.max(0,l.cohesion)*ff.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+baseQ*ff.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+0.5*gamma*Math.max(.01,Math.min(1e3,influence))*ff.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
    return{top:l.topDepth,bottom:l.bottomDepth,c:l.cohesion,phi,gamma,qk,controlling:false}
  })
}

export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(i.B<=0||i.L<=0||i.Df<0)throw new Error('Temel B ve L pozitif, Df negatif olmayan değer olmalıdır.')
  if(i.gamma1<=0)throw new Error('γ doğal birim hacim ağırlığı pozitif olmalıdır.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!>=0&&(!finite(i.gamma2)||i.gamma2!<=0))throw new Error('YASS tanımlandıysa γsat pozitif olmalıdır.')
  if(i.c<0||i.verticalLoad<0)throw new Error('c negatif, düşey yük negatif olamaz.')
  const method=i.method??'TBDY-2018',foundationType=i.foundationType??'tekil',N=i.verticalLoad,H=Math.abs(i.horizontalLoad??0)
  const groundSlope=Math.abs(i.groundSlope??0),baseSlope=Math.abs(i.baseSlope??0)
  if(groundSlope>=90||baseSlope>=90||groundSlope+baseSlope>=90)throw new Error('Arazi ve temel tabanı eğimleri geçersiz.')
  const warnings:string[]=[]
  const ex=N>0?(i.momentY??0)/N:0,ey=N>0?(i.momentX??0)/N:0
  if(N===0&&(i.momentX!==0||i.momentY!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
  const Be=i.B-2*Math.abs(ex),Le=i.L-2*Math.abs(ey),effectiveArea=Math.max(0,Be)*Math.max(0,Le)
  if(Be<=0||Le<=0)warnings.push('Eksantrisite temel boyutunu tüketiyor; q0 kontrolü geçersizdir.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; gerçek temas alanı ve q dağılımı ayrıca incelenmelidir.')
  const Bp=Math.min(Math.max(Be,1e-9),Math.max(Le,1e-9)),Lp=Math.max(Be,Le)
  const f=factors(i.phi,method),water=groundwater(i.Df,Bp,i.gamma1,i.gamma2,i.groundwaterDepth)
  const mf=methodFactors(method,Bp,Lp,i.Df,f.phi,f.Nq,f.Nc,H,N,i.c,groundSlope,baseSlope)
  const qk=i.c*f.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+water.surcharge*f.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+0.5*water.gammaBelow*Bp*f.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
  const resistanceFactor=method==='TBDY-2018'?i.resistanceFactor??1.4:1
  const qt=qk/Math.max(resistanceFactor,1e-9),qo=effectiveArea>0?N/effectiveArea:0
  const utilization=qt>0?qo/qt:Infinity
  const checks=layerChecks(i.layers,i.Df,2*Bp,water.surcharge,mf,method)
  if(checks.length){
    const min=Math.min(...checks.map(x=>x.qk))
    checks.forEach(x=>x.controlling=Math.abs(x.qk-min)<1e-9)
    warnings.push('Tabakalı zemin kontrolü: etkin derinlikteki tabakalar ayrı hesaplandı; en düşük karakteristik qk ek kontrol olarak kullanıldı. Bu, 16.8.3.3 için muhafazakâr bir ekran kontrolüdür ve özel tabakalı-zemin mekanizmasının yerini tutmaz.')
  }
  const controlling=checks.length?Math.min(qk,...checks.map(x=>x.qk)):qk,designQt=controlling/Math.max(resistanceFactor,1e-9),adequate=qo<=designQt&&Be>0&&Le>0
  if(method==='TBDY-2018'&&Math.abs((i.resistanceFactor??1.4)-1.4)>1e-9)warnings.push('TBDY 2018 Tablo 16.2 yüzeysel temel için γRv=1.40 kullanılmalıdır.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!<=i.Df+Bp)warnings.push('YASS temel tabanına yakın/üstünde: γ′ ve ağırlıklı γ kullanıldı.')
  if(groundSlope>0)warnings.push('Arazi eğimi katsayıları Vesic tipi genel kabul görmüş bağıntılarla uygulanmıştır; β<φ′ koşulu kontrol edildi.')
  if(baseSlope>0)warnings.push('Temel tabanı eğimi katsayıları Vesic tipi genel kabul görmüş bağıntılarla uygulanmıştır.')
  if(foundationType==='radye')warnings.push('Radye temel için taşıma gücünün yanında toplam/farklı oturma ayrıca kontrol edilmelidir.')
  if(i.groundwaterDepth!=null&&i.groundwaterDepth<=i.Df&&i.undrainedCu==null)warnings.push('Temel YASS altında/aynı kotta ise deprem durumunda 16.8.4.6 gereği cu ile drenajsız kayma ayrıca gereklidir.')
  const steps:SurfaceFoundationStep[]=[
    {symbol:'ex/ey',title:'Yük eksantriklikleri',formula:'ex=My/N ; ey=Mx/N',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
    {symbol:'B′/L′',title:'Etkin boyutlar',formula:'B′=B−2|ex| ; L′=L−2|ey|',value:Math.min(Be,Le),unit:'m'},
    {symbol:'Nq/Nc/Nγ',title:'Taşıma gücü katsayıları',formula:'Nq=e^(πtanφ)tan²(45°+φ/2); Nc=(Nq−1)cotφ; Nγ=2(Nq−1)tanφ',value:f.Nq,note:method==='TBDY-2018'?'TBDY 2018 Denk. 16.8b':''},
    {symbol:'s',title:'Şekil katsayıları',formula:'sc,sq,sγ',value:mf.sc},
    {symbol:'d',title:'Derinlik katsayıları',formula:'dc,dq,dγ',value:mf.dc},
    {symbol:'i',title:'Yük eğikliği katsayıları',formula:'ic,iq,iγ',value:mf.ic},
    {symbol:'g',title:'Arazi eğimi katsayıları',formula:'gc,gq,gγ',value:mf.gc},
    {symbol:'b',title:'Temel tabanı eğimi katsayıları',formula:'bc,bq,bγ',value:mf.bc},
    {symbol:'qk',title:'Karakteristik taşıma gücü',formula:'cNcscdcicgc bc + qNqsqdqiqgq bq + 0.5γ′B′Nγsγdγiγgγbγ',value:controlling,unit:'kPa'},
    {symbol:'qt',title:'Tasarım taşıma gücü',formula:'qt=qk/γRv',value:designQt,unit:'kPa'},
    {symbol:'q0',title:'Temel tabanındaki tasarım basıncı',formula:'q0=N/(B′L′)',value:qo,unit:'kPa'},
    {symbol:'η',title:'Kullanım oranı',formula:'η=q0/qt',value:qo/Math.max(designQt,1e-9)}
  ]
  const resultBase={
    Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,...mf,surcharge:water.surcharge,gammaBelow:water.gammaBelow,ex,ey,Be,Le,effectiveArea,qk:controlling,qt:designQt,qo,utilization:qo/Math.max(designQt,1e-9),adequate,effectiveDepth:2*Bp,
    representativeC:i.c,representativePhi:f.phi,representativeGamma:water.gammaBelow,ultimateClassical:qk,allowableClassical:qk/Math.max(i.safetyFactor??3,1e-9),
    undrainedQk:i.undrainedCu!=null?i.undrainedCu*5.14*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+water.surcharge:undefined,
    layerChecks:checks,warnings,method,foundationType
  }
  return{...resultBase,source:'TBDY 2018 16.8.3.1–16.8.3.4; Denk. 16.8. Arazi ve temel tabanı eğimi katsayıları için genel kabul görmüş Vesic tipi bağıntılar kullanılır; tabakalı zemin kontrolü ayrıca raporlanır.',steps,value:{Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:mf.sc,sq:mf.sq,sg:mf.sg,dc:mf.dc,dq:mf.dq,dg:mf.dg,ic:mf.ic,iq:mf.iq,ig:mf.ig,gc:mf.gc,gq:mf.gq,gg:mf.gg,bc:mf.bc,bq:mf.bq,bg:mf.bg,surcharge:water.surcharge,gammaBelow:water.gammaBelow,ex,ey,Be,Le,effectiveArea,qk:controlling,qt:designQt,qo,utilization:qo/Math.max(designQt,1e-9),adequate,effectiveDepth:2*Bp}}
}