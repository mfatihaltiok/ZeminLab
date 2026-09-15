import type { ScreenDefinition } from './screen-types'

export const screenDefinitions: Record<string, ScreenDefinition> = {
  'project-info': {
    id: 'project-info',
    title: 'Proje Bilgileri',
    category: 'PROJE'
  },

  'site-info': {
    id: 'site-info',
    title: 'Saha Bilgileri',
    category: 'PROJE'
  },

  boreholes: {
    id: 'boreholes',
    title: 'Sondajlar',
    category: 'SAHA VERİLERİ'
  },

  spt: {
    id: 'spt',
    title: 'SPT Kayıtları',
    category: 'SAHA VERİLERİ'
  },

  laboratory: {
    id: 'laboratory',
    title: 'Laboratuvar',
    category: 'SAHA VERİLERİ'
  },

  'soil-profile': {
    id: 'soil-profile',
    title: 'Zemin Profili',
    category: 'SAHA VERİLERİ'
  },

  'soil-parameters': {
    id: 'soil-parameters',
    title: 'Zemin Parametreleri',
    category: 'ANALİZ'
  },

  'bearing-capacity': {
    id: 'bearing-capacity',
    title: 'Taşıma Gücü',
    category: 'ANALİZ'
  },

  settlement: {
    id: 'settlement',
    title: 'Oturma',
    category: 'ANALİZ'
  },

  liquefaction: {
    id: 'liquefaction',
    title: 'Sıvılaşma',
    category: 'ANALİZ'
  },

  foundation: {
    id: 'foundation',
    title: 'Temel',
    category: 'TASARIM'
  },

  'jet-grout': {
    id: 'jet-grout',
    title: 'Jet Grout',
    category: 'TASARIM'
  },

  'calculation-check': {
    id: 'calculation-check',
    title: 'Hesap Kontrolü',
    category: 'RAPOR'
  },

  'engineering-report': {
    id: 'engineering-report',
    title: 'Mühendislik Raporu',
    category: 'RAPOR'
  }
}
