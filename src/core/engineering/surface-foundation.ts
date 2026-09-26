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
  qAvg:number;qMax:number;qMin:number;contactState:'FULL'|'PARTIAL'|'NO_CONTACT';coreContact:boolean
  representativeC:number;representativePhi:number;representativeGamma:number;ultimateClassical?:number;allowableClassical?:number;undrainedQk?:number
  layeredScreeningOnly:boolean;finalDesignEligible:boolean
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
  if(beta>=90)throw new Error('Arazi eğimi β 90° veya daha büyük olamaz.')
  if(phi<=0)return{gc:Math.max(0,1-beta/147),gq:Math.max(0,1-Math.tan(rad(beta))**2),gg:Math.max(0,1-Math.tan(rad(beta))**2)}
  if(beta>=phi)throw new Error('Arazi eğimi β, içsel sürtünme açısı φ′ değerinden küçük olmalıdır.')
  const gq=Math.max(0,1-Math.tan(rad(beta))**2),gg=gq
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
  const active=layers
    .filter(l=>l.bottomDepth>Df&&l.topDepth<Df+influence&&l.bottomDepth>l.topDepth&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
    .sort((a,b)=>a.topDepth-b.topDepth)
  return active.map(l=>{
    const top=Math.max(l.topDepth,Df),bottom=Math.min(l.bottomDepth,Df+influence),thickness=Math.max(0,bottom-top)
    const phi=clamp(l.phi,0,50),ff=factors(phi,method)
    const gamma=finite(l.gammaSat)?Math.max(l.gammaSat-gammaW,.001):Math.max(l.gamma,.001)
    const qk=Math.max(0,l.cohesion)*ff.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+baseQ*ff.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+0.5*gamma*Math.max(.01,Math.min(1e3,influence))*ff.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
    return{top:l.topDepth,bottom:l.bottomDepth,c:l.cohesion,phi,gamma,qk,controlling:false}
  })
}


export function compressionContact(B:number,L:number,N:number,Mx:number,My:number){
  if(N<=0)return{area:0,qMax:0,qMin:0,contactState:'NO_CONTACT' as const}
  const fullA=B*L,fullQ=N/fullA,ex=My/N,ey=Mx/N
  if(Math.abs(ex)<=B/6+1e-12&&Math.abs(ey)<=L/6+1e-12)
    return{area:fullA,qMax:fullQ*(1+6*Math.abs(ex)/B+6*Math.abs(ey)/L),qMin:Math.max(0,fullQ*(1-6*Math.abs(ex)/B-6*Math.abs(ey)/L)),contactState:'FULL' as const}

  const nx=80,ny=80,dx=B/nx,dy=L/ny
  const cells:Array<[number,number]>=[]
  for(let ix=0;ix<nx;ix++){const x=-B/2+(ix+.5)*dx;for(let iy=0;iy<ny;iy++){const y=-L/2+(iy+.5)*dy;cells.push([x,y])}}
  const integrate=(a:number,b:number,cc:number)=>{
    let f0=0,fy=0,fx=0,fyy=0,fxx=0,fxy=0,area=0,qMax=0
    for(const [x,y] of cells){
      const p=Math.max(0,a+b*x+cc*y),w=dx*dy
      f0+=p*w
      if(p>0){area+=w;qMax=Math.max(qMax,p)}
      fy+=p*x*w; fx+=p*y*w
      fyy+=p*x*x*w; fxx+=p*y*y*w; fxy+=p*x*y*w
    }
    return{f0,fx,fy,fxx,fyy,fxy,area,qMax}
  }
  let a=fullQ,b=12*My/(B**3*L),cc=12*Mx/(L**3*B)
  for(let it=0;it<40;it++){
    const f=integrate(a,b,cc)
    const r0=f.f0-N,r1=f.fx-Mx,r2=f.fy-My
    if(Math.max(Math.abs(r0)/Math.max(N,1),Math.abs(r1)/Math.max(Math.abs(Mx),N*B/2,1),Math.abs(r2)/Math.max(Math.abs(My),N*L/2,1))<1e-6)break
    const j00=f.area,j01=f.fy,j02=f.fx,j10=f.fy,j11=f.fxx,j12=f.fxy,j20=f.fx,j21=f.fxy,j22=f.fyy
    const det=j00*(j11*j22-j12*j21)-j01*(j10*j22-j12*j20)+j02*(j10*j21-j11*j20)
    if(Math.abs(det)<1e-18)break
    const d0=(r0*(j11*j22-j12*j21)-j01*(r1*j22-j12*r2)+j02*(r1*j21-j11*r2))/det
    const d1=(j00*(r1*j22-j12*r2)-r0*(j10*j22-j12*j20)+j02*(j10*r2-r1*j20))/det
    const d2=(j00*(j11*r2-r1*j21)-j01*(j10*r2-r1*j20)+r0*(j10*j21-j11*j20))/det
    const scale=Math.max(Math.abs(a),Math.abs(b)*B/2,Math.abs(cc)*L/2,1)
    a=Math.max(-scale*100,a-d0); b=Math.max(-scale*100,Math.min(scale*100,b-d1)); cc=Math.max(-scale*100,Math.min(scale*100,cc-d2))
  }
  const f=integrate(a,b,cc)
  return{area:f.area,qMax:f.qMax,qMin:0,contactState:'PARTIAL' as const}
}

function equivalentLayerParameters(layers:SurfaceFoundationLayer[]|undefined,Df:number,influence:number){
  if(!layers?.length)return null
  const active=layers
    .filter(l=>l.bottomDepth>Df&&l.topDepth<Df+influence&&l.bottomDepth>l.topDepth&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
    .sort((a,b)=>a.topDepth-b.topDepth)
  if(!active.length)return null
  let covered=0,cWeighted=0,tanPhiWeighted=0,gammaWeighted=0
  const segments:SurfaceFoundationLayer[]=[]
  for(const l of active){
    const top=Math.max(l.topDepth,Df),bottom=Math.min(l.bottomDepth,Df+influence),h=Math.max(0,bottom-top)
    if(h<=0)continue
    covered+=h
    cWeighted+=l.cohesion*h
    tanPhiWeighted+=Math.tan(rad(clamp(l.phi,0,50)))*h
    const gammaEff=finite(l.gammaSat)?Math.max(l.gammaSat-gammaW,.001):Math.max(l.gamma,.001)
    gammaWeighted+=gammaEff*h
    segments.push({...l,topDepth:top,bottomDepth:bottom,gamma:gammaEff})
  }
  const coverageTolerance=1e-9
  if(covered<influence-coverageTolerance)return{complete:false,covered,influence,segments}
  return{
    complete:true,covered,influence,segments,
    c:cWeighted/influence,
    phi:Math.atan(tanPhiWeighted/influence)*180/Math.PI,
    gamma:gammaWeighted/influence
  }
}

export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(i.B<=0||i.L<=0||i.Df<0)throw new Error('Temel B ve L pozitif, Df negatif olmayan değer olmalıdır.')
  if(i.gamma1<=0)throw new Error('γ doğal birim hacim ağırlığı pozitif olmalıdır.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!>=0&&(!finite(i.gamma2)||i.gamma2!<=0))throw new Error('YASS tanımlandıysa γsat pozitif olmalıdır.')
  if(i.c<0||i.verticalLoad<0)throw new Error('c negatif, düşey yük negatif olamaz.')
  if(!finite(i.phi)||i.phi<0||i.phi>50)throw new Error('φ 0° ile 50° arasında olmalıdır.')
  const method=i.method??'TBDY-2018',foundationType=i.foundationType??'tekil',N=i.verticalLoad
  const Vh=Math.abs(i.horizontalLoad??0)
  const groundSlope=Math.abs(i.groundSlope??0),baseSlope=Math.abs(i.baseSlope??0)
  if(groundSlope>=90||baseSlope>=90||groundSlope+baseSlope>=90)throw new Error('Arazi ve temel tabanı eğimleri geçersiz.')
  const warnings:string[]=[]
  const ex=N>0?(i.momentY??0)/N:0,ey=N>0?(i.momentX??0)/N:0
  if(N===0&&(i.momentX!==0||i.momentY!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
  const coreContact=Math.abs(ex)<=i.B/6+1e-12&&Math.abs(ey)<=i.L/6+1e-12
  const Be=i.B-2*Math.abs(ex),Le=i.L-2*Math.abs(ey),effectiveArea=Math.max(0,Be)*Math.max(0,Le)
  const contactState:SurfaceFoundationResult['contactState']=Be<=0||Le<=0?'NO_CONTACT':coreContact?'FULL':'PARTIAL'
  if(contactState==='NO_CONTACT')warnings.push('Eksantrisite temel tabanında basınçlı temas bölgesini ortadan kaldırıyor; taşıma gücü ve temas basıncı sonucu geçersizdir.')
  if(contactState==='PARTIAL')warnings.push('Eksantrisite çekirdek dışındadır. B′/L′ taşıma gücü hesabında etkin boyut olarak kullanılır; gerçek kısmi temas basıncı ayrıca belirtilmiştir.')
  const Bp=Math.min(Math.max(Be,1e-9),Math.max(Le,1e-9)),Lp=Math.max(Be,Le)
  const f=factors(i.phi,method)
  const water=groundwater(i.Df,Bp,i.gamma1,i.gamma2,i.groundwaterDepth)
  const mf=methodFactors(method,Bp,Lp,i.Df,f.phi,f.Nq,f.Nc,Vh,N,i.c,groundSlope,baseSlope)

  let representativeC=i.c,representativePhi=f.phi,representativeGamma=water.gammaBelow
  let layerData:ReturnType<typeof equivalentLayerParameters>=null
  let layeredComplete=true
  if(i.layers?.length){
    layerData=equivalentLayerParameters(i.layers,i.Df,2*Bp)
    if(!layerData){
      layeredComplete=false
      warnings.push('Tabakalı zemin verisi mevcut ancak temel tabanı ile 2B′ etki bölgesini tanımlayan geçerli tabaka bulunamadı.')
    }else if(!layerData.complete){
      layeredComplete=false
      warnings.push('Tabakalı zemin profili 16.8.3.3 kapsamında gerekli 2B′ etki derinliğini tam kaplamıyor; eksik derinlik tamamlanmadan nihai tasarım sonucu uygun kabul edilmez.')
      representativeC=layerData.c??i.c
      representativePhi=layerData.phi??f.phi
      representativeGamma=layerData.gamma??water.gammaBelow
    }else{
      representativeC=layerData.c
      representativePhi=layerData.phi
      representativeGamma=layerData.gamma
      warnings.push('Tabakalı zemin için 2B′ etki derinliğinde eşdeğer parametreler kullanıldı: c ağırlıklı, tanφ ağırlıklı ve γ′ kalınlık ağırlıklı ortalama. TBDY 16.8.3.3 tabakaların etkisinin dikkate alınmasını ister; tek bir tabakalı-zemin bağıntısı tarif etmediği için bu yaklaşım mühendislik modeli olarak raporlanır.')
    }
  }

  if(layerData?.complete && i.layers?.length){
    const ordered=[...i.layers].filter(l=>l.bottomDepth>l.topDepth&&l.topDepth<i.Df).sort((a,b)=>a.topDepth-b.topDepth)
    let sigmaBase=0
    for(const l of ordered){
      const top=Math.max(0,l.topDepth),bottom=Math.min(i.Df,l.bottomDepth)
      if(bottom<=top)continue
      const gSat=finite(l.gammaSat)?Math.max(l.gammaSat-gammaW,0.001):Math.max(l.gamma,0.001)
      const gwt=i.groundwaterDepth
      const above=!finite(gwt)||gwt!<0?bottom-top:Math.max(0,Math.min(bottom,gwt)-top)
      const below=(bottom-top)-above
      sigmaBase+=above*l.gamma+below*gSat
    }
    water.surcharge=sigmaBase
    water.gammaBelow=layerData.gamma??water.gammaBelow
  }

  const rf=method==='TBDY-2018'?i.resistanceFactor??1.4:1
  if(rf<=0)throw new Error('Direnç katsayısı pozitif olmalıdır.')
  if(method==='TBDY-2018'&&Math.abs(rf-1.4)>1e-9)warnings.push('TBDY 2018 Tablo 16.2 yüzeysel temel taşıma gücü için γRv=1.40 kullanılmalıdır.')
  const ef=factors(representativePhi,method)
  const qk=representativeC*ef.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+
    water.surcharge*ef.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+
    0.5*representativeGamma*Bp*ef.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
  const qt=qk/rf
  const qAvg=effectiveArea>0?N/(i.B*i.L):Infinity
  const qo=effectiveArea>0?N/effectiveArea:Infinity
  const contact=compressionContact(i.B,i.L,N,i.momentX??0,i.momentY??0)
  const qMax=contact.qMax
  const qMin=contact.qMin
  const contactArea=contact.area
  const utilization=qt>0?qo/qt:Infinity
  if(contactState==='NO_CONTACT')warnings.push('Temel tabanında basınçlı temas bulunmadığından q0/qt karşılaştırması nihai uygunluk için kullanılamaz.')
  if(contactState==='PARTIAL')warnings.push('Kısmi temas alanı compression-only lineer basınç dağılımından nümerik olarak çözüldü; qmin=0 ve qmax gerçek temas alanı üzerinden raporlanır.')
  let adequate=qo<=qt&&contactState!=='NO_CONTACT'&&(!i.layers||layeredComplete)
  const checks=layerChecks(i.layers,i.Df,2*Bp,water.surcharge,mf,method)
  checks.forEach(x=>x.controlling=false)
  if(i.layers?.length&&layerData?.complete)warnings.push('Tabaka kontrolleri artık bağımsız min(qk) olarak tasarım direncine indirilmez; eşdeğer parametreli hesap ana sonucu, tabaka listesi ise izlenebilirlik kontrolüdür.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!<=i.Df+Bp)warnings.push('YASS temel tabanına yakın/üstünde: sürşarj ve γ′/ağırlıklı γ dikkate alındı.')
  if(groundSlope>0)warnings.push('Arazi eğimi katsayıları genel kabul görmüş Vesic tipi bağıntılarla uygulanmıştır; β<φ′ koşulu kontrol edildi.')
  if(baseSlope>0)warnings.push('Temel tabanı eğimi katsayıları genel kabul görmüş Vesic tipi bağıntılarla uygulanmıştır.')
  if(foundationType==='radye')warnings.push('Radye temel için taşıma gücünün yanında toplam ve farklı oturma ayrıca kontrol edilmelidir.')
  if(i.groundwaterDepth!=null&&i.groundwaterDepth<=i.Df&&i.undrainedCu==null)warnings.push('Temel YASS altında/aynı kotta ise deprem durumunda 16.8.4.6 gereği cu ile drenajsız kayma ayrıca gereklidir.')

  const steps:SurfaceFoundationStep[]=[
    {symbol:'ex/ey',title:'Yük eksantriklikleri',formula:'ex=My/N ; ey=Mx/N',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
    {symbol:'B′/L′',title:'Taşıma gücü etkin boyutları',formula:'B′=B−2|ex| ; L′=L−2|ey|',value:Math.min(Be,Le),unit:'m',note:'Etkin boyutlar taşıma gücü hesabında kullanılır; temas basıncı dağılımı için qmax/qmin ayrı hesaplanır.'},
    {symbol:'qavg',title:'Gerçek taban ortalama basıncı',formula:'qavg=N/(B·L)',value:qAvg,unit:'kPa'},
    {symbol:'qmax/qmin',title:'Temas basıncı',formula:coreContact?'qmax/min=qavg[1±6|ex|/B±6|ey|/L]':'p=max(0,a+b·x+c·y), ∫p dA=N, ∫p·y dA=Mx, ∫p·x dA=My',value:qMax,unit:'kPa',note:coreContact?'İki eksenli doğrusal basınç dağılımı.':'Çekme gerilmesi sıfırlanarak gerçek kısmi temas alanı nümerik olarak çözüldü.'},
    {symbol:'Nq/Nc/Nγ',title:'Taşıma gücü katsayıları',formula:'Nq=e^(πtanφ)tan²(45°+φ/2); Nc=(Nq−1)cotφ; Nγ=2(Nq−1)tanφ',value:ef.Nq,note:method==='TBDY-2018'?'TBDY 2018 Denk. 16.8b':''},
    {symbol:'s',title:'Şekil katsayıları',formula:'sc,sq,sγ',value:mf.sc},
    {symbol:'d',title:'Derinlik katsayıları',formula:'dc,dq,dγ',value:mf.dc},
    {symbol:'i',title:'Yük eğikliği katsayıları',formula:'ic,iq,iγ',value:mf.ic},
    {symbol:'g',title:'Arazi eğimi katsayıları',formula:'gc,gq,gγ',value:mf.gc},
    {symbol:'b',title:'Temel tabanı eğimi katsayıları',formula:'bc,bq,bγ',value:mf.bc},
    {symbol:'qk',title:'Karakteristik taşıma gücü',formula:'cNcscdcicgc bc + qNqsqdqiqgq bq + 0.5γ′B′Nγsγdγiγgγbγ',value:qk,unit:'kPa'},
    {symbol:'qt',title:'Tasarım taşıma gücü',formula:'qt=qk/γRv',value:qt,unit:'kPa'},
    {symbol:'q0',title:'Etkin alan ortalama basıncı',formula:'q0=N/(B′L′)',value:qo,unit:'kPa'},
    {symbol:'η',title:'Taşıma gücü kullanım oranı',formula:'η=q0/qt',value:utilization}
  ]

  const value={Nq:ef.Nq,Nc:ef.Nc,Ngamma:ef.Ngamma,sc:mf.sc,sq:mf.sq,sg:mf.sg,dc:mf.dc,dq:mf.dq,dg:mf.dg,ic:mf.ic,iq:mf.iq,ig:mf.ig,gc:mf.gc,gq:mf.gq,gg:mf.gg,bc:mf.bc,bq:mf.bq,bg:mf.bg,surcharge:water.surcharge,gammaBelow:representativeGamma,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp}
  return{
    Nq:ef.Nq,Nc:ef.Nc,Ngamma:ef.Ngamma,...mf,surcharge:water.surcharge,gammaBelow:representativeGamma,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp,
    qAvg,qMax,qMin,contactState,coreContact,
    representativeC,representativePhi,representativeGamma,ultimateClassical:qk,allowableClassical:qk/Math.max(i.safetyFactor??3,1e-9),
    undrainedQk:i.undrainedCu!=null?i.undrainedCu*5.14*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+water.surcharge:undefined,
    layeredScreeningOnly:Boolean(i.layers?.length),finalDesignEligible:!i.layers?.length||layeredComplete,
    layerChecks:checks,warnings,method,foundationType,
    source:'TBDY 2018 16.8.3.1–16.8.3.4; tabakalı zemin için 2B′ etki derinliğinde eşdeğer parametre mühendislik yaklaşımı; eğim katsayıları genel kabul görmüş Vesic tipi bağıntılar.',
    steps,value
  }
}
