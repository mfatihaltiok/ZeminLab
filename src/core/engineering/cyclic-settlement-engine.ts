export interface CyclicSettlementLayerInput {
  topDepth:number
  bottomDepth:number
  n1_60cs?:number
  maxCyclicShearStrain?:number
  saturated:boolean
  liquefactionFactorOfSafety?:number
  soilType?:string
}

export interface CyclicSettlementInput {
  layers:CyclicSettlementLayerInput[]
  maxDepth?:number
  method?:'ishihara-yoshimine-1992'
}

export interface CyclicSettlementLayerResult {
  topDepth:number
  bottomDepth:number
  thickness:number
  n1_60cs?:number
  maxCyclicShearStrain?:number
  liquefactionFactorOfSafety?:number
  volumetricStrain?:number
  settlement:number
  status:'HESAPLANDI'|'VERİ EKSİK'|'KAPSAM DIŞI'
  note:string
}

export interface CyclicSettlementResult {
  method:'ishihara-yoshimine-1992'
  layers:CyclicSettlementLayerResult[]
  totalSettlement:number
  ready:boolean
  warnings:string[]
  source:string
}

const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)

function volumetricStrain(n1_60cs:number,gammaMax:number){
  /*
   * Idriss & Boulanger's analytical approximation of the
   * Ishihara-Yoshimine post-liquefaction volumetric-strain curves:
   * epsilon_v(%) = 1.5 exp(-0.369 sqrt((N1)60,CS)) min(0.08, gamma_max)
   * gamma_max is dimensionless; epsilon_v is returned as a decimal.
   */
  const boundedGamma=Math.min(0.08,Math.max(0,gammaMax))
  return 1.5*Math.exp(-0.369*Math.sqrt(n1_60cs))*boundedGamma/100
}

export function calculateCyclicSettlement(input:CyclicSettlementInput):CyclicSettlementResult{
  const warnings:string[]=[]
  const results:CyclicSettlementLayerResult[]=[]
  let totalSettlement=0

  for(const layer of [...input.layers].sort((a,b)=>a.topDepth-b.topDepth)){
    const top=Math.max(0,layer.topDepth)
    const bottom=Math.max(top,layer.bottomDepth)
    const thickness=bottom-top
    if(thickness<=0){
      results.push({topDepth:top,bottomDepth:bottom,thickness,settlement:0,status:'VERİ EKSİK',note:'Tabaka kalınlığı pozitif olmalıdır.'})
      continue
    }
    if(!layer.saturated){
      results.push({topDepth:top,bottomDepth:bottom,thickness,settlement:0,status:'KAPSAM DIŞI',note:'Bu korelasyon doygun kohezyonsuz zeminlerin çevrimsel/sıvılaşma sonrası hacimsel şekil değiştirmesi için kullanılır.'})
      continue
    }
    if(!finite(layer.n1_60cs)||layer.n1_60cs<=0||!finite(layer.maxCyclicShearStrain)||layer.maxCyclicShearStrain<0){
      results.push({topDepth:top,bottomDepth:bottom,thickness,n1_60cs:layer.n1_60cs,maxCyclicShearStrain:layer.maxCyclicShearStrain,liquefactionFactorOfSafety:layer.liquefactionFactorOfSafety,settlement:0,status:'VERİ EKSİK',note:'Ishihara–Yoshimine korelasyonu için (N1)60,CS ve maksimum çevrimsel kayma birim şekil değiştirmesi γmax gerekir.'})
      continue
    }
    const eps=volumetricStrain(layer.n1_60cs,layer.maxCyclicShearStrain)
    const settlement=thickness*eps*1000
    totalSettlement+=settlement
    results.push({topDepth:top,bottomDepth:bottom,thickness,n1_60cs:layer.n1_60cs,maxCyclicShearStrain:layer.maxCyclicShearStrain,liquefactionFactorOfSafety:layer.liquefactionFactorOfSafety,volumetricStrain:eps,settlement,status:'HESAPLANDI',note:'Ishihara–Yoshimine hacimsel şekil değiştirme korelasyonu.'})
  }

  const evaluated=results.filter(x=>x.status!=='KAPSAM DIŞI')
  const ready=evaluated.length>0&&evaluated.every(x=>x.status==='HESAPLANDI')
  if(results.some(x=>x.status==='KAPSAM DIŞI'))warnings.push('Doygun olmayan tabakalar bu korelasyonda çevrimsel hacimsel oturma üretmez; ayrı deprem deformasyon modeli gerekebilir.')
  if(results.some(x=>x.status==='VERİ EKSİK'))warnings.push('Eksik γmax veya (N1)60,CS bulunan tabakalar sıfır oturma kabul edilmedi; sonuç nihai değerlendirme için hazır değildir.')
  if(input.maxDepth!=null&&finite(input.maxDepth)&&results.some(x=>x.bottomDepth>input.maxDepth+1e-9))warnings.push('Hesap derinliği sınırı dışında kalan tabakalar dahil edildi; giriş profilini açıkça sınırlandırın.')
  return{method:'ishihara-yoshimine-1992',layers:results,totalSettlement,ready,warnings,source:'Ishihara & Yoshimine (1992); analitik εv yaklaşımı Idriss & Boulanger kaynaklıdır. Yanal yayılma ve yapı-zemin etkileşimi ayrıca değerlendirilmelidir.'}
}
