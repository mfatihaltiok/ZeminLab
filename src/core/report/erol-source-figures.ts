import { EROL_REFERENCES } from '../provenance/erol-sources'
import type { IndexedFigure } from '../provenance/source-pack'

export type ReportFigureUse = 'spt' | 'cpt' | 'pmt' | 'dmt' | 'fvt' | 'soil-parameter' | 'bearing' | 'settlement' | 'liquefaction' | 'jet-grout' | 'quality-control'
export interface ErolSourceFigure { id: string; sourceKey: string; use: ReportFigureUse; title: string; sourceSection: string; sourcePage?: number; sourceFigure?: string; caption: string; selectionKeywords: string[]; requiresUserDataOverlay?: boolean }

export const EROL_SOURCE_FIGURES: ErolSourceFigure[] = [
  { id: 'EROL2014-SPT-CORRECTIONS', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'spt', title: 'SPT düzeltmeleri ve deney düzeni', sourceSection: 'Bölüm 1 · Standart Penetrasyon Deneyi', caption: 'Kaynak: Erol & Çekinmez (2014), SPT bölümü.', selectionKeywords: ['spt', 'n60', 'ce', 'cb', 'cr', 'cs', 'düzeltme'] },
  { id: 'EROL2014-SPT-CORRELATIONS', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'soil-parameter', title: 'SPT-zemin parametresi korelasyonları', sourceSection: 'Bölüm 1 · SPT-zemin parametreleri korelasyonları', caption: 'Kaynak: Erol & Çekinmez (2014), korelasyonlar bölümü.', selectionKeywords: ['spt', 'phi', 'dr', 'es', 'su', 'korelasyon'] },
  { id: 'EROL2014-BEARING', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'bearing', title: 'Saha deneylerinden taşıma gücü yaklaşımları', sourceSection: 'Sığ temel tasarımı', caption: 'Kaynak: Erol & Çekinmez (2014), saha deneyi esaslı taşıma gücü yaklaşımları.', selectionKeywords: ['taşıma gücü', 'bearing', 'spt', 'cpt', 'pmt'] },
  { id: 'EROL2014-SETTLEMENT', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'settlement', title: 'Saha deneyi esaslı oturma yaklaşımları', sourceSection: 'Sığ temel tasarımı · Oturma', caption: 'Kaynak: Erol & Çekinmez (2014), oturma tahmini bölümü.', selectionKeywords: ['oturma', 'settlement', 'spt', 'cpt', 'pmt', 'dmt'] },
  { id: 'EROL2014-LIQUEFACTION', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'liquefaction', title: 'SPT/CPT ile sıvılaşma değerlendirmesi', sourceSection: 'SPT’den sıvılaşma değerlendirmesi', caption: 'Kaynak: Erol & Çekinmez (2014), sıvılaşma değerlendirmesi.', selectionKeywords: ['sıvılaşma', 'liquefaction', 'csr', 'crr', 'spt', 'cpt'] },
  { id: 'EROL2014-SOIL-PARAMETERS', sourceKey: 'EROL-CHEKINMEZ-2014', use: 'soil-parameter', title: 'Zemin parametresi seçimi korelasyonları', sourceSection: 'Bölüm 6 · Zemin Parametresi Seçimine Yönelik Korelasyonlar', caption: 'Kaynak: Erol & Çekinmez (2014), Bölüm 6.', selectionKeywords: ['geçirgenlik', 'konsolidasyon', 'kayma dayanımı', 'yatak katsayısı', 'korelasyon'] },
  { id: 'EROL2018-JET-INTERACTION', sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET', use: 'jet-grout', title: 'Jet-zemin etkileşimi ve kolon oluşumu', sourceSection: 'Jet Enjeksiyon Yöntemi · Jet-zemin etkileşimi', caption: 'Kaynak: Erol & Çekinmez Bayram (2018).', selectionKeywords: ['jet-zemin', 'erozyon', 'nüfuz', 'yoğrulma', 'kolon çapı'] },
  { id: 'EROL2018-JET-DESIGN', sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET', use: 'jet-grout', title: 'Jet Grout tasarım ve geometrik düzenleme', sourceSection: 'Jet Enjeksiyon Yöntemi · Tasarım / geometrik düzenleme', caption: 'Kaynak: Erol & Çekinmez Bayram (2018).', selectionKeywords: ['tasarım', 'kolon', 'çap', 'aralık', 'patern', 'kompozit'] },
  { id: 'EROL2018-JET-QC', sourceKey: 'EROL-CHEKINMEZ-BAYRAM-2018-JET', use: 'quality-control', title: 'Jet Grout kalite kontrol ve doğrulama', sourceSection: 'Jet Enjeksiyon Yöntemi · Kalite kontrol ve denetim', caption: 'Kaynak: Erol & Çekinmez Bayram (2018).', selectionKeywords: ['karot', 'jeofizik', 'permeabilite', 'kalite kontrol', 'denetim'] }
]

export function selectErolFigures(use: ReportFigureUse): ErolSourceFigure[] { return EROL_SOURCE_FIGURES.filter(x => x.use === use) }
export function getErolSourceForFigure(figureId: string) { const f = EROL_SOURCE_FIGURES.find(x => x.id === figureId); return f ? EROL_REFERENCES.find(x => x.key === f.sourceKey) : undefined }

export interface ReportResolvedFigure extends ErolSourceFigure { indexed?: IndexedFigure; sourceReference?: string }

/** Resolves report figures against the locally indexed PDF without inventing page/figure numbers. */
export function resolveErolFigures(use: ReportFigureUse, index: IndexedFigure[], limit = 3): ReportResolvedFigure[] {
  return selectErolFigures(use).flatMap(f => {
    const candidates = index.filter(x => x.sourceKey === f.sourceKey && f.selectionKeywords.some(k => x.keywords.some(word => word.includes(k.toLowerCase()) || k.toLowerCase().includes(word))))
    return [{ ...f, indexed: candidates[0], sourceReference: EROL_REFERENCES.find(x => x.key === f.sourceKey)?.reference }]
  }).slice(0, Math.max(0, limit))
}
