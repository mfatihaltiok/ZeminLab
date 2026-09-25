import type { ScreenDefinition } from './screen-types'
export const screenDefinitions:Record<string,ScreenDefinition>={
  dashboard:{id:'dashboard',title:'Kontrol Paneli',category:'PROJE'},
  'project-info':{id:'project-info',title:'Proje Bilgileri',category:'PROJE'},
  field:{id:'field',title:'Saha Araştırması',category:'SAHA VERİLERİ'},
  'borehole-log':{id:'borehole-log',title:'Sondaj Logu',category:'SAHA VERİLERİ'},
  profile:{id:'profile',title:'İdealize Zemin Profili',category:'ANALİZ'},
  'bearing-capacity':{id:'bearing-capacity',title:'Taşıma Gücü',category:'ANALİZ'},
  settlement:{id:'settlement',title:'Oturma',category:'ANALİZ'},
  liquefaction:{id:'liquefaction',title:'Sıvılaşma',category:'ANALİZ'},
  foundation:{id:'foundation',title:'Temel',category:'TASARIM'},
  'jet-grout':{id:'jet-grout',title:'Jet Grout',category:'TASARIM'},
  report:{id:'report',title:'Mühendislik Raporu',category:'RAPOR'}
}
