import { EROL_REFERENCES } from '../provenance/erol-sources'

export type ReportFigureUse =
  | 'spt'
  | 'cpt'
  | 'pmt'
  | 'dmt'
  | 'fvt'
  | 'soil-parameter'
  | 'bearing'
  | 'settlement'
  | 'liquefaction'
  | 'jet-grout'
  | 'quality-control'

export interface ErolSourceFigure {
  id: string
  sourceKey: string
  use: ReportFigureUse
  title: string
  sourceSection: string
  sourcePage?: number
  sourceFigure?: string
  caption: string
  selectionKeywords: string[]
  requiresUserDataOverlay?: boolean
}

/**
 * Figure/abacus catalog. The report engine uses this metadata to select only
 * figures relevant to the active calculation. Source PDFs are kept as local
 * source-pack assets, so the report can remain offline after installation.
 *
 * Exact page/figure identifiers are intentionally populated only after the
 * corresponding publisher PDF has been locally indexed. This prevents a
 * guessed page number from becoming a false engineering citation.
 */
export const EROL_SOURCE_FIGURES: ErolSourceFigure[] = [
  {
    id: 'EROL2014-SPT-CORRECTIONS',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'spt',
    title: 'SPT düzeltmeleri ve deney düzeni',
    sourceSection: 'Bölüm 1 · Standart Penetrasyon Deneyi',
    caption: 'Kaynak: Erol & Çekinmez (2014), SPT bölümü.',
    selectionKeywords: ['SPT', 'N60', 'CE', 'CB', 'CR', 'CS', 'düzeltme']
  },
  {
    id: 'EROL2014-SPT-CORRELATIONS',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'soil-parameter',
    title: 'SPT-zemin parametresi korelasyonları',
    sourceSection: 'Bölüm 1.6 · SPT – Zemin Parametreleri Korelasyonları',
    caption: 'Kaynak: Erol & Çekinmez (2014), korelasyonlar bölümü.',
    selectionKeywords: ['SPT', 'phi', 'Dr', 'Es', 'su', 'korelasyon']
  },
  {
    id: 'EROL2014-BEARING',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'bearing',
    title: 'Saha deneylerinden taşıma gücü yaklaşımları',
    sourceSection: 'Bölüm 1.7 / 2.7 / 3.7 · Sığ Temel Tasarımı',
    caption: 'Kaynak: Erol & Çekinmez (2014), saha deneyi esaslı taşıma gücü yaklaşımları.',
    selectionKeywords: ['taşıma gücü', 'bearing', 'SPT', 'CPT', 'PMT']
  },
  {
    id: 'EROL2014-SETTLEMENT',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'settlement',
    title: 'Saha deneyi esaslı oturma yaklaşımları',
    sourceSection: 'Sığ Temel Tasarımı · Oturma Tahmini',
    caption: 'Kaynak: Erol & Çekinmez (2014), oturma tahmini bölümü.',
    selectionKeywords: ['oturma', 'settlement', 'SPT', 'CPT', 'PMT', 'DMT']
  },
  {
    id: 'EROL2014-LIQUEFACTION',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'liquefaction',
    title: 'SPT/CPT ile sıvılaşma değerlendirmesi',
    sourceSection: 'SPT’den Sıvılaşma Değerlendirmesi',
    caption: 'Kaynak: Erol & Çekinmez (2014), sıvılaşma değerlendirmesi bölümü.',
    selectionKeywords: ['sıvılaşma', 'liquefaction', 'CSR', 'CRR', 'SPT', 'CPT']
  },
  {
    id: 'EROL2014-SOIL-PARAMETERS',
    sourceKey: 'EROL-CHEKINMEZ-2014',
    use: 'soil-parameter',
    title: 'Zemin parametresi seçimi korelasyonları',
    sourceSection: 'Bölüm 6 · Zemin Parametresi Seçimine Yönelik Korelasyonlar',
    caption: 'Kaynak: Erol & Çekinmez (2014), Bölüm 6.',
    selectionKeywords: ['geçirgenlik', 'konsolidasyon', 'kayma dayanımı', 'yatak katsayısı', 'korelasyon']
  },
  {
    id: 'EROL2018-JET-INTERACTION',
    sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET',
    use: 'jet-grout',
    title: 'Jet-zemin etkileşimi ve kolon oluşumu',
    sourceSection: 'Jet Enjeksiyon Yöntemi · Jet-zemin etkileşimi',
    caption: 'Kaynak: Erol & Çekinmez Bayram (2018), Jet Enjeksiyon Yöntemi.',
    selectionKeywords: ['jet-zemin', 'erozyon', 'nüfuz', 'yoğrulma', 'kolon çapı']
  },
  {
    id: 'EROL2018-JET-DESIGN',
    sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET',
    use: 'jet-grout',
    title: 'Jet Grout tasarım ve geometrik düzenleme',
    sourceSection: 'Jet Enjeksiyon Yöntemi · Tasarım / geometrik düzenleme',
    caption: 'Kaynak: Erol & Çekinmez Bayram (2018), tasarım ve uygulama paterni bölümleri.',
    selectionKeywords: ['tasarım', 'kolon', 'çap', 'aralık', 'patern', 'kompozit']
  },
  {
    id: 'EROL2018-JET-QC',
    sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET',
    use: 'quality-control',
    title: 'Jet Grout kalite kontrol ve doğrulama',
    sourceSection: 'Jet Enjeksiyon Yöntemi · Kalite kontrol ve denetim',
    caption: 'Kaynak: Erol & Çekinmez Bayram (2018), kalite kontrol ve denetim bölümü.',
    selectionKeywords: ['karot', 'jeofizik', 'permeabilite', 'kalite kontrol', 'denetim']
  }
]

export function selectErolFigures(use: ReportFigureUse): ErolSourceFigure[] {
  return EROL_SOURCE_FIGURES.filter(figure => figure.use === use)
}

export function getErolSourceForFigure(figureId: string) {
  const figure = EROL_SOURCE_FIGURES.find(item => item.id === figureId)
  return figure ? EROL_REFERENCES.find(source => source.key === figure.sourceKey) : undefined
}
