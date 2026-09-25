# FALUZMN

FALUZMN, Electron + React + TypeScript tabanlı Windows öncelikli geoteknik mühendislik masaüstü uygulamasıdır.

## v1.0

v1.0 kapsamındaki ana bileşenler:

- A4 mühendislik raporu ve PDF çıktısı
- Proje, sondaj, SPT ve laboratuvar veri yönetimi
- İdealize zemin profili
- TBDY 2018 taşıma gücü, temel kayması ve sıvılaşma kontrolleri
- Çoklu oturma yöntemleri
- Jet Grout ön tasarım / kompozit yaklaşım kontrolleri
- Excel ve DXF yardımcı dışa aktarımları
- SAP2000 / OpenSees için nötr veri aktarım adaptörleri

**OCR, görsel tarama ve belge-istihbarat özellikleri ürün kapsamından çıkarılmıştır.** FALUZMN mühendislik verilerini kullanıcı tarafından girilen/teyit edilen saha ve laboratuvar kayıtlarından yürütür.

## Mühendislik veri ilkeleri

- Hesap motorları kN, kPa, kN/m³, kN·m ve m taban birimlerinde çalışır.
- Kullanıcı arayüzündeki tonf birimleri yalnız giriş/çıkış gösterimidir.
- c′/φ′, Cu, Es ve M/oedometer ayrı mühendislik parametreleridir; birbirine otomatik çevrilmez.
- SPT düzeltmeleri eksikse N60/(N1)60 üretilmez.
- İdealize profil SABİTLENMEDİKÇE oturma hesabı başlatılmaz.
- ZF için saha özel zemin davranış analizi durumu ayrı bir ön koşuldur.
- Tabakalı zemin kontrolleri “ön kontrol” olarak açıkça işaretlenir; homojen formülün yerine sessizce geçirilmez.

## Geliştirme

npm install
npm run dev

Windows derlemesi:

npm run build:win

Mühendislik regresyon testi daha sonra çalıştırılmak üzere npm run test:engineering komutunda tutulur.