export type SourceKind='regulation'|'standard'|'method'
export type ComplianceStatus='verified'|'method-based'|'requires-project-verification'
export interface EngineeringSource{key:string;title:string;kind:SourceKind;reference:string;status:ComplianceStatus;note:string}
export const ENGINEERING_SOURCES:EngineeringSource[]=[
{key:'TBDY-16A',title:'Zemin Araştırmaları',kind:'regulation',reference:'TBDY 2018 Ek 16A',status:'verified',note:'Sondaj, arazi deneyleri ve laboratuvar araştırmalarının genel kuralları.'},
{key:'TBDY-16B',title:'Basitleştirilmiş Zemin Sıvılaşma Değerlendirmesi',kind:'regulation',reference:'TBDY 2018 Ek 16B',status:'verified',note:'SPT düzeltmeleri, sıvılaşma direnci ve depremde oluşan kayma gerilmesi.'},
{key:'AFAD-TDTH',title:'Türkiye Deprem Tehlike Haritası',kind:'standard',reference:'AFAD TDTH',status:'verified',note:'Ss/S1 gibi tehlike parametreleri proje konumuna göre doğrulanmalıdır.'},
{key:'BEARING',title:'Taşıma Gücü',kind:'method',reference:'Terzaghi / Meyerhof / Hansen / Vesic',status:'method-based',note:'Yönetmelik maddesi olarak değil seçilen geoteknik yöntem olarak raporlanır.'},
{key:'SETTLEMENT',title:'Oturma',kind:'method',reference:'Elastik ve konsolidasyon modelleri',status:'method-based',note:'Parametrelerin deneysel dayanağı ve tabaka bazlı varsayımlar raporlanır.'},
{key:'FOUNDATION',title:'Betonarme Temel',kind:'standard',reference:'TBDY 2018 + TS 500 tasarım girdileri',status:'requires-project-verification',note:'Yapısal yükler, malzeme sınıfları, zemin tepkisi ve detaylandırma proje özelinde doğrulanmalıdır.'},
{key:'JET-GROUT',title:'Jet Grout',kind:'method',reference:'Proje deneyleri + seçilen kompozit zemin modeli',status:'requires-project-verification',note:'Kolon dayanımı, çap, aralık, süreklilik ve yük paylaşımı saha/şantiye deneyleriyle kalibre edilmelidir.'}
]
