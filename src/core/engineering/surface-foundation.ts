import type { FoundationType } from '../models/project'
import { TBDY_GAMMA_RV } from '../models/project'

export type SurfaceFoundationMethod='TBDY-2018'|'Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export interface SurfaceFoundationLayer{topDepth:number;bottomDepth:number;gamma:number;gammaSat?:number;cohesion:number;phi:number;name?:string}
export interface SurfaceFoundationInput{
  B:number;L:number;Df:number;gamma1:number;gamma2?:number;c:number;phi:number;verticalLoad:number;horizontalLoad?:number;momentX?:number;momentY?:number
  groundSlope?:number;baseSlope?:number;resistanceFactor?:number;method?:SurfaceFoundationMethod; safetyFactor?:number;undrainedCu?:number
  foundationType?:FoundationType;groundwaterDepth?:number;layers?:SurfaceFoundationLayer[];soilGroup?:'ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF';siteSpecificResponseAnalysisCompleted?:boolean
}
export interface SurfaceFoundationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}
export interface SurfaceFoundationResult{
 Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;dc:number;dq:number;dg:number;ic:number;iq:number;ig:number;gc:number;gq:number;gg:number;bc:number;bq:number;bg:number
 surcharge:number;gammaBelow:number;ex:number;ey:number;Be:number;Le:number;effectiveArea:number;qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number
 representativeC:number;representativePhi:number;representativeGamma:number;ultimateClassical?:number;allowableClassical?:number;undrainedQk?:number
 layeredScreeningOnly:boolean;finalDesignEligible:boolean;layerChecks:Array<{top:number;bottom:number;c:number;phi:number;gamma:number;qk:number;controlling:boolean}>;warnings:string[]
 method:SurfaceFoundationMethod;foundationType:FoundationType;source:string;steps:SurfaceFoundationStep[]
 value:{Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;dc:number;dq:number;dg:number;ic:number;iq:number;ig:number;gc:number;gq:number;gg:number;bc:number;bq:number;bg:number;surcharge:number;gammaBelow:number;ex:number;ey:number;Be:number;Le:number;effectiveArea:number;qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number}
}
const gammaW=9.80665,rad=(d:number)=>d*Math.PI/180,finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x),clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))

function factors(phiDeg:number,method:SurfaceFoundationMethod){
 const phi=clamp(phiDeg,0,50),t=Math.tan(rad(phi)),Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2,Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
 let Ngamma=0
 if(phi>0){if(method==='Terzaghi'){const Kpy=3*(1+Math.sin(rad(phi)))/Math.max(1-Math.sin(rad(phi)),1e-9);Ngamma=.5*t*(Kpy/Math.cos(rad(phi))**2-1)}else Ngamma=method==='Meyerhof'?(Nq-1)*Math.tan(rad(1.4*phi)):method==='Hansen'?1.5*(Nq-1)*t:2*(Nq+1)*t}
 return{phi,t,Nq,Nc,Ngamma}
}
function effectiveBaseStress(Df:number,gamma1:number,gammaSat:number|undefined,gwt:number|undefined){
 if(!finite(gwt)||gwt!<0)return gamma1*Df
 if(Df<=gwt)return gamma1*Df
 const gs=Math.max((gammaSat??gamma1)-gammaW,0)
 return gamma1*gwt+gs*(Df-gwt)
}
function gammaBelowForBearing(gamma1:number,gammaSat:number|undefined,gwt:number|undefined,Df:number,B:number){
 const gs=Math.max((gammaSat??gamma1)-gammaW,0)
 if(!finite(gwt)||gwt!<0||gwt>=Df+B)return gamma1
 if(gwt<=Df)return gs
 const saturatedLength=Math.max(0,Df+B-gwt)
 return (gamma1*(B-saturatedLength)+gs*saturatedLength)/Math.max(B,1e-9)
}
function methodFactors(method:SurfaceFoundationMethod,B:number,L:number,Df:number,phi:number,Nq:number,Nc:number,H:number,N:number,c:number,groundSlope:number,baseSlope:number,foundationType:FoundationType){
 const ratio=foundationType==='surekli'?0:Math.min(B,L)/Math.max(L,1e-9),t=Math.tan(rad(phi)),sin=Math.sin(rad(phi)),Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
 const slope=method==='TBDY-2018'||method==='Hansen'||method==='Vesic'?groundFactors(groundSlope,phi,Nq):{gc:1,gq:1,gg:1}
 const base=method==='TBDY-2018'||method==='Hansen'||method==='Vesic'?baseFactors(baseSlope,phi,Nq):{bc:1,bq:1,bg:1}
 if(method==='Terzaghi')return{sc:foundationType==='surekli'?1:Math.abs(B-L)<1e-9?1.3:1,sq:1,sg:foundationType==='surekli'?1:Math.abs(B-L)<1e-9?.8:1,dc:1,dq:1,dg:1,ic:1,iq:1,ig:1,...slope,...base}
 const sc=foundationType==='surekli'?1:method==='Meyerhof'?1+.2*Nphi*ratio:1+(Nq/Math.max(Nc,1e-9))*ratio
 const sq=foundationType==='surekli'?1:method==='Meyerhof'?(phi>10?1+.1*Nphi*ratio:1):1+ratio*t
 const sg=foundationType==='surekli'?1:method==='Meyerhof'?(phi>10?sq:1):Math.max(.6,1-.4*ratio)
 const k=Df/Math.max(B,1e-9),kk=k<=1?k:Math.atan(k)
 const dc=method==='Meyerhof'?1+.2*Math.sqrt(Nphi)*k:1+.4*kk
 const dq=method==='Meyerhof'?(phi>10?1+.1*Math.sqrt(Nphi)*k:1):1+2*t*(1-sin)**2*kk
 let ic=1,iq=1,ig=1
 if(H>0&&N>0){
  if(phi===0){iq=1;ic=Math.max(0,1-H/Math.max(B*L*c*Nc,1e-9));ig=Math.max(0,1-H/Math.max(N,1e-9))}
  else{const area=B*L,denom=N+area*c/Math.max(t,1e-9),ratioH=Math.min(.999999,H/Math.max(denom,1e-9)),m=Math.max((2+ratio)/(1+ratio),Math.min((2+1/Math.max(ratio,1e-9))/(1+1/Math.max(ratio,1e-9)),2));iq=Math.max(0,(1-ratioH)**m);ic=Math.max(0,iq-(1-iq)/Math.max(Nq-1,1e-9));ig=Math.max(0,(1-ratioH)**(m+1))}
 }
 return{sc,sq,sg,dc,dq,dg:1,ic,iq,ig,...slope,...base}
}
function groundFactors(betaDeg:number,phi:number,Nq:number){
 const beta=Math.abs(betaDeg);if(beta===0)return{gc:1,gq:1,gg:1};if(phi<=0)return{gc:Math.max(0,1-beta/147),gq:1,gg:1};if(beta>=phi)throw new Error('Arazi eğimi β, φ′ değerine eşit veya büyük olamaz.')
 const gq=Math.max(0,(1-Math.tan(rad(beta)))**2),gg=gq,gc=Math.max(0,gq-(1-gq)/Math.max(Nq-1,1e-9));return{gc,gq,gg}
}
function baseFactors(thetaDeg:number,phi:number,Nq:number){
 const theta=Math.abs(thetaDeg);if(theta===0)return{bc:1,bq:1,bg:1};if(theta>=90)throw new Error('Temel tabanı eğimi 90° veya daha büyük olamaz.')
 if(phi<=0)return{bc:Math.max(0,1-theta/147),bq:1,bg:1};const bq=Math.max(0,(1-theta*Math.tan(rad(phi))/57)**2),bg=bq,bc=Math.max(0,bq-(1-bq)/Math.max(Nq-1,1e-9));return{bc,bq,bg}
}
function layerChecks(layers:SurfaceFoundationLayer[]|undefined,Df:number,Bp:number,Lp:number,baseQ:number,method:SurfaceFoundationMethod){
  if(!layers?.length)return[]
  const active=layers.filter(l=>l.bottomDepth>Df&&l.topDepth<Df+2*Bp&&l.bottomDepth>l.topDepth&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
  return active.map(l=>{
    const phi=clamp(l.phi,0,50),ff=factors(phi,method)
    const gNat=Math.max(l.gamma,0),gSat=l.gammaSat!=null?Math.max(l.gammaSat-gammaW,0):Math.max(l.gamma,0)
    const qk= l.cohesion!*ff.Nc
      + baseQ*ff.Nq
      + .5*gSat*Bp*ff.Ngamma
    return{top:l.topDepth,bottom:l.bottomDepth,c:l.cohesion,phi,gamma:l.gamma,gammaEffective:gSat,qk,controlling:false}
  })
}
export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
 if(i.B<=0||i.L<=0||i.Df<0)throw new Error('Temel B ve L pozitif, Df negatif olmayan değer olmalıdır.')
 if(i.gamma1<=0)throw new Error('γ doğal pozitif olmalıdır.')
 if(finite(i.groundwaterDepth)&&i.groundwaterDepth!>=0&&(!finite(i.gamma2)||i.gamma2!<=0))throw new Error('YASS tanımlıysa γsat pozitif olmalıdır.')
 if(i.c<0||i.verticalLoad<0)throw new Error('c negatif, düşey yük negatif olamaz.')
 const method=i.method??'TBDY-2018',foundationType=i.foundationType??'tekil',N=i.verticalLoad,H=Math.hypot(i.horizontalLoad??0,0),groundSlope=Math.abs(i.groundSlope??0),baseSlope=Math.abs(i.baseSlope??0),warnings:string[]=[]
 if(i.groundwaterDepth==null)warnings.push('YASS girilmedi; nihai efektif gerilme/temel tasarım sonucu üretilemez.')
 if(groundSlope>=90||baseSlope>=90||groundSlope+baseSlope>=90)throw new Error('Arazi ve temel tabanı eğimleri geçersiz.')
 const ex=N>0?(i.momentY??0)/N:0,ey=N>0?(i.momentX??0)/N:0,Be=i.B-2*Math.abs(ex),Le=i.L-2*Math.abs(ey),effectiveArea=Math.max(0,Be)*Math.max(0,Le)
 if(N===0&&(i.momentX!==0||i.momentY!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
 if(Be<=0||Le<=0)warnings.push('Eksantrisite temel boyutunu tüketiyor; temas alanı geçersiz.')
 if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; q dağılımı ve temas ayrıca incelenmelidir.')
 const Bp=Math.min(Math.max(Be,1e-9),Math.max(Le,1e-9)),Lp=Math.max(Be,Le),f=factors(i.phi,method),qBase=effectiveBaseStress(i.Df,i.gamma1,i.gamma2,i.groundwaterDepth),gammaBelow=gammaBelowForBearing(i.gamma1,i.gamma2,i.groundwaterDepth,i.Df,Bp),mf=methodFactors(method,Bp,Lp,i.Df,f.phi,f.Nq,f.Nc,H,N,i.c,groundSlope,baseSlope,foundationType)
 const qk=i.c*f.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+qBase*f.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+.5*gammaBelow*Bp*f.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
 const resistanceFactor=method==='TBDY-2018'?TBDY_GAMMA_RV:1
 if(method==='TBDY-2018'&&i.resistanceFactor!=null&&Math.abs(i.resistanceFactor-TBDY_GAMMA_RV)>1e-9)warnings.push('TBDY için γRv kullanıcı girdisi yok sayıldı; sabit γRv=1.40 kullanıldı.')
 const qt=qk/resistanceFactor,qo=effectiveArea>0?N/effectiveArea:0,utilization=qt>0?qo/qt:Infinity
 const checks=layerChecks(i.layers,i.Df,Bp,Lp,qBase,method)
 if(checks.length){const min=Math.min(...checks.map(x=>x.qk));checks.forEach(x=>x.controlling=Math.abs(x.qk-min)<1e-9);warnings.push('Tabakalı zemin sonucu ekran taramasıdır; homojen TBDY taşıma gücü hesabının yerine nihai tabakalı zemin çözümü olarak kullanılmaz.')}
 const layeredScreeningOnly=checks.length>0
 const zfBlocked=i.soilGroup==='ZF'&&!i.siteSpecificResponseAnalysisCompleted
 if(zfBlocked)warnings.push('ZF için saha özel zemin davranış analizi tamamlanmadan nihai deprem tasarım sonucu uygun kabul edilmez.')
 const finalDesignEligible=!layeredScreeningOnly&&!zfBlocked&&i.groundwaterDepth!=null
 const adequate=finalDesignEligible&&qo<=qt&&Be>0&&Le>0
 if(finite(i.groundwaterDepth)&&i.groundwaterDepth!<=i.Df+Bp)warnings.push('YASS temel tabanına yakın/üstünde: efektif temel sürşarjı ve ağırlıklı γ′ kullanıldı.')
 if(groundSlope>0)warnings.push('Arazi eğimi katsayıları β<φ′ koşulu kontrol edilerek uygulandı.')
 if(baseSlope>0)warnings.push('Temel tabanı eğimi katsayıları uygulandı.')
 if(foundationType==='radye')warnings.push('Radye temelde diferansiyel/toplam oturma ayrıca kontrol edilmelidir.')
 const undrainedQk=i.undrainedCu!=null?Math.max(0,i.undrainedCu)*5.14*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+qBase:undefined
 const steps:SurfaceFoundationStep[]=[
  {symbol:'ex/ey',title:'Eksantrisite',formula:'ex=My/N ; ey=Mx/N',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
  {symbol:'B′/L′',title:'Etkin temel boyutları',formula:'B′=B−2|ex| ; L′=L−2|ey|',value:Math.min(Be,Le),unit:'m'},
  {symbol:'q′',title:'Temel seviyesinde efektif sürşarj',formula:'σ′v0(Df)=ΣγH−u',value:qBase,unit:'kPa'},
  {symbol:'Nq/Nc/Nγ',title:'Taşıma gücü katsayıları',formula:'TBDY 2018 / seçilen klasik yöntemin bağıntıları',value:f.Nq},
  {symbol:'s',title:'Şekil katsayıları',formula:'sc,sq,sγ',value:mf.sc},
  {symbol:'d',title:'Derinlik katsayıları',formula:'dc,dq,dγ',value:mf.dc},
  {symbol:'i',title:'Eğimli yük katsayıları',formula:'ic,iq,iγ',value:mf.ic},
  {symbol:'g',title:'Arazi eğimi katsayıları',formula:'gc,gq,gγ',value:mf.gc},
  {symbol:'b',title:'Temel tabanı eğimi katsayıları',formula:'bc,bq,bγ',value:mf.bc},
  {symbol:'qk',title:'Karakteristik taşıma gücü',formula:'qk=cNcscdcicgc bc + q′Nqsqdqiqgq bq + 0.5γ′B′Nγsγdγiγgγbγ',value:qk,unit:'kPa'},
  {symbol:'qt',title:'Tasarım dayanımı',formula:'qt=qk/γRv',value:qt,unit:'kPa'},
  {symbol:'q0',title:'Temel taban basıncı',formula:'q0=N/(B′L′)',value:qo,unit:'kPa'},
  {symbol:'η',title:'Kullanım oranı',formula:'η=q0/qt',value:utilization}
 ]
 const resultBase={Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,...mf,surcharge:qBase,gammaBelow,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp,representativeC:i.c,representativePhi:f.phi,representativeGamma:gammaBelow,ultimateClassical:qk,allowableClassical:qk/Math.max(i.safetyFactor??3,1e-9),undrainedQk,layeredScreeningOnly,finalDesignEligible,layerChecks:checks,warnings,method,foundationType}
 return{...resultBase,source:'TBDY 2018 16.8.3 yüzeysel temel taşıma gücü; tabakalı zemin ayrı ekran kontrolü olarak tutulur. YASS için efektif gerilme ve γ′ yaklaşımı, ZF için saha özel analiz durumu ayrıca izlenir.',steps,value:{Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:mf.sc,sq:mf.sq,sg:mf.sg,dc:mf.dc,dq:mf.dq,dg:mf.dg,ic:mf.ic,iq:mf.iq,ig:mf.ig,gc:mf.gc,gq:mf.gq,gg:mf.gg,bc:mf.bc,bq:mf.bq,bg:mf.bg,surcharge:qBase,gammaBelow,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp}}
}
