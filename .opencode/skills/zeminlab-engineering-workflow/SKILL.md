---
name: zeminlab-engineering-workflow
description: ZeminLab için zorunlu mühendislik yazılımı geliştirme, uyumluluk doğrulama, kontrollü değişiklik, gerçek runtime testi ve CI doğrulama iş akışı. Kod, bağımlılık, API, OCR/PDF/Excel/Vision araçları, mühendislik hesapları, UI ve GitHub değişikliklerinde kullanılır.
compatibility: OpenCode + ZeminLab Electron/Vite/React/TypeScript projesi
metadata:
  project: ZeminLab
  language: Turkish
  workflow: verify-before-change-and-test-after-change
---

# ZeminLab Mühendislik Geliştirme Skill

## 1. Temel ilke

ZeminLab bir mühendislik yazılımıdır. Amaç yalnızca kod üretmek değil, **doğru çalışan, doğrulanabilir ve geriye dönük uyumluluğu korunmuş bir sistem** üretmektir.

Bu skill bir öneri değildir. ZeminLab üzerinde değişiklik yapan ajan için çalışma prosedürüdür.

Ana kural:

> **Önce mevcut sistemi ve bağımlılıkları doğrula. Sonra değiştir. Sonra gerçek çalışma yolunu test et. En son CI sonucunu kabul et.**

"CI geçti", "kod mantıklı görünüyor", "dokümantasyonda böyle yazıyor" veya "bu API muhtemelen destekliyor" tek başına yeterli doğrulama değildir.

---

# 2. Değişiklik öncesi zorunlu inceleme

Her kod değişikliğinden önce aşağıdaki zincir uygulanır.

## 2.1 Mevcut dosyayı oku

Değiştirilecek dosyanın tamamını veya değişiklik için gerekli bağlamı oku.

Şunları varsayma:

- dosya içeriği
- fonksiyon imzası
- import yapısı
- mevcut hata yönetimi
- mevcut IPC sözleşmesi
- mevcut UI davranışı
- mevcut model yolu
- mevcut paket sürümü

Özellikle başka bir ajan tarafından daha önce değiştirilmiş kodda, önce gerçek repository durumunu kontrol et.

## 2.2 Bağımlılıkları kontrol et

Bir API, kütüphane veya runtime davranışı değiştirilecekse:

1. `package.json`
2. lock dosyası
3. ilgili Python requirements/install scriptleri
4. kullanılan sürüm
5. gerçek API/dokümantasyon
6. mümkünse kurulu paketin gerçek API'si

kontrol edilir.

Örneğin:

- PaddleOCR 3.3.2 kullanılıyorsa PaddleOCR 3.3.2 API'si doğrulanır.
- Başka bir sürümün örneğindeki parametre doğrudan kopyalanmaz.
- Bir constructor parametresinin desteklendiği varsayılmaz.

### Kritik kural

**Sürüm uyumluluğu kontrol edilmeden API parametresi eklenmez.**

---

# 3. "Kaynakta var" ile "çalışıyor" ayrımı

Her entegrasyonda üç ayrı doğruluk seviyesi vardır:

### Seviye A - Kaynak doğrulaması
Kod, dokümantasyon veya repository API'nin var olduğunu gösteriyor.

### Seviye B - Runtime doğrulaması
Gerçek kurulu bağımlılık ile kod çalıştırılıyor ve ilgili API çağrısı gerçekten başarılı oluyor.

### Seviye C - Uygulama entegrasyon doğrulaması
Kullanıcının gerçek uygulama akışı üzerinden çağrı çalışıyor.

Mümkün olduğunda hedef:

**A → B → C**

Sadece A seviyesinde kalınmışsa sonuç "doğrulandı" diye sunulmaz. "Kaynak üzerinden doğrulandı, runtime test edilmedi" denir.

---

# 4. Değişiklik yapmadan önce risk sınıflandırması

Her değişiklik aşağıdaki sınıflardan biri veya birkaçı olarak değerlendirilir:

- UI
- TypeScript/JavaScript
- Python runtime
- üçüncü taraf API
- model/runtime
- IPC
- dosya sistemi
- paketleme/electron-builder
- mühendislik hesabı
- veri modeli
- Git/GitHub
- test/CI

Bir değişiklik birden fazla katmanı etkiliyorsa tüm ilgili katmanlar doğrulanır.

Örnek:

OCR değişikliği yalnızca Python dosyası değildir.

Gerçek zincir:

`Electron UI → preload → IPC → main process → Python runner → Python runtime → PaddleOCR API → model → çıktı JSON → IPC → UI`

Bu zincirin yalnızca bir halkasını test edip tamamı çalışıyor kabul edilmez.

---

# 5. Kontrollü değişiklik prensibi

Bir sorunu düzeltirken:

1. Kök neden belirlenir.
2. En küçük güvenli değişiklik yapılır.
3. İlgisiz çalışan kod değiştirilmez.
4. Aynı değişiklikte birden fazla bağımsız problem "temizlenmez".
5. Değişiklik sonrası test edilir.
6. Gerekirse ikinci değişiklik yapılır.

Çalışan bir bölümü sırf "daha güzel" diye değiştirmek yasaktır.

Özellikle kullanıcı daha önce çalışan UI, Ribbon, dosya yükleme veya işlem ağacı gibi alanlardan şikâyet etmişse mevcut davranış korunur.

---

# 6. Kök neden analizi

Bir hata görüldüğünde önce hata mesajının gerçek kaynağı bulunur.

Şu sıralama kullanılır:

1. İlk gerçek exception/error
2. Hatanın oluştuğu dosya
3. Hatanın oluştuğu fonksiyon
4. Çağrılan üçüncü taraf API
5. Kullanılan sürüm
6. Girdi ve çıktı
7. Hatanın uygulama katmanına nasıl taşındığı

Sonraki wrapper hataları kök neden sanılmaz.

Örneğin:

`PaddleOCR çalıştırılamadı: ValueError: Unknown argument: pipeline_version`

Burada asıl hata "PaddleOCR çalıştırılamadı" değildir.

Asıl hata:

`PaddleOCRVL(...) → ValueError: Unknown argument: pipeline_version`

Dolayısıyla önce constructor API'si ve kurulu sürüm kontrol edilir.

---

# 7. Üçüncü taraf API değişiklikleri

Üçüncü taraf kütüphanelerde aşağıdaki davranış zorunludur:

### Değişiklik öncesi

- sürümü belirle
- resmi dokümantasyonu kontrol et
- mümkünse kaynak/API imzasını kontrol et
- kurulu paketin gerçek davranışını test et

### Değişiklik sonrası

Minimum smoke test:

```text
import → constructor → temel çağrı → beklenen çıktı
```

Bir API yalnızca import edilebiliyor diye entegrasyon başarılı kabul edilmez.

---

# 8. OCR özel prosedürü

ZeminLab OCR sistemi yerel/offline çalışmalıdır.

OCR değişikliklerinde aşağıdaki zincir test edilir:

1. Python runtime mevcut mu?
2. PaddleOCR sürümü doğru mu?
3. `PaddleOCRVL` import edilebiliyor mu?
4. Constructor gerçek sürümde destekleniyor mu?
5. Yerel model klasörleri mevcut mu?
6. Offline/model source check ayarları doğru mu?
7. Örnek PNG/JPG gerçekten okunabiliyor mu?
8. Runner JSON üretebiliyor mu?
9. Electron IPC runner'ı çağırabiliyor mu?
10. UI sonucu gösterebiliyor mu?
11. Paketlenmiş uygulamada aynı dosya yolları çalışıyor mu?

OCR için yalnızca CI sonucu yeterli değildir.

Runtime/model dosyaları Git'e dahil değilse CI'nin bunları test etmediği açıkça belirtilir.

---

# 9. Yerel model ve runtime

Yerel AI modeli kullanan özelliklerde şu ayrım korunur:

- kaynak kod
- Python runtime
- Python paketleri
- model ağırlıkları
- cache
- uygulama kaynak yolu
- packaged resources yolu

Development yolu ile packaged yolu aynı varsayılmaz.

Özellikle Electron'da:

`app.getAppPath()`

ile

`process.resourcesPath`

farkı kontrol edilir.

Bir özellik development ortamında çalışıp paketlenmiş EXE'de çalışmayabilir.

Bu nedenle paketleme yolu ayrıca doğrulanır.

---

# 10. Electron IPC doğrulaması

IPC değişikliklerinde üç katman birlikte kontrol edilir:

### Renderer
UI çağrısı doğru mu?

### Preload
Expose edilen API'nin adı, parametreleri ve dönüş tipi doğru mu?

### Main
IPC handler gerçekten mevcut mu ve beklenen işlemi yapıyor mu?

Tip uyumluluğu ile runtime uyumluluğu birbirine karıştırılmaz.

Örnek:

`analyzeImage(dataUrl)`

TypeScript'te doğru görünebilir ama runtime'da IPC handler yoksa özellik çalışmaz.

---

# 11. Mühendislik hesapları

Mühendislik hesaplarında kod yazmadan önce:

1. Kullanılan standardı belirle.
2. İlgili madde/denklem/tabloyu bul.
3. Girdileri belirle.
4. Birimleri belirle.
5. Varsayımları açıkça yaz.
6. Formülü uygula.
7. Sınır durumlarını test et.
8. Mümkünse bağımsız örnek hesapla.
9. Sonucu UI'ya bağla.
10. Kaynağı sonuçla ilişkilendir.

Kaynak belirtilmeden mühendislik katsayısı, güvenlik katsayısı veya malzeme parametresi uydurulmaz.

Özellikle TBDY/TS500/CSI hesaplarında:

- norm maddesi
- tablo numarası
- denklem numarası
- kullanılan katsayı
- birim

izlenebilir olmalıdır.

---

# 12. Hesap motoru ile UI ayrımı

Mühendislik hesabı UI koduna gömülmez.

Tercih edilen yapı:

`UI → validation → calculation engine → structured result → UI/report`

Calculation engine:

- deterministik olmalı
- aynı girdide aynı sonucu üretmeli
- birimlerini açıkça tanımlamalı
- uyarıları ayrı döndürmeli
- kaynak bilgisini taşıyabilmeli

UI, formülün kendisi olmamalıdır.

---

# 13. Birim kontrolü

Her mühendislik hesabında birimler kontrol edilir.

Özellikle:

- kN
- ton
- kN/m
- kN/m²
- kN/m³
- m
- mm
- MPa
- kPa

birbirine karıştırılmaz.

Kodda birim dönüşümü varsa test senaryosu oluşturulur.

Örneğin:

`1 tonf ≈ 9.80665 kN`

gibi dönüşümler açıkça belirtilir.

---

# 14. Dosya ve veri akışları

PDF, XLSX, XLSM, PNG, JPG, DXF gibi girdilerde deterministic routing tercih edilir.

Modelin dosya türünü tahmin ederek araç seçmesine güvenilmez.

Örnek:

- PDF → PDF engine
- XLSX → Excel engine
- XLSM/VBA → Excel/VBA engine
- PNG/JPG → Vision/OCR engine
- DXF → DXF parser/render engine

Sonuç daha sonra uygun doğrulayıcı/model tarafından değerlendirilir.

---

# 15. Test piramidi

Değişiklik sonrası testler mümkün olduğunca şu sırayla yapılır:

### 1. Static check
- TypeScript
- lint
- import/export
- dosya yolları

### 2. Unit test
- hesap fonksiyonu
- parser
- utility

### 3. Integration test
- IPC
- Python runner
- dosya engine
- model adapter

### 4. Runtime smoke test
Gerçek executable/runtime ile küçük gerçek örnek.

### 5. UI test
Kullanıcının gerçek akışı.

### 6. Packaging test
EXE/resources yolu.

### 7. CI
GitHub Actions.

CI son basamaktır, ilk doğrulama değildir.

---

# 16. Test kanıtı

Bir test sonucunda mümkün olduğunca şu bilgiler kaydedilir:

- test edilen dosya
- kullanılan sürüm
- komut
- girdi
- beklenen sonuç
- gerçek sonuç
- exit code
- varsa hata mesajı

"Test edildi" ifadesi, gerçekten test çalıştırılmışsa kullanılır.

Çalıştırılmamış test için:

- "test edilmedi"
- "kaynak üzerinden doğrulandı"
- "CI tarafından doğrulandı"
- "lokalde doğrulanması gerekiyor"

ifadelerinden uygun olanı kullan.

---

# 17. CI politikası

CI yeşil olması şu anlama gelir:

> CI'nin çalıştırdığı testler başarılı.

Şu anlama gelmez:

> Uygulamanın her gerçek kullanım senaryosu çalışıyor.

Özellikle Git'e dahil edilmeyen:

- model ağırlıkları
- Python runtime
- cache
- Windows'a özgü binary'ler
- Excel COM
- GPU bağımlılıkları

CI'de test edilmemiş olabilir.

Bunlar ayrıca belirtilmelidir.

---

# 18. Regression koruması

Bir bug düzeltildiyse mümkünse aynı bug'ın tekrar oluşmasını önleyecek test eklenir.

Örnek:

Bug:

`PaddleOCRVL(pipeline_version="v1")`

PaddleOCR 3.3.2'de desteklenmiyor.

Sadece parametreyi silmek yeterli değildir.

Mümkünse regression smoke test eklenir:

```text
PaddleOCR 3.3.2
    ↓
PaddleOCRVL()
    ↓
yerel model
    ↓
örnek görüntü
    ↓
başarılı JSON
```

Böylece aynı hata tekrar eklendiğinde test yakalar.

---

# 19. Değişiklik öncesi/sonrası karşılaştırma

Önemli değişikliklerden sonra:

- değişen dosyalar
- eklenen satırlar
- silinen satırlar
- etkilenen modüller
- test sonucu

kontrol edilir.

İlgisiz dosya değişmişse nedenine bakılır.

Bir değişiklik beklenenden büyükse dur ve tekrar incele.

---

# 20. Kullanıcıdan gereksiz onay isteme

Açıkça tanımlanmış teknik görevin içinde gerekli olan:

- dosya okuma
- repository inceleme
- dependency kontrolü
- test çalıştırma
- hata analizi
- küçük düzeltme
- tekrar test

için gereksiz şekilde kullanıcıdan her adımda izin istenmez.

Ancak aşağıdakiler için kullanıcı onayı gerekebilir:

- veri silme
- geri dönüşü zor değişiklik
- credential/account değişikliği
- production/deployment etkisi
- kapsamı belirsiz büyük mimari değişiklik

---

# 21. "Tek seferde hallet" taleplerinde

Kullanıcı bir işi tek seferde istediğinde amaç:

`incele → planla → uygula → test et → düzelt → tekrar test et`

zincirini mümkün olduğunca kendi içinde tamamlamaktır.

Ancak doğrulanmamış sonucu tamamlanmış gibi sunmak yasaktır.

Örneğin:

**Yanlış:**

> Tamam, OCR düzeltildi.

Eğer yalnızca dosya değiştirildiyse.

**Doğru:**

> API uyumsuzluğu düzeltildi. Kod değişikliği doğrulandı. Gerçek OCR runtime testi henüz çalıştırılmadı.

veya gerçek test yapıldıysa:

> API uyumsuzluğu düzeltildi ve gerçek PaddleOCR runtime smoke testi başarılı oldu.

---

# 22. GitHub çalışma prosedürü

GitHub üzerinde değişiklik yaparken:

1. Mevcut dosyayı oku.
2. İlgili branch/commit durumunu kontrol et.
3. Küçük ve izlenebilir değişiklik yap.
4. Commit oluştur.
5. Commit SHA'yı kaydet.
6. GitHub Actions durumunu kontrol et.
7. Başarısızsa logu incele.
8. Gerekirse düzelt.
9. Son commit ve CI durumunu yeniden doğrula.

GitHub'da değişiklik yapılmış olması yerel bilgisayarın otomatik güncellendiği anlamına gelmez.

Kullanıcı yerelde test edecekse açıkça belirt:

`git fetch → checkout main → reset/merge uygun yöntem → npm install → runtime hazırlığı → test`

Destructive Git komutları kullanılıyorsa bunun etkisi açıkça belirtilir.

---

# 23. Skill kullanım kuralı

Bu skill, ZeminLab üzerinde aşağıdaki görevlerde mümkün olduğunca yüklenmelidir:

- yeni özellik
- bug fix
- dependency değişikliği
- API entegrasyonu
- OCR
- PDF
- Excel
- Vision
- Electron IPC
- Python runtime
- model değişikliği
- mühendislik hesap motoru
- UI ile hesap motoru entegrasyonu
- packaging
- GitHub/CI
- refactor

Sadece basit metin değişikliği veya salt dokümantasyon değişikliği gibi teknik risk taşımayan işlerde tam prosedür uygulanması gerekmeyebilir.

---

# 24. Sonuç raporu formatı

Teknik bir iş tamamlandığında kısa rapor şu yapıda olmalıdır:

### Yapılan
- ...

### Değişen dosyalar
- ...

### Doğrulama
- Static: başarılı/başarısız/yapılmadı
- Runtime: başarılı/başarısız/yapılmadı
- UI: başarılı/başarısız/yapılmadı
- Packaging: başarılı/başarısız/yapılmadı
- CI: başarılı/başarısız/yapılmadı

### Kalan risk
- ...

### Kanıt
- Commit SHA
- test komutu
- önemli test çıktısı

"Başarılı" yalnızca gerçekten gözlemlenmiş bir sonucu ifade eder.

---

# 25. ZeminLab için özel kalite kapısı

Bir değişiklik aşağıdaki dört soruya cevap vermeden tamamlanmış kabul edilmez:

1. **Neyi değiştirdim?**
2. **Neden bu değişiklik doğru?**
3. **Gerçek çalışma yolunda neyi test ettim?**
4. **Neyi henüz test etmedim?**

Özellikle üçüncü ve dördüncü sorular dürüstçe ayrılır.

---

# 26. En önemli kural

ZeminLab'de amaç "kod yazmak" değildir.

Amaç:

**kaynağı doğrulanmış + sürümü doğrulanmış + API'si doğrulanmış + kontrollü değiştirilmiş + gerçek runtime'da test edilmiş + regression riski düşünülmüş + CI ile tekrar doğrulanmış çalışan mühendislik yazılımı üretmektir.**

Bir insanın dört saatini, aslında constructor'a ait olmayan tek bir parametreyi silmekle kurtarabilecekken harcamak gereksizdir. Bu skill'in varlık nedeni tam olarak budur.
