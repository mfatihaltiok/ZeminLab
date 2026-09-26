import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../models/idealized-soil-profile'
import type { FoundationType, UnitSystem } from '../models/project'
import { stressToBase, unitWeightToBase } from '../units/project-units'
import { effectiveStressAtDepth as centralEffectiveStressAtDepth } from './stress-profile'

export type IdealizedSettlementMethod='burland-burbidge'|'elasticity'|'2to1-layer'|'boussinesq'|'janbu'|'schmertmann'
type SettlementLayerResult={
  layerId:string;order:number;soilName:string;soilCode:string;topDepth:number;bottomDepth:number;thickness:number;midDepth:number
  sigmaV0:number;porePressure:number;sigmaV0Effective:number;deltaSigma:number;sigmaVFinal:number;sigmaVFinalEffective:number;representativeN60?:number;representativeN1_60?:number
  Es?:number;poissonRatio?:number;immediateSettlement:number;consolidationSettlement:number;secondarySettlement:number;totalSettlement:number;method:string
  status:'HESAPLANDI'|'VERİ EKSİK';note?:string
}
export interface IdealizedSettlementInput{
  profile:IdealizedSoilProfile;method:IdealizedSettlementMethod;B:number;L:number;Df:number;qGross:number;groundwaterDepth?:number
  foundationType?:FoundationType;timeYears?:number;secondaryStartTimeYears?:number;profileUnitSystem?:UnitSystem
}
export interface IdealizedSettlementResult{
  method:IdealizedSettlementMethod;layers:SettlementLayerResult[];totalImmediate:number;totalConsolidation:number;totalSecondary:number;totalSettlement:number
  influenceDepth:number;netFoundationPressure:number;foundationEffectiveStress:number;ready:boolean;warnings:string[];source:string
}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
function isCohesive(layer:IdealizedSoilLayer){
  const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I')
  return /(^|[^A-Z])(CI[LHM]|SI[LHM]|CL|CH|ML|MH)([^A-Z]|$)/.test(code)||code.includes('KIL')||code.includes('SILT')||code.includes('CLAY')||code.includes('ORGANIK')||code.includes('TURBA')
}
function effectiveStressAtDepth(layers:IdealizedSoilLayer[],depth:number,gwt:number){
  const stress=centralEffectiveStressAtDepth(
    depth,
    layers.map(layer=>({top:layer.topDepth,bottom:layer.bottomDepth,gamma:layer.gamma,gammaSat:layer.gammaSat})),
    Math.max(0,gwt)
  )
  return {total:stress.sigmaV,effective:stress.sigmaVPrime,porePressure:stress.porePressure,covered:stress.covered}
}

function stressIncrement2to1(qNet:number,B:number,L:number,z:number){return qNet*B*L/Math.max((B+z)*(L+z),1e-9)}

function gaussNodes8(){
  return [[-0.9602898565,0.1012285363],[-0.7966664774,0.2223810345],[-0.5255324099,0.3137066459],[-0.1834346425,0.3626837834],[0.1834346425,0.3626837834],[0.5255324099,0.3137066459],[0.7966664774,0.2223810345],[0.9602898565,0.1012285363]] as const
}

/* Average vertical stress increment below the centre of a uniformly loaded rectangle.
   The Boussinesq point-load kernel is integrated over the loaded area numerically.
   No m-n chart interpolation is used. */
function boussinesqRectangularAverage(q:number,B:number,L:number,z:number){
  if(q<=0)return 0
  if(z<=0)return Infinity
  let sum=0
  for(const [xi,wi] of gaussNodes8()){
    const x=xi*B/2
    for(const [eta,wj] of gaussNodes8()){
      const y=eta*L/2
      const r2=x*x+y*y+z*z
      sum += wi*wj*(3*z**3)/(2*Math.PI*Math.pow(r2,2.5))
    }
  }
  return q*(B*L/4)*sum
}

function boussinesqInfluenceDepth(B:number,L:number,ratio=0.10){
  let lo=Math.max(0.001,0.01*Math.min(B,L)),hi=20*Math.max(B,L)
  for(let i=0;i<60;i++){
    const mid=(lo+hi)/2
    if(boussinesqRectangularAverage(1,B,L,mid)>ratio)lo=mid
    else hi=mid
  }
  return hi
}

function stressIncrement(qNet:number,B:number,L:number,z:number,method:IdealizedSettlementMethod){
  return method==='boussinesq'?boussinesqRectangularAverage(qNet,B,L,z):stressIncrement2to1(qNet,B,L,z)
}
function burlandSettlement(layer:IdealizedSoilLayer,qNet:number,B:number,L:number,zTop:number,zBottom:number,influenceDepth:number,midDepth:number,gwt:number){
  const rawN=layer.representativeN60
  if(!finite(rawN)||rawN<=0)return{value:0,note:'Burland-Burbidge için temsilci N60/SPT yok.'}
  let n60=rawN
  const code=(layer.soilCode+' '+layer.soilName).toUpperCase().replace(/İ/g,'I')
  const fineSand=code.includes('SISA')||code.includes('SILTY SAND')||code.includes('SM')||code.includes('CLSA')
  if(gwt>=0&&midDepth>=gwt&&fineSand&&n60>15)n60=15+.5*(n60-15)
  n60=clamp(n60,5,60)
  const IcNC=1.71/Math.pow(n60,1.4),IcOC=.57/Math.pow(n60,1.4)
  const pc=layer.preconsolidationPressure
  const oc=finite(pc)&&pc>0
  let Ic=oc&&qNet<=pc?IcOC:IcNC
  const ratio=L/Math.max(B,1e-9),Fs=Math.pow((1.25*ratio)/(ratio+.25),2),Br=.3,sigmaR=100
  const top=Math.max(0,zTop),bottom=Math.min(zBottom,influenceDepth)
  if(bottom<=top)return{value:0,note:'Tabaka etki derinliği dışında.'}
  const fL=(bottom/influenceDepth)*(2-bottom/influenceDepth)-(top/influenceDepth)*(2-top/influenceDepth)
  let qTerm=qNet
  if(oc){
    if(qNet<=pc)qTerm=qNet
    else qTerm=Math.max(0,qNet-.67*pc)
    if(qNet>pc)Ic=IcNC
  }
  const settlementMm=.14*Fs*fL*Ic*Math.pow(B/Br,.7)*(qTerm/sigmaR)*Br*1000
  return{value:Math.max(0,settlementMm),note:'N60='+n60.toFixed(1)+', Ic='+Ic.toFixed(4)+', Fs='+Fs.toFixed(3)+', fL='+fL.toFixed(3)+', '+(oc?'OC':'NC')+' Burland-Burbidge'}
}
function schmertmannIz(z:number,B:number,L:number,qNet:number,sigmaPeak:number){
  const ratio=L/Math.max(B,1e-9)
  const lambda=ratio>=10?1:Math.max(0,(ratio-1)/9)
  const zPeak=B*(.5+.5*lambda)
  const zBottom=B*(2+2*lambda)
  const iz0=.1+.1*lambda
  const izPeak=Math.min(.9,.5+.1*Math.sqrt(Math.max(qNet,0)/Math.max(sigmaPeak,1e-6)))
  if(z<0||z>=zBottom)return 0
  if(z<=zPeak)return iz0+(izPeak-iz0)*z/Math.max(zPeak,1e-9)
  return izPeak*(1-z/zBottom)
}
function consolidationSettlement(layer:IdealizedSoilLayer,thickness:number,sigma0:number,sigma1:number){
  if(!finite(layer.compressionIndexCc)||!finite(layer.initialVoidRatio)||sigma0<=0||sigma1<=sigma0)return{value:0,ok:false}
  const Cc=layer.compressionIndexCc!,Cr=finite(layer.recompressionIndexCr)&&layer.recompressionIndexCr!>=0?layer.recompressionIndexCr!:Cc,e0=layer.initialVoidRatio!,pc=finite(layer.preconsolidationPressure)&&layer.preconsolidationPressure!>sigma0?layer.preconsolidationPressure!:sigma0
  let strain=0
  if(sigma1<=pc)strain=Cr*Math.log10(sigma1/sigma0)
  else{
    strain=Cr*Math.log10(Math.max(pc/sigma0,1))
    strain+=Cc*Math.log10(Math.max(sigma1/pc,1))
  }
  return{value:Math.max(0,thickness*strain/(1+e0)*1000),ok:true}
}

export function calculateIdealizedSettlement(input:IdealizedSettlementInput):IdealizedSettlementResult{
  const {method,B,L,Df,qGross}=input
  const sourceUnit=input.profileUnitSystem??input.profile.unitSystem??'kN-m'
  const profile:IdealizedSoilProfile={...input.profile,layers:input.profile.layers.map(layer=>({...layer,
    gamma:layer.gamma==null?undefined:unitWeightToBase(layer.gamma,sourceUnit),
    gammaSat:layer.gammaSat==null?undefined:unitWeightToBase(layer.gammaSat,sourceUnit),
    cohesion:layer.cohesion==null?undefined:stressToBase(layer.cohesion,sourceUnit),
    constrainedModulus:layer.constrainedModulus==null?undefined:stressToBase(layer.constrainedModulus,sourceUnit),
    oedometricModulus:layer.oedometricModulus==null?undefined:stressToBase(layer.oedometricModulus,sourceUnit),
    preconsolidationPressure:layer.preconsolidationPressure==null?undefined:stressToBase(layer.preconsolidationPressure,sourceUnit)
  })),unitSystem:'kN-m'}
  const warnings:string[]=[]
  const layers=[...profile.layers].sort((a,b)=>a.topDepth-b.topDepth)
  const gwt=finite(input.groundwaterDepth)?input.groundwaterDepth!:-1
  if(profile.status!=='SABİTLENDİ')warnings.push('İdealize Zemin Profili SABİTLENDİ durumunda değil.')
  if(B<=0||L<=0||Df<0||qGross<=0)return{method,layers:[],totalImmediate:0,totalConsolidation:0,totalSecondary:0,totalSettlement:0,influenceDepth:0,netFoundationPressure:0,foundationEffectiveStress:0,ready:false,warnings:[...warnings,'Temel B, L, Df ve yük girdileri geçerli olmalıdır.'],source:'ZeminLab idealize zemin profili oturma motoru'}
  const baseStress=effectiveStressAtDepth(layers,Df,gwt)
  const ratio=L/Math.max(B,1e-9)
  const influenceDepth=method==='burland-burbidge'?1.4*Math.pow(B/.3,.75)*.3:method==='schmertmann'?(ratio>=10?4*B:2*B):method==='boussinesq'?boussinesqInfluenceDepth(B,L,.10):method==='janbu'?Math.max(B,1):2*B
  const coverageLimit=Df+influenceDepth
  let coverageCursor=Df
  let coverageOk=true
  for(const layer of layers){
    if(layer.bottomDepth<=coverageCursor)continue
    const top=Math.max(layer.topDepth,coverageCursor)
    if(top>coverageCursor+1e-9||!finite(layer.gamma)||layer.gamma<=0){coverageOk=false;break}
    coverageCursor=Math.max(coverageCursor,layer.bottomDepth)
    if(coverageCursor>=coverageLimit-1e-9)break
  }
  if(coverageCursor<coverageLimit-1e-9)coverageOk=false
  if(!coverageOk)warnings.push('Temel altındaki oturma etki derinliğinde profil sürekliliği veya γ verisi eksik; eksik tabaka sıfır gerilme ile geçiştirilmez.')
  const qNet=Math.max(0,qGross-baseStress.effective)
  if(qNet<=0)warnings.push('Temel seviyesinde net ilave basınç sıfır/negatif; oturma hesabı yük artışı açısından sınırlıdır.')
  let totalImmediate=0,totalConsolidation=0,totalSecondary=0
  const results:SettlementLayerResult[]=[]
  for(const layer of layers){
    if(layer.bottomDepth<=Df)continue
    const top=Math.max(layer.topDepth,Df),bottom=layer.bottomDepth
    if(bottom<=top)continue
    const effectiveTop=Math.max(top,Df),effectiveBottom=Math.min(bottom,Df+influenceDepth)
    if(effectiveBottom<=effectiveTop)continue
    const thickness=effectiveBottom-effectiveTop,zTop=effectiveTop-Df,zBottom=effectiveBottom-Df,zMid=(zTop+zBottom)/2,midDepth=Df+zMid
    const midStress=effectiveStressAtDepth(layers,midDepth,gwt),deltaSigma=Math.max(0,stressIncrement(qNet,B,L,zMid,method)),finalEffective=midStress.effective+deltaSigma,cohesive=isCohesive(layer)
    let immediate=0,consolidation=0,secondary=0,status:'HESAPLANDI'|'VERİ EKSİK'='HESAPLANDI',methodName='',note=''
    if(method==='burland-burbidge'){
      if(cohesive){
        methodName='Kil/kohezyonlu tabaka: konsolidasyon'
        const r=consolidationSettlement(layer,thickness,midStress.effective,finalEffective)
        if(r.ok)consolidation=r.value;else{status='VERİ EKSİK';note='Cc, e0 ve başlangıç efektif gerilmesi gerekir.'}
      }else{
        methodName='Burland & Burbidge (1985)'
        const r=burlandSettlement(layer,qNet,B,L,zTop,zBottom,influenceDepth,zMid,gwt);immediate=r.value;note=r.note
        if(r.note.includes('yok'))status='VERİ EKSİK'
      }
    }else if(method==='elasticity'){
      methodName='Elastik tabaka gerinimi'
      const M=finite(layer.constrainedModulus)?layer.constrainedModulus:layer.oedometricModulus
      if(finite(M)&&M>0)immediate=deltaSigma*thickness*(1-(finite(layer.poissonRatio)?layer.poissonRatio!:0.3)**2)/M*1000
      else{status='VERİ EKSİK';note='Constrained/oedometric modül gerekir.'}
      if(cohesive){const r=consolidationSettlement(layer,thickness,midStress.effective,finalEffective);if(r.ok)consolidation=r.value;else status='VERİ EKSİK'}
    }else if(method==='boussinesq'){
      methodName='Boussinesq alan integrasyonu + elastik tabaka'
      const M=finite(layer.constrainedModulus)?layer.constrainedModulus:layer.oedometricModulus
      if(finite(M)&&M>0)immediate=deltaSigma*thickness/M*1000
      else{status='VERİ EKSİK';note='Boussinesq tabaka integrasyonu için constrained/oedometric modulus gerekir.'}
    }else if(method==='2to1-layer'){
      methodName='2:1 gerilme yayılımı + elastik tabaka'
      const M=finite(layer.constrainedModulus)?layer.constrainedModulus:layer.oedometricModulus
      if(finite(M)&&M>0)immediate=deltaSigma*thickness*(1-(finite(layer.poissonRatio)?layer.poissonRatio!:0.3)**2)/M*1000;else{status='VERİ EKSİK';note='Constrained/oedometric modül gerekir.'}
    }else if(method==='janbu'){
      methodName='Janbu — M0/M1 verisi gerekli'
      status='VERİ EKSİK'
      note='Gerilme-bağımlı Janbu hesabı için M0 ve M1 parametreleri veri modelinde bulunmadığından elastik M ile Janbu sonucu üretilmez.'
    }else{
      methodName='Schmertmann et al. (1978)'
      const M=finite(layer.constrainedModulus)?layer.constrainedModulus:layer.oedometricModulus
      const sigmaPeak=effectiveStressAtDepth(layers,Df+Math.min(influenceDepth/2,B),gwt).effective
      const Iz=schmertmannIz(zMid,B,L,qNet,sigmaPeak)
      const C1=qNet>0?Math.max(.5,1-.5*baseStress.effective/qNet):1
      const C2=finite(input.timeYears)&&input.timeYears!>=.1?1+.2*Math.log10(input.timeYears!/.1):1
      const C3=ratio>=10?1:Math.max(.73,1.03-.03*ratio)
      if(finite(M)&&M>0)immediate=C1*C2*C3*qNet*Iz*thickness/M*1000
      else{status='VERİ EKSİK';note='Schmertmann için E modülü gerekir.'}
    }
    if(finite(layer.secondaryCompressionIndex)&&layer.secondaryCompressionIndex!>=0&&finite(input.timeYears)&&input.timeYears!>0){
      const start=finite(input.secondaryStartTimeYears)&&input.secondaryStartTimeYears!>0?input.secondaryStartTimeYears!:1
      if(input.timeYears!>start){
        const e0=finite(layer.initialVoidRatio)&&layer.initialVoidRatio!>-1?layer.initialVoidRatio!:0
        secondary=Math.max(0,thickness*layer.secondaryCompressionIndex!*Math.log10(input.timeYears!/start)/(1+e0)*1000)
      }
    }
    totalImmediate+=immediate
    totalConsolidation+=consolidation
    totalSecondary+=secondary
    results.push({layerId:layer.id,order:layer.order,soilName:layer.soilName,soilCode:layer.soilCode,topDepth:top,bottomDepth:bottom,thickness,midDepth,sigmaV0:midStress.total,porePressure:midStress.porePressure,sigmaV0Effective:midStress.effective,deltaSigma,sigmaVFinal:midStress.total+deltaSigma,sigmaVFinalEffective:finalEffective,representativeN60:layer.representativeN60,representativeN1_60:layer.representativeN1_60,Es:layer.constrainedModulus??layer.oedometricModulus,poissonRatio:layer.poissonRatio,immediateSettlement:immediate,consolidationSettlement:consolidation,secondarySettlement:secondary,totalSettlement:immediate+consolidation+secondary,method:methodName,status,note})
  }
  if(results.some(x=>x.status==='VERİ EKSİK'))warnings.push('Bir veya daha fazla tabakada gerekli oturma parametresi eksik; eksik katkılar sıfır kabul edilmez ve sonuç hazırlıksız işaretlenir.')
  if(method==='schmertmann'&&input.timeYears==null)warnings.push('Schmertmann C2=1 alındı; zaman bilgisi girilmediği için creep düzeltmesi yapılmadı.')
  if(method==='janbu')warnings.push('Janbu yöntemi M0–M1 gerilme-bağımlı parametreleri veri modeline eklenene kadar hesaplanmaz; sonuç VERİ EKSİK olarak tutulur.')
  if(method==='burland-burbidge')warnings.push('Burland-Burbidge bağıntısı özellikle kum/granüler zemin için ampirik bir yöntemdir; kohezyonlu tabakalarda ayrı konsolidasyon hesabı yapılır.')
  if(finite(input.timeYears)&&input.timeYears!>0&&input.secondaryStartTimeYears==null&&results.some(x=>x.secondarySettlement>0))warnings.push('İkincil oturma için başlangıç zamanı girilmedi; t1=1 yıl referansı kullanıldı. Proje verisi varsa secondaryStartTimeYears girilmelidir.')
  return{method,layers:results,totalImmediate,totalConsolidation,totalSecondary,totalSettlement:totalImmediate+totalConsolidation+totalSecondary,influenceDepth,netFoundationPressure:qNet,foundationEffectiveStress:baseStress.effective,ready:results.length>0&&coverageOk&&!results.some(x=>x.status==='VERİ EKSİK'),warnings,source:'Burland & Burbidge (1985), Schmertmann et al. (1978), Boussinesq alan integrasyonu, 2:1 gerilme yayılımı. Janbu M0–M1 verisi yoksa sonuç üretilmez.'}
}