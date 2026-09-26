export type EngineeringRenderLayer = {
  id:string
  topDepth:number
  bottomDepth:number
  code?:string
  description?:string
  colorClass?:'fill'|'clay'|'silt'|'sand'|'gravel'|'rock'
  sptN?:number
  sptN60?:number
  gamma?:number
  cohesion?:number
  frictionAngle?:number
  labId?:string
}

export type EngineeringRenderMarker = {
  depth:number
  label:string
  detail?:string
  kind:'spt'|'lab'|'note'
}

export type EngineeringRenderModel = {
  variant:'profile'|'borehole'
  totalDepth:number
  groundwaterDepth?:number
  foundationDepth?:number
  layers:EngineeringRenderLayer[]
  markers:EngineeringRenderMarker[]
}

const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)

export function normalizeEngineeringRenderModel(input:EngineeringRenderModel):EngineeringRenderModel{
  const totalDepth=Math.max(1,finite(input.totalDepth)?input.totalDepth:1)
  const layers=input.layers
    .map((layer,index)=>({
      ...layer,
      id:layer.id||`layer-${index+1}`,
      topDepth:Math.max(0,Math.min(totalDepth,finite(layer.topDepth)?layer.topDepth:0)),
      bottomDepth:Math.max(0,Math.min(totalDepth,finite(layer.bottomDepth)?layer.bottomDepth:totalDepth))
    }))
    .map(layer=>layer.bottomDepth<layer.topDepth?{...layer,bottomDepth:layer.topDepth}:layer)
    .sort((a,b)=>a.topDepth-b.topDepth)

  return {
    ...input,
    totalDepth,
    groundwaterDepth:finite(input.groundwaterDepth)?Math.max(0,Math.min(totalDepth,input.groundwaterDepth)):undefined,
    foundationDepth:finite(input.foundationDepth)?Math.max(0,Math.min(totalDepth,input.foundationDepth)):undefined,
    layers,
    markers:input.markers.filter(marker=>finite(marker.depth)).map(marker=>({...marker,depth:Math.max(0,Math.min(totalDepth,marker.depth))}))
  }
}

export function layerColor(code:string|undefined,colorClass:EngineeringRenderLayer['colorClass']):string{
  if(colorClass==='clay')return'#d8bca5'
  if(colorClass==='silt')return'#cfd7ce'
  if(colorClass==='sand')return'#e5d19c'
  if(colorClass==='gravel')return'#c7cdd0'
  if(colorClass==='rock')return'#b9bec1'
  const c=(code??'').toLowerCase()
  if(c.includes('cl')||c.includes('ci')||c.includes('ch'))return'#d8bca5'
  if(c.includes('si')||c.includes('ml')||c.includes('mh'))return'#cfd7ce'
  if(c.includes('sa'))return'#e5d19c'
  if(c.includes('gr')||c.includes('bo'))return'#c7cdd0'
  if(c.includes('rk')||c.includes('kaya'))return'#b9bec1'
  return'#d9dde0'
}
