export interface StressLayer{top:number;bottom:number;gamma:number;gammaSat?:number}
export interface StressAtDepthResult{sigmaV:number;porePressure:number;sigmaVPrime:number;covered:number}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)

/** Tek otoriter düşey toplam/efektif gerilme integrasyonu. Birimler: m, kPa, kN/m³. */
export function effectiveStressAtDepth(depth:number,layers:StressLayer[],groundwaterDepth:number,gammaW=9.81):StressAtDepthResult{
  if(!finite(depth)||depth<0)throw new Error('Gerilme hesabı derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(!finite(groundwaterDepth)||groundwaterDepth<0)throw new Error('Yeraltı suyu derinliği negatif olmayan sonlu bir değer olmalıdır.')
  if(!finite(gammaW)||gammaW<=0)throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
  let sigmaV=0,covered=0
  for(const layer of [...layers].filter(x=>finite(x.top)&&finite(x.bottom)&&x.bottom>x.top).sort((a,b)=>a.top-b.top)){
    const top=Math.max(0,layer.top),bottom=Math.min(depth,layer.bottom)
    if(bottom<=top)continue
    covered+=bottom-top
    const dry=Math.max(0,Math.min(bottom,groundwaterDepth)-top)
    const sat=bottom-top-dry
    if(!finite(layer.gamma)||layer.gamma<=0)throw new Error('Zemin tabakalarında γ pozitif ve sonlu olmalıdır.')
    const gammaSat=layer.gammaSat??layer.gamma
    if(!finite(gammaSat)||gammaSat<=0)throw new Error('Zemin tabakalarında γsat pozitif ve sonlu olmalıdır.')
    sigmaV+=dry*layer.gamma+sat*gammaSat
  }
  const porePressure=Math.max(0,depth-groundwaterDepth)*gammaW
  return{sigmaV,porePressure,sigmaVPrime:Math.max(0,sigmaV-porePressure),covered}
}
