export interface StressLayer{top:number;bottom:number;gamma:number;gammaSat?:number}
export interface StressAtDepthResult{sigmaV:number;porePressure:number;sigmaVPrime:number;covered:number}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)

/** Tek otoriter düşey toplam/efektif gerilme integrasyonu. Birimler: m, kPa, kN/m³. */
export function effectiveStressAtDepth(depth:number,layers:StressLayer[],groundwaterDepth:number,gammaW=9.80665):StressAtDepthResult{
  if(!finite(depth)||depth<0)throw new Error('Gerilme hesabı derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(!finite(groundwaterDepth)||groundwaterDepth<0)throw new Error('Yeraltı suyu derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(!finite(gammaW)||gammaW<=0)throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
  if(layers.some(x=>![x.top,x.bottom,x.gamma].every(finite)||x.top<0||x.bottom<=x.top||x.gamma<=0||(x.gammaSat!=null&&(!finite(x.gammaSat)||x.gammaSat<=gammaW))))throw new Error('Gerilme profili tabaka derinliği, γ veya γsat verisi geçersiz.')
  const ordered=[...layers].sort((a,b)=>a.top-b.top)
  for(let i=1;i<ordered.length;i++)if(ordered[i].top<ordered[i-1].bottom-1e-9)throw new Error('Gerilme profili çakışan tabakalar içeremez.')
  let sigmaV=0,covered=0
  for(const layer of ordered){
    const top=Math.max(0,layer.top),bottom=Math.min(depth,layer.bottom)
    if(bottom<=top)continue
    covered+=bottom-top
    const dry=Math.max(0,Math.min(bottom,groundwaterDepth)-top)
    const sat=bottom-top-dry
    if(!finite(layer.gamma)||layer.gamma<=0)throw new Error('Zemin tabakalarında γ pozitif ve sonlu olmalıdır.')
    if(sat>0&&layer.gammaSat==null)throw new Error('YASS altındaki tabakada γsat eksik; doğal γ ile efektif gerilme hesaplanamaz.')
    const gammaSat=layer.gammaSat??layer.gamma
    if(!finite(gammaSat)||gammaSat<=gammaW&&sat>0)throw new Error('YASS altındaki zemin tabakasında γsat, γw değerinden büyük olmalıdır.')
    sigmaV+=dry*layer.gamma+sat*gammaSat
  }
  if(covered<depth-1e-6)throw new Error('Gerilme profili hesap derinliğine kadar sürekli değildir.')
  const porePressure=Math.max(0,depth-groundwaterDepth)*gammaW
  return{sigmaV,porePressure,sigmaVPrime:Math.max(0,sigmaV-porePressure),covered}
}
