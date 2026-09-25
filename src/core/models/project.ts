export type UnitSystem='ton-m'|'kN-m'
export type FoundationType='tekil'|'surekli'|'radye'
export type SoilClassificationSystem='TS EN ISO 14688-2'|'TBDY 2018'
export type SoilClassificationCode='CIL'|'CIM'|'CIH'|'SiL'|'SiM'|'SiH'|'ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF'
export type BuildingUseClass=1|2|3
export type EarthquakeDesignClass='1'|'1a'|'2'|'2a'|'3'|'3a'|'4'|'4a'

export interface ProjectVisualDocuments{aerialPhoto?:string;layoutPlan?:string;architecturalSection?:string;foundationPlan?:string;foundationStress?:string}
export interface JetGroutProjectParameters{
  columnDiameter?:number
  spacing?:number
  layout?:'square'|'triangular'
  qSoil?:number
  qColumn?:number
  cSoil?:number
  cColumn?:number
  EsSoil?:number
  EsColumn?:number
  foundationThickness?:number
  columnFrictionAngle?:number
  interfaceCohesion?:number
  interfaceFrictionAngle?:number
}
export interface GeophysicalParameters{vs30?:number;soilGroup?:'ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF';soilGroupSource?:'VS30'|'USER'|'SITE_SPECIFIC';siteSpecificResponseAnalysisCompleted?:boolean;source?:string;notes?:string}
export interface SeismicParameters{
  ss?:number;s1?:number;fs?:number;f1?:number;sds?:number;sd1?:number;ta?:number;tb?:number;tl?:number;magnitude?:number
  bks?:BuildingUseClass;dts?:EarthquakeDesignClass
}
export interface SoilClassification{system:SoilClassificationSystem;code?:SoilClassificationCode}
export interface SoilParameters{
  unitWeight:number
  saturatedUnitWeight:number
  cohesion:number
  frictionAngle:number
  undrainedCohesion?:number
  groundwaterDepth?:number
  surfaceSlope:number
  foundationBaseSlope:number
  finesContent:number
  classification:SoilClassification
}
export interface FoundationParameters{
  foundationType:FoundationType
  footingWidth:number
  footingLength:number
  footingDepth:number
  safetyFactor:number
  verticalLoad:number
  horizontalLoad:number
  momentX:number
  momentY:number
  resistanceFactorRv:number
  vtX:number
  vtY:number
  structuralWeight:number
  baseFrictionTanDelta:number
  passiveResistanceCharacteristic:number
  usePassiveResistance:boolean
}

export interface ProjectInfo{
  id:string;title:string;projectNo:string;date:string;location:string;province:string;district:string;address:string;parcelInfo:string;pafta:string;ada:string;parsel:string;zoningStatus:string
  engineer:string;clientName:string;firmName:string;buildingType:string;basementCount:number;normalFloorCount:number;unitSystem:UnitSystem
  geophysical:GeophysicalParameters;seismic:SeismicParameters;soilParameters:SoilParameters;foundationParameters:FoundationParameters;jetGrout:JetGroutProjectParameters;visualDocuments:ProjectVisualDocuments
}

export const defaultProjectInfo:ProjectInfo={
  id:'',title:'',projectNo:'',date:'',location:'',province:'',district:'',address:'',parcelInfo:'',pafta:'',ada:'',parsel:'',zoningStatus:'',
  engineer:'',clientName:'',firmName:'',buildingType:'',basementCount:0,normalFloorCount:0,unitSystem:'ton-m',
  geophysical:{soilGroupSource:'VS30',siteSpecificResponseAnalysisCompleted:false},
  seismic:{},
  soilParameters:{unitWeight:0,saturatedUnitWeight:0,cohesion:0,frictionAngle:0,undrainedCohesion:undefined,groundwaterDepth:undefined,surfaceSlope:0,foundationBaseSlope:0,finesContent:0,classification:{system:'TS EN ISO 14688-2'}},
  foundationParameters:{
    foundationType:'tekil',footingWidth:0,footingLength:0,footingDepth:0,safetyFactor:3,verticalLoad:0,horizontalLoad:0,momentX:0,momentY:0,
    resistanceFactorRv:1.4,vtX:0,vtY:0,structuralWeight:0,baseFrictionTanDelta:0.6,passiveResistanceCharacteristic:0,usePassiveResistance:false
  },
  jetGrout:{layout:'square'},
  visualDocuments:{}
}

export function classifyVs30(vs30?:number):GeophysicalParameters['soilGroup']{
  if(vs30===undefined||!Number.isFinite(vs30)||vs30<=0)return undefined
  if(vs30>=1500)return'ZA'
  if(vs30>=760)return'ZB'
  if(vs30>=360)return'ZC'
  if(vs30>=180)return'ZD'
  return'ZE'
}

export function calculateSdsSeismic(ss?:number,fs?:number):number|undefined{
  if(!Number.isFinite(ss)||!Number.isFinite(fs)||ss!<0||fs!<=0)return undefined
  return ss!*fs!
}

export function calculateSd1Seismic(s1?:number,f1?:number):number|undefined{
  if(!Number.isFinite(s1)||!Number.isFinite(f1)||s1!<0||f1!<=0)return undefined
  return s1!*f1!
}

export function determineDts(sds:number|undefined,bks:BuildingUseClass|undefined):EarthquakeDesignClass|undefined{
  if(!Number.isFinite(sds)||sds!<0||bks===undefined)return undefined
  if(sds<0.33)return bks===1?'4a':'4'
  if(sds<0.50)return bks===1?'3a':'3'
  if(sds<0.75)return bks===1?'2a':'2'
  return bks===1?'1a':'1'
}

export function normalizeProjectInfo(value:Partial<ProjectInfo>):ProjectInfo{
  const soil={...defaultProjectInfo.soilParameters,...(value.soilParameters??{})}
  const foundation={...defaultProjectInfo.foundationParameters,...(value.foundationParameters??{})}
  const seismic={...defaultProjectInfo.seismic,...(value.seismic??{})}
  const unitSystem:UnitSystem=value.unitSystem==='kN-m'?'kN-m':'ton-m'
  const foundationType:FoundationType=foundation.foundationType==='surekli'||foundation.foundationType==='radye'||foundation.foundationType==='tekil'?foundation.foundationType:'tekil'
  const structuralWeight=Number.isFinite(foundation.structuralWeight)&&foundation.structuralWeight>=0?foundation.structuralWeight:(Number.isFinite(foundation.verticalLoad)?foundation.verticalLoad:0)
  const sds=seismic.sds??calculateSdsSeismic(seismic.ss,seismic.fs)
  const sd1=seismic.sd1??calculateSd1Seismic(seismic.s1,seismic.f1)
  const dts=seismic.dts??determineDts(sds,seismic.bks)
  return {
    ...defaultProjectInfo,...value,unitSystem,
    geophysical:{...defaultProjectInfo.geophysical,...(value.geophysical??{})},
    seismic:{...seismic,sds,sd1,dts},
    soilParameters:{...soil,classification:{...defaultProjectInfo.soilParameters.classification,...(soil.classification??{})}},
    foundationParameters:{...foundation,foundationType,structuralWeight,verticalLoad:structuralWeight},
    jetGrout:{...defaultProjectInfo.jetGrout,...(value.jetGrout??{})},
    visualDocuments:value.visualDocuments??{}
  }
}