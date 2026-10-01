# Otomatik Sheets takibi, dilim bazlı dersler ve devam takibi

## 1. Google Sheets otomatik takip + değişiklik bildirimi
- Admin bir listeyi Sheets bağlantısıyla yüklediğinde bağlantı o dosyanın yanına kaydedilir (dönem + dil + dosya türü: yıllık program / uygulama tablosu / öğrenci listesi; ayrıca global amfi ve seçmeli).
- Sunucu her 15 dakikada bir kayıtlı bağlantıları indirir, okur ve kayıtlı veriyle karşılaştırır. Fark yoksa hiçbir şey yapmaz.
- Fark varsa: yeni veri kaydedilir (açık sayfalar zaten anlık yenileniyor) ve değişen dersler çıkarılır — eklenen, silinen, saati/tarihi değişen, amfisi değişen.
- Bildirim yalnızca etkilenen öğrencilere gider: o dönem+dildeki öğrenciler; uygulama değişikliğinde sadece ilgili grup; amfi/seçmeli değişikliğinde o dersi gören öğrenciler. Geçmiş tarihli değişiklikler bildirilmez. Bir taramadaki değişiklikler tek bildirimde toplanır ("3 dersinde değişiklik: Anatomi 10:30 → 13:30, ...").
- Admin panelinde her dosyanın yanında "Otomatik takip: açık/kapalı", son kontrol zamanı ve "Şimdi kontrol et" düğmesi.
- Bağlantı paylaşımı kapanırsa/silinirse tekrar tekrar denemez; panelde hata gösterir.

## 2. Dersler sayfası: Dilim → Ana dal
- Üst seviye dilim (1. Dilim, 2. Dilim...), içinde anabilim dalları, içinde konular.
- Uygulamalar da kendi dilimlerinin altında ayrı "Uygulamalar" başlığıyla.
- Online dersler ve seçmeliler ayrı birer "dilim" gibi kendi kartlarında.

## 3. Derse girdim işaretleme
- Takvim: ders detayında "Girdim" anahtarı; gün başlığında "Tüm günü işaretle"; hafta üstünde "Tüm haftayı işaretle" (sadece geçmiş/bugünkü dersler işaretlenir, geri alınabilir).
- Dersler sayfası: her dilim ve her ana dal başlığında "Tümüne girdim", ayrıca her konuyu tek tek açınca o konunun tarihli oturumlarını tek tek işaretleme.
- İşaretli dersler takvimde küçük bir tik ile görünür. Veriler öğrencinin hesabında saklanır.

## 4. Devamsızlık uyarısı
- Her dilim içinde, her ana dal için: bugüne kadar yapılmış teorik derslerin %70'inden, uygulamaların %80'inden azına girildiyse "Bu dersten kalabilirsin" uyarısı.
- Sadece bugüne kadarki dersler sayılır; o ana daldan en az 5 ders yapılmadan uyarı verilmez (ilk haftada yanlış alarm olmasın).
- Uyarı Dersler sayfasında ilgili dal/dilim üzerinde ve takvim üstünde küçük bir bant olarak görünür; dokununca o dala gider.
- Ayarlar'da ve uyarının yanında dilim bazlı "Bu dilimde uyarı gösterme" anahtarı.

## Varsayım
"Bir ders" = bir dilimdeki bir anabilim dalının tüm dersleri (örn. 1. Dilim Anatomi). Farklıysa söyle.

## Teknik ayrıntılar
- Yeni tablo `sheets_kaynaklari` (anahtar, dosya türü, url, son_hash, son_kontrol, hata, aktif); yalnız admin okur/yazar, service_role tam.
- `SheetsTusu` başarılı yüklemede kaynağı kaydeder; yükleme parse mantığı istemci + sunucu ortak modüle taşınır (SheetJS sunucuda da çalışır).
- `/api/public/sheets-kontrol` rotası, `LOVABLE_CRON_SECRET` ile doğrulanır; pg_cron 15 dakikada bir çağırır. Fark: ders anahtarı (ad+tarih+grup) ile eski/yeni karşılaştırma; bildirimler service_role ile `bildirimler` tablosuna yazılır, hedef öğrenciler `user_data.ayarlar` (donemId/dil) + öğrenci listesi grubu ile bulunur.
- `Ayarlar.katilim: Record<olayKey, true>` ve `Ayarlar.devamUyariKapali: string[]` (dilim adları) `user_data` içinde; hesaplama `src/lib/devam.ts`.
- Dilim/ana dal ayrımı mevcut `bolum` alanından ("X Dilimi - Anabilim Dalı"); dilimsiz dersler "Diğer" altında.
