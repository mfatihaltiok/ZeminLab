export type SourceKind='regulation'|'standard'|'method'
export type ComplianceStatus='verified'|'method-based'|'requires-project-verification'
export interface EngineeringSource{key:string;title:string;kind:SourceKind;reference:string;status:ComplianceStatus;note:string}
export const ENGINEERING_SOURCES:EngineeringSource[]=[
{key:'TBDY-16A',title:'Zemin Araştırmaları',kind:'regulation',reference:'TBDY 2018 Ek 16A',status:'verified',note:'Sondaj, arazi deneyleri ve laboratuvar araştırmalarının genel kuralları.'},
{key:'TBDY-16B',title:'Basitleştirilmiş Zemin Sıvılaşma Değerlendirmesi',kind:'regulation',reference:'TBDY 2018 Ek 16B',status:'verified',note:'SPT düzeltmeleri, sıvılaşma direnci ve depremde oluşan kayma gerilmesi.'},
{key:'AFAD-TDTH',title:'Türkiye Deprem Tehlike Haritası',kind:'standard',reference:'AFAD TDTH',status:'verified',note:'Ss/S1 gibi tehlike parametreleri proje konumuna göre doğrulanmalıdır.'},
{key:'EROL-CHEKINMEZ-2014',title:'Geoteknik Mühendisliğinde Saha Deneyleri',kind:'method',reference:'Erol & Çekinmez (2014), Yüksel Proje Yayınları No: 14-01',status:'method-based',note:'SPT/CPT/PMT/DMT/FVT, saha deneyi düzeltmeleri, zemin parametresi korelasyonları, taşıma gücü, oturma, kazık, sıvılaşma ve zemin iyileştirme bağıntıları için kaynak.'},
{key:'EROL-CHEKINMEZ-BAYRAM-2018-JET',title:'Jet Enjeksiyon Yöntemi',kind:'method',reference:'Erol & Çekinmez Bayram (2018), Yüksel Proje Uluslararası A.Ş.',status:'method-based',note:'Jet-zemin etkileşimi, kolon özellikleri, kompozit zemin, geometrik düzen, uygulama ve kalite kontrolü için ana Jet Grout kaynağı.'},
{key:'BEARING',title:'Taşıma Gücü',kind:'method',reference:'Terzaghi / Meyerhof / Hansen / Vesic + Erol & Çekinmez (2014) saha-deneyi yaklaşımları',status:'method-based',note:'Yönetmelik maddesi olarak değil seçilen geoteknik yöntem olarak raporlanır.'},
{key:'SETTLEMENT',title:'Oturma',kind:'method',reference:'Elastik, konsolidasyon ve Erol & Çekinmez (2014) saha-deneyi yaklaşımları',status:'method-based',note:'Parametrelerin deneysel dayanağı ve tabaka bazlı varsayımlar raporlanır.'},
{key:'FOUNDATION',title:'Betonarme Temel',kind:'standard',reference:'TBDY 2018 + TS 500 tasarım girdileri',status:'requires-project-verification',note:'Yapısal yükler, malzeme sınıfları, zemin tepkisi ve detaylandırma proje özelinde doğrulanmalıdır.'},
{key:'JET-GROUT',title:'Jet Grout',kind:'method',reference:'Erol & Çekinmez Bayram (2018) + proje deneyleri',status:'requires-project-verification',note:'Kolon dayanımı, çap, aralık, süreklilik ve yük paylaşımı saha/şantiye deneyleriyle kalibre edilmelidir.'}
]
