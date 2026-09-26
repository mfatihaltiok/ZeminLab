import type { ProjectInfo } from '../models/project'
import { forceToBase, stressToBase, unitWeightToBase, momentToBase } from '../units/project-units'

/** UI/proje değerlerini tek noktadan SI tabanlı mühendislik motorlarına dönüştürür. */
export function toEngineeringSI(project:ProjectInfo){
  const u=project.unitSystem
  const soil=project.soilParameters
  const fp=project.foundationParameters
  return {
    soil:{...soil,unitWeight:unitWeightToBase(soil.unitWeight,u),saturatedUnitWeight:unitWeightToBase(soil.saturatedUnitWeight,u),cohesion:stressToBase(soil.cohesion,u),undrainedCohesion:soil.undrainedCohesion==null?undefined:stressToBase(soil.undrainedCohesion,u)},
    foundation:{...fp,verticalLoad:forceToBase(fp.verticalLoad,u),horizontalLoad:forceToBase(fp.horizontalLoad,u),momentX:momentToBase(fp.momentX,u),momentY:momentToBase(fp.momentY,u),structuralWeight:forceToBase(fp.structuralWeight,u),vtX:forceToBase(fp.vtX,u),vtY:forceToBase(fp.vtY,u),passiveResistanceCharacteristic:stressToBase(fp.passiveResistanceCharacteristic,u)},
    unitSystem:'kN-m' as const
  }
}

export function actionsToEngineeringSI(actions:{vertical?:number;vx?:number;vy?:number;mx?:number;my?:number},unitSystem:ProjectInfo['unitSystem']){
  return {vertical:actions.vertical==null?undefined:forceToBase(actions.vertical,unitSystem),vx:actions.vx==null?undefined:forceToBase(actions.vx,unitSystem),vy:actions.vy==null?undefined:forceToBase(actions.vy,unitSystem),mx:actions.mx==null?undefined:momentToBase(actions.mx,unitSystem),my:actions.my==null?undefined:momentToBase(actions.my,unitSystem)}
}
