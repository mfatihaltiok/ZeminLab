export type ScreenId =
  | 'project-info'
  | 'site-info'
  | 'boreholes'
  | 'spt'
  | 'laboratory'
  | 'soil-profile'
  | 'soil-parameters'
  | 'bearing-capacity'
  | 'settlement'
  | 'liquefaction'
  | 'foundation'
  | 'jet-grout'
  | 'calculation-check'
  | 'engineering-report'

export interface ScreenDefinition {
  id: ScreenId
  title: string
  category: string
}
