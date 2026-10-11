# ZeminLab

ZeminLab, Electron, React ve TypeScript ile geliştirilen masaüstü geoteknik mühendisliği uygulamasıdır.

## Mühendislik kapsamı

- Sondaj, zemin tabakaları, SPT ve laboratuvar parametreleri
- TBDY 2018 kapsamında temel taşıma gücü ve ilgili temel kontrolleri
- Oturma ve sıvılaşma değerlendirmeleri
- Jet Grout zemin iyileştirmesi için ön değerlendirme ve doğrulama akışları
- Hesap izleri, uyarılar ve raporlama altyapısı

**Mühendislik notu:** Bir hesabın yazılım tarafından üretilebilmesi, tek başına yönetmelik uygunluğu veya nihai tasarım onayı anlamına gelmez. Her yöntem için girdiler, birimler, varsayımlar, geçerlilik sınırları ve tasarım kapsamı ayrıca doğrulanmalıdır. Tabakalı zemin ve iyileştirme hesapları, ilgili motor açıkça nihai tasarıma uygun olduğunu belirtmediği sürece ön değerlendirme olarak ele alınmalıdır.

## Belge işleme durumu

OCR, görsel tarama ve belge-istihbaratı özellikleri uygulamanın kapsamından çıkarılmıştır. Bu README, kaldırılmış OCR sağlayıcılarını, OCR kurulum adımlarını veya API anahtarı ayarlarını uygulamanın güncel özellikleri olarak tanımlamaz.

## Geliştirme

```bash
npm install
npm run dev
```

## Doğrulama

```bash
npm run typecheck
npm run test:engineering
npm run build
```

Bu komutların başarılı çalışması gerekir; sonuçlar CI veya yerel çalışma çıktılarıyla doğrulanmadan testlerin geçtiği varsayılmamalıdır.
