export interface ErolReference {
  key: string
  title: string
  authors: string
  year: number
  publisher: string
  reference: string
  url: string
  scope: string[]
  reportUse: 'calculation-source' | 'figure-source' | 'calculation-and-figure-source'
}

export const EROL_REFERENCES: ErolReference[] = [
  {
    key: 'EROL-CHEKINMEZ-2014',
    title: 'Geoteknik Mühendisliğinde Saha Deneyleri',
    authors: 'Prof. Dr. A. Orhan Erol; Dr. Zeynep Çekinmez',
    year: 2014,
    publisher: 'Yüksel Proje Yayınları No: 14-01, Ankara',
    reference: 'Erol, A. O. & Çekinmez, Z. (2014), Geoteknik Mühendisliğinde Saha Deneyleri.',
    url: 'https://www.yukselproje.com.tr/uploads/docs/1625148279_geoteknikmuhendisligindesahadeneyleri-mart2016.pdf',
    scope: ['SPT', 'CPT', 'PMT', 'DMT', 'FVT', 'SPT corrections', 'soil parameter correlations', 'bearing capacity', 'settlement', 'pile capacity', 'liquefaction', 'soil improvement correlations'],
    reportUse: 'calculation-and-figure-source'
  },
  {
    key: 'EROL-CHEKINMEZ-BAYRAM-2018-JET',
    title: 'Jet Enjeksiyon Yöntemi',
    authors: 'Prof. Dr. A. Orhan Erol; Dr. Zeynep Çekinmez Bayram',
    year: 2018,
    publisher: 'Yüksel Proje Uluslararası A.Ş., Ankara',
    reference: 'Erol, A. O. & Çekinmez Bayram, Z. (2018), Jet Enjeksiyon Yöntemi.',
    url: 'https://www.yukselproje.com.tr/uploads/docs/1640872640_jet20211223vers09.pdf',
    scope: ['jet-soil interaction', 'jet grout design', 'column geometry', 'mechanical properties', 'composite ground', 'applications', 'geometric patterns', 'quality control', 'verification'],
    reportUse: 'calculation-and-figure-source'
  }
]

export const EROL_SOURCE_KEYS = { fieldTests: 'EROL-CHEKINMEZ-2014', jetGrout: 'EROL-CHEKINMEZ-BAYRAM-2018-JET' } as const
export function getErolReference(key: string): ErolReference | undefined { return EROL_REFERENCES.find(source => source.key === key) }
