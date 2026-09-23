# Yeni özellikler — kişisel takip paketi (workflow 22–26)

Bu belge, depoya eklenen beş yeni workflow'un **tasarım belgesidir**: neden
eklendiklerini, nasıl kullanıldıklarını, hangi dosyaya ne yazdıklarını ve
bilerek neyi yapmadıklarını anlatır. Kurulum ve günlük kullanım için kısa
sürüm README §14'tedir.

Durum: 🟢 eklendi · ⬜ sırada

| # | Workflow | Tek cümlede | Durum |
|---|---|---|:---:|
| 22 | Alışkanlık takibi | "Bugün yaptım" işaretle, seriyi kırma; akşam 21:00'de eksikleri hatırlatır | 🟢 |
| 23 | Bütçe nöbetçisi | Aylık ve kategori bazlı limit; %80 ve %100'de bir kez uyarır | 🟢 |
| 24 | Abonelik ve düzenli ödemeler | Netflix, kira, alan adı… ödeme gününden önce hatırlatır, aylık yükü gösterir | 🟢 |
| 25 | Önemli tarihler | Doğum günü ve yıl dönümlerini birkaç gün önceden ve gününde hatırlatır | ⬜ |
| 26 | Haftalık rapor | Pazar 20:00'de haftanın özeti: görev, harcama, alışkanlık, yaklaşanlar | ⬜ |

---

## Neden bu beşi?

Mevcut 21 workflow **anlık** işleri iyi yapıyor (mail geldi, servis düştü,
hatırlatma zamanı geldi). Eksik olan, zamana yayılan **düzenli** şeylerdi:

- Harcama kaydı var (07, `/harcama`) ama **sınır** yok — ay sonunda şaşırıyorsunuz.
- Hatırlatma var (09) ama **her ay/her yıl tekrarlayan** şeyler için değil —
  abonelik yenilemesi ve doğum günü her seferinde elle kurulmak zorunda.
- Görev listesi var ama **her gün tekrarlanan** alışkanlık için uygun değil
  (tamamlanan görev kaybolur, seri tutulmaz).
- Her şey ayrı ayrı bildirim gönderiyor; **geriye dönüp bakan** tek bir
  özet yok.

Beşi de mevcut tasarıma uyar: veriler `local-files/*.json`'da, Telegram
yoksa mail, credential gerekmez, internete hiçbir şey gitmez (Telegram
mesajının kendisi hariç).

## Ortak kurallar (hepsi için geçerli)

Bu kurallar mevcut workflow'lardan devralındı ve testlerle korunur:

1. **Bozuk dosyada dur.** Dosya okunamıyor/bozuksa workflow hata verir ve
   dosyanın üzerine boş liste **yazmaz**. Dosya hiç yoksa (ENOENT) boş
   listeyle devam eder ve ilk yazmada oluşturur.
2. **Bir olay = bir bildirim.** Zamanlanmış kontroller gönderdikleri
   uyarıyı dosyaya işaretler; aynı gün iki kez çalışsalar bile tekrar
   yazmazlar.
3. **Telegram kuruluysa oraya, değilse SMTP'ye.** Çift bildirim olmaz.
4. **Telegram komutları workflow 05'ten iletilir.** 05'te her biri için bir
   *… Workflow'una İlet* düğümü vardır; hedefi panelden bir kez seçilir
   (README §13.6 ile aynı ayar).
5. **Terminalden de kullanılır.** Her birinin bir webhook ucu vardır; Telegram
   komutuyla aynı sözdizimi `{"metin": "..."}` gövdesiyle gönderilebilir.
6. **Tarihler yerel saatle** (`GENERIC_TIMEZONE`) hesaplanır. "Bugün", sunucunun
   UTC günü değil sizin gününüzdür.

---

## 22 — Alışkanlık takibi

**Sorun.** "Her gün 2 litre su", "10 dakika kitap" gibi tekrarlanan işler
görev listesine uymuyor: tamamlanınca kaybolur, ertesi gün yeniden eklemek
gerekir, kaç gündür aralıksız yaptığınızı kimse tutmaz.

**Çözüm.** Alışkanlıklar kalıcıdır; her gün için "yaptım" işareti tutulur.

| Telegram | Webhook (`POST /webhook/aliskanlik`) | Ne yapar |
|---|---|---|
| `/aliskanlik` | `{"metin":""}` | Liste: bugün ✅/⬜, 🔥 seri, son 7 gün `●●○●●●○` |
| `/aliskanlik ekle Su iç` | `{"metin":"ekle Su iç"}` | Yeni alışkanlık |
| `/yaptim 2` · `/yaptim su` | `{"metin":"yaptim 2"}` | Bugünü işaretle (numara veya adın parçası) |
| `/yaptim 2 dün` | `{"metin":"yaptim 2 dün"}` | Dünü işaretle (unuttuysanız) |
| `/aliskanlik geri 2` | `{"metin":"geri 2"}` | Bugünkü işareti kaldır |
| `/aliskanlik sil 2` | `{"metin":"sil 2"}` | Alışkanlığı sil |

**Zamanlama.** Her akşam **21:00**: bugün işaretlenmemiş alışkanlık varsa
tek mesajda listeler ("🔥 12 günlük seriniz bozulmak üzere"). Hepsi
yapılmışsa **sessiz kalır**.

**Seri kuralı.** Bugün işaretliyse bugünden geriye, değilse **dünden**
geriye kesintisiz gün sayısı. Yani akşam henüz yapmadığınız bir alışkanlığın
serisi gün bitene kadar "bozulmuş" görünmez.

**Veri** — `local-files/aliskanliklar.json`:
```json
{ "aliskanliklar": [
    { "id": 1, "ad": "Su iç (2 L)", "olusturulma": "2026-09-01T…",
      "gunler": ["2026-09-21", "2026-09-22"] } ] }
```
`gunler` en fazla 400 gün tutar (dosya şişmesin diye).

## 23 — Bütçe nöbetçisi

**Sorun.** Harcamalar kaydediliyor ama "bu ay ne kadar kaldı" sorusunun cevabı
yok; uyarı ancak ayın 1'inde, iş işten geçince geliyor.

**Çözüm.** Aylık genel limit + isteğe bağlı kategori limitleri. Harcamalar
`harcamalar.json`'dan **yalnızca okunur** (07 ve 05 yazmaya devam eder; bu
workflow o dosyaya dokunmaz).

| Telegram | Ne yapar |
|---|---|
| `/butce` | Genel ve kategori durumu: `▓▓▓▓▓▓░░░░ %62`, kalan tutar, ay sonuna kadar **günlük harcanabilir** tutar, ay sonu tahmini |
| `/butce limit 20000` | Aylık genel limiti ayarla |
| `/butce limit Market 6000` | Kategori limiti (kategori yoksa oluşturur) |
| `/butce anahtar Market migros` | Kategoriye eşleşme kelimesi ekle |
| `/butce sil Market` | Kategoriyi kaldır |

Terminalden: `GET /webhook/butce` (durum JSON) · `POST /webhook/butce` +
`{"metin":"limit 20000"}`.

**Kategori eşleşmesi.** Harcamanın `konu` + `kimden` metninde kategorinin
anahtar kelimelerinden biri geçiyorsa o kategoriye sayılır (Türkçe
küçük harfe çevrilerek, ilk eşleşen kazanır). Hiçbirine uymayanlar **Diğer**.

**Zamanlama.** Her akşam **20:00**: genel limit ve her kategori için %80 ve
%100 eşikleri kontrol edilir. Her eşik **ayda bir kez** bildirilir; ay
değişince işaretler sıfırlanır.

**Veri** — `local-files/butce.json`:
```json
{ "aylikLimit": 20000,
  "kategoriler": [ { "ad": "Market", "limit": 6000, "anahtarlar": ["market","migros","a101","bim","şok"] } ],
  "uyarilar": { "ay": "2026-09", "gonderilen": ["genel-80"] } }
```

## 24 — Abonelik ve düzenli ödemeler

**Sorun.** Her ay/yıl tekrarlanan ödemeler (Netflix, kira, telefon, alan adı,
sigorta) sessizce çekilir ya da son gün unutulur; toplam aylık yük bilinmez.

**Çözüm.** Ödemeler bir kez tanımlanır; sıradaki ödeme tarihi her gün
hesaplanır ve `onceden` gün kala hatırlatılır.

| Telegram | Ne yapar |
|---|---|
| `/abonelik` | Sıradaki ödemeye göre sıralı liste + **aylık yük** (yıllıklar /12) + yıllık toplam |
| `/abonelik ekle Netflix 229,99 15` | Her ayın 15'i |
| `/abonelik ekle Alan adı 450 yillik 14.03` | Her yıl 14 Mart |
| `/abonelik sil 3` | Sil |

Terminalden: `POST /webhook/abonelik` + `{"metin":"ekle Spotify 59,99 1"}`.

**Ayın son günü kuralı.** `gun: 31` olan ödeme 30 çeken ayda 30'unda, Şubat'ta
28/29'unda sayılır — hiçbir ay atlanmaz.

**Zamanlama.** Her sabah **09:30**: sıradaki ödemesine `onceden` (varsayılan 3)
gün ya da daha az kalanlar tek mesajda. Her ödeme tarihi için **bir kez**
(`sonHatirlatilan`). Bugün olan ödeme "💳 **Bugün**" diye öne alınır.

**Bilerek yapılmadı:** ödeme günü gelince `harcamalar.json`'a otomatik kayıt.
Çekim tarihi ve tutarı bankaya göre kayabiliyor; yanlış otomatik kayıt, hiç
kayıt olmamasından daha kötü. Ödemeyi `/harcama` ile kaydedin.

**Veri** — `local-files/abonelikler.json`:
```json
{ "abonelikler": [
    { "id": 1, "ad": "Netflix", "tutar": 229.99, "periyot": "aylik", "gun": 15,
      "ay": null, "onceden": 3, "sonHatirlatilan": null } ] }
```

## 25 — Önemli tarihler

**Sorun.** Doğum günleri ve yıl dönümleri her yıl tekrar eder; 09'daki
hatırlatma tek seferliktir, her yıl yeniden kurmak gerekir. Ayrıca asıl
lazım olan "bugün" değil, hediye alacak zaman bırakan "bir hafta önce"dir.

**Çözüm.** Tarih bir kez girilir; her yıl kendiliğinden, önceden ve gününde
hatırlatılır. Yıl biliniyorsa yaş/yıl sayısı da yazılır.

| Telegram | Ne yapar |
|---|---|
| `/tarihler` | Yaklaşan 10 tarih (kaç gün kaldı, kaçıncı yaş/yıl) |
| `/tarih ekle 14.03.1964 Annemin doğum günü` | Yıllı — "62 yaşına giriyor" |
| `/tarih ekle 02.06 Evlilik yıl dönümü` | Yılsız da olur |
| `/tarih sil 3` | Sil |

Terminalden: `POST /webhook/tarih` + `{"metin":"ekle 14.03 Annemin doğum günü"}`.

**Tür** metinden anlaşılır: "doğum" geçiyorsa 🎂 doğum günü, "yıl dönümü"
geçiyorsa 💍 yıl dönümü, yoksa 📅 genel.

**Zamanlama.** Her sabah **08:30**: `onceden` listesindeki günlerde
(varsayılan `[7, 1]`) ve gününde bildirir. 29 Şubat, artık olmayan yıllarda
28 Şubat'ta kutlanır.

**Veri** — `local-files/tarihler.json`:
```json
{ "tarihler": [
    { "id": 1, "ad": "Annemin doğum günü", "tarih": "1964-03-14",
      "tur": "dogumgunu", "onceden": [7, 1], "sonBildirim": null } ] }
```
Yılsız tarih `"--03-14"` biçiminde tutulur.

## 26 — Haftalık rapor

**Sorun.** Her workflow kendi bildirimini gönderiyor; "bu hafta nasıl geçti,
önümüzdeki hafta ne var" sorusunu tek yerden cevaplayan bir şey yok.

**Çözüm.** Pazar akşamı tek bir mesaj. Diğer workflow'ların dosyalarını
**yalnızca okur**, hiçbir şey yazmaz.

| Bölüm | Kaynak | İçerik |
|---|---|---|
| ✅ Görevler | `gorevler.json` | Bu hafta tamamlanan / eklenen, açık kalan |
| 💸 Harcama | `harcamalar.json` | Bu hafta toplam, geçen haftaya göre ▲▼ %, en büyük 3 kalem |
| 🎯 Bütçe | `butce.json` + harcamalar | Ay içinde limitin yüzde kaçı gitti |
| 🔥 Alışkanlık | `aliskanliklar.json` | Her biri için 7 günde kaç gün, seri |
| 📅 Önümüzdeki 7 gün | `notlar.json`, `abonelikler.json`, `tarihler.json` | Hatırlatmalar, ödemeler, doğum günleri |
| 🩺 Servisler | `servisler.json` | Şu anda kapalı olanlar (varsa) |

**Zamanlama.** Her **Pazar 20:00**. Ayrıca Telegram'da `/hafta`, terminalde
`GET /webhook/hafta` ile istendiği an.

**Dayanıklılık.** Dosyası olmayan bölüm **atlanır** (her özelliği kurmak
zorunda değilsiniz). Dosyası bozuk olan bölüm "okunamadı" diye yazılır, rapor
yine gider — bu workflow yazmadığı için durması gerekmez.

---

## Kabul ölçütleri

Her workflow için `testler/kod-testleri.js` içinde en az şunlar denenir:

- [ ] Bozuk dosyada durur, üzerine yazmaz (22, 23, 24, 25)
- [ ] Dosya yokken boş listeyle çalışır
- [ ] Zamanlanmış bildirim aynı gün ikinci kez gitmez
- [ ] 22: seri hesabı (bugün işaretsizken dünden sayar), `dün` işaretleme
- [ ] 23: eşik ayda bir kez, ay değişince sıfırlanır; kategori eşleşmesi
- [ ] 24: ayın 31'i kuralı, yıllık ödeme, `onceden` penceresi
- [ ] 25: yaş hesabı, yılsız tarih, 29 Şubat
- [ ] 26: eksik dosyalı bölüm atlanır, bozuk dosya raporu durdurmaz
- [ ] Workflow 05: yeni komutlar doğru workflow'a iletilir, eski komutlar bozulmaz
