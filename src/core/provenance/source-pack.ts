import { EROL_REFERENCES } from './erol-sources'

export type SourcePackKind = 'pdf'
export interface SourcePackDocument {
  key: string
  title: string
  localFile: string
  officialUrl: string
  sourceKey: string
  requiredFor: string[]
}

export interface IndexedFigure {
  id: string
  sourceKey: string
  page: number
  imagePath: string
  caption?: string
  figureLabel?: string
  keywords: string[]
}

export const SOURCE_PACK_VERSION = 1
export const SOURCE_PACK_DOCUMENTS: SourcePackDocument[] = [
  {
    key: 'erol-field-tests-2014',
    title: 'Geoteknik Mühendisliğinde Saha Deneyleri',
    localFile: 'source-pack/erol-2014/saha-deneyleri-2014.pdf',
    officialUrl: EROL_REFERENCES.find(x => x.key === 'EROL-CHEKINMEZ-2014')!.url,
    sourceKey: 'EROL-CHEKINMEZ-2014',
    requiredFor: ['spt', 'cpt', 'bearing', 'settlement', 'liquefaction', 'soil-parameters']
  },
  {
    key: 'erol-jet-2018',
    title: 'Jet Enjeksiyon Yöntemi',
    localFile: 'source-pack/erol-2018/jet-enjeksiyon-2018.pdf',
    officialUrl: EROL_REFERENCES.find(x => x.key === 'EROL-CHEKINMEZ-BAYRAM-2018-JET')!.url,
    sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET',
    requiredFor: ['jet-grout', 'quality-control']
  }
]

export function selectSourcePackFigures(index: IndexedFigure[], use: string, limit = 6): IndexedFigure[] {
  const wanted = use.toLowerCase()
  return index
    .filter(f => f.keywords.some(k => k.toLowerCase().includes(wanted) || wanted.includes(k.toLowerCase())))
    .slice(0, Math.max(0, limit))
}

export function sourcePackStatus(index: IndexedFigure[]): { installed: boolean; figureCount: number; documents: string[] } {
  return {
    installed: index.length > 0,
    figureCount: index.length,
    documents: SOURCE_PACK_DOCUMENTS.map(x => x.key)
  }
}
