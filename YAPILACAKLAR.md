# Yapılacaklar — n8n-local

Öncelik: 🔴 kritik · 🟡 orta · 🟢 düşük

Bu depo iyi durumda: dokümantasyon doğru, çalıştırma betikleri üç platform için
mevcut, 26 workflow hazır ve dayanıklılık düzeltmeleri birleştirildi. Kalan
maddeler ağırlıklı olarak **doğrulama** ve **tek seferlik panel ayarları** ile
ilgili.

---

## N1 ✅ Dayanıklılık dalını birleştirin — TAMAMLANDI (2026-09-12)

`claude/bu-repo-nedr-fy2s7i` dalı birleştirildi. Artık `main` hattında:

- n8n sürümü **sabit** (`n8n:2.35.3`) — `latest` bir sabah sessizce büyük sürüm
  atlayıp kurulumu bozamaz.
- `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` — aynı dosyayı yazan workflow'lar sıraya
  girer, "oku-değiştir-yaz" yarışı olmaz.
- Bozuk JSON koruması **03, 05, 06, 07 ve 09**'da. (09, dal yazıldıktan sonra
  eklendiği için eksikti; birleştirmeyle birlikte o da kapatıldı.)

**Yapmanız gereken tek şey:** workflow'ları n8n paneline **yeniden içe
aktarmak**. JSON dosyaları değişti, paneldeki eski kopyalar kendiliğinden
güncellenmez.

---

## N2 🟡 Hiçbir workflow uçtan uca çalıştırılarak doğrulanmadı

**Durum.** Docker bu ortamda çalışmadığı için n8n hiç başlatılmadı. 21
workflow'un JSON'u ayrıştırıldı ve Code düğümlerinin mantığı 195 testle
denendi (`node testler/kod-testleri.js` — hepsi geçiyor), ama **hiçbir
workflow gerçekten çalıştırılmadı**: e-posta gönderilmedi, Telegram'a mesaj
düşmedi, hiçbir sayfa indirilmedi.

Testlerin kapsadığı şeyler: bozuk dosyada durma, dosya yokken boş listeyle
devam etme, Ollama kapalıyken veri kaybetmeme, aynı haberi iki kez
göndermeme, ilk çalıştırmada sessiz kalma, `/ai` ve `/oku` komutlarının
mevcut görev davranışını bozmaması.

Testlerin **kapsamadığı** şeyler: gerçek HTTP istekleri, IMAP/SMTP, Telegram
API'si, zamanlayıcılar, n8n'in kendi düğüm davranışları.

**Yarın denenecekler (öncelik sırasıyla):**

- [ ] **Panel açılıyor mu** — `http://localhost:5678` (en temel kontrol)
- [ ] **Workflow 03 (görev takibi)** — webhook'a bir görev POST edip listeleyin.
      En kolay doğrulanabilen workflow; dış servis gerektirmiyor.
- [ ] **Workflow 09 (not/hatırlatma)** — yine dış bağımlılıksız
- [ ] **Workflow 05 (Telegram)** — BotFather'dan token alın, `.env`'e yazın,
      n8n'i yeniden başlatın, workflow'u **Active** yapın, bota `/start` yazın
- [ ] **Workflow 01/02 (e-posta)** — Gmail için **uygulama şifresi** gerekir
      (normal şifre çalışmaz); README §4 anlatıyor
- [ ] **Workflow 06 (fiyat takibi)** — bir ürün URL'si + CSS seçici;
      JavaScript ile fiyat yükleyen siteler çalışmaz (README uyarıyor)
- [ ] **Workflow 08 (takvim özeti)** — Google Takvim bağlantısı gerekir
- [ ] **Workflow 04 (Ollama)** — `docker compose --profile ai up -d`
- [ ] **Workflow 10 (günaydın brifingi)** — dış servis gerektirmez; *Elle Test
      Et* düğümüyle hemen denenir. Hava ve kur için internet erişimi yeterli.
- [ ] **Workflow 11 (hata nöbetçisi)** — bir workflow'a geçici
      `throw new Error('deneme')` koyup çalıştırın. **Sonra her workflow'un
      Settings → Error Workflow alanına 11'i tanıtmayı unutmayın** (README §9.2)
- [ ] **Workflow 12 (yerel AI sohbet)** — önce Ollama profili, sonra
      `curl -X POST localhost:5678/webhook/ai -d '{"soru":"merhaba"}'`
- [ ] **Workflow 13 (link özetleyici)** — `/webhook/oku` ile bir adres gönderin
- [ ] **Workflow 14 (RSS)** — ilk tur bilerek sessizdir, **iki kez** çalıştırın
- [ ] **Workflow 15 (yedekleme)** — *Elle Test Et*; `local-files/yedek/<tarih>/`
      klasörü oluşmalı
- [ ] **Workflow 16 (sayfa takibi)** — ilk tur sessiz; sayfayı değiştirip (ya da
      `sayfa-takibi.json` içindeki `sonIz` alanını silip) ikinci turu deneyin
- [ ] **Workflow 20 (araç kutusu)** — en kolayı, hiçbir kurulum istemez:
      `curl 'http://localhost:5678/webhook/arac?islem=uuid'`
- [ ] **Workflow 19 (kod kasası)** — bir parçacık kaydedip `?ara=` ile arayın
- [ ] **Workflow 21 (webhook yakalayıcı)** — `/webhook/yakala` adresine bir
      istek atıp `/webhook/istekler` ile bakın; başlıkların maskelendiğini
      doğrulayın
- [ ] **Workflow 17 (servis nöbetçisi)** — `servisler.json` içine çalışan bir
      adres + bilerek bozuk bir adres yazın, `esik: 1` yapıp **Elle Test Et**
- [ ] **Workflow 18 (GitHub nöbetçisi)** — `.env` içine `GITHUB_TOKEN` yazın,
      **iki kez** çalıştırın (ilk tur bilerek sessizdir)
- [ ] **Workflow 17, 18, 19, 21** — 2026-09-23'te bu workflow'lardaki dosya
      okuma düğümleri düzeltildi (yol ile tuval konumu yer değiştirmişti,
      dosya hiç okunamıyordu). **Yeniden içe aktarın**; eski kopyalar bozuk.
- [ ] **Workflow 22 (alışkanlık)** — `/aliskanlik ekle Su iç`, `/yaptim 1`;
      21:00 hatırlatmasını *Elle Test Et* ile deneyin
- [ ] **Workflow 23 (bütçe)** — `/butce limit 1000` koyup `/harcama 900 test`
      girin; *Elle Test Et* → %80 uyarısı gelmeli, ikinci çalıştırmada gelmemeli
- [ ] **Workflow 24 (abonelik)** — yarının gününü girin
      (`/abonelik ekle Deneme 10 <yarının günü>`), *Elle Test Et* → "Yarın"
- [ ] **Workflow 25 (önemli tarihler)** — bugünün tarihiyle bir kayıt
      ekleyip *Elle Test Et* → "🎂 Bugün"
- [ ] **Workflow 26 (haftalık rapor)** — en kolayı:
      `curl http://localhost:5678/webhook/hafta`. Zamanlama **Pazar 20:00**
      olarak görünmeli (tetikleyiciyi açıp kontrol edin)

Her birinin sonucunu bu dosyaya not edin; hangisinin gerçekten çalıştığı
şu anda **hiçbir yerde yazılı değil.**

---

## N3 🟡 Şifreleme anahtarını yedekleyin (kurulum anında)

**Sorun değil, tuzak.** `.env` içindeki `N8N_ENCRYPTION_KEY`, mail şifreleriniz
gibi tüm credential'ları diskte şifreliyor. **Kaybederseniz kayıtlı hiçbir
credential açılamaz** — hepsini yeniden girmeniz gerekir.

`.env.example` bunu zaten uyarıyor. Ama uyarı okunmuş olsa bile yedek çoğu zaman
alınmıyor.

**Yapılacak (kurulumun ilk 5 dakikasında):**
```bash
openssl rand -hex 32          # anahtarı üret
# .env'e yaz, sonra anahtarı bir parola yöneticisine kaydedin
```
`.env` dosyası `.gitignore`'da — **depoya girmiyor**, yani yedeği başka yerde
tutmanız şart.

---

## N4 🟢 `local-files/` yedeklemesi

Görev listesi, notlar, fiyat geçmişi — hepsi `local-files/` altındaki JSON
dosyalarında. Docker volume'unda değil, **doğrudan depo klasöründe**.

**Kısmen çözüldü:** workflow 15 her gece `local-files/` klasörünü
`local-files/yedek/<tarih>/` altına kopyalıyor. Ama bu **aynı diskte** duruyor —
disk giderse yedek de gider.

**Yapılacak:** `local-files/` klasörünü (yedek alt klasörüyle birlikte) harici
bir diske ya da bulut yedeğinize dâhil edin. N1'in getirdiği bozuk-dosya
koruması bozulmayı sessiz olmaktan çıkarıyor, ama **dış yedek yerine geçmez**.

`.gitignore` kontrol edilmeli: gerçek veri dosyaları depoya girmemeli,
`.ornek.json` şablonları girmeli.

---

## N5 🟢 Ollama profili Intel Mac'te yavaş olacak

`docker compose --profile ai up -d` Intel Mac'te **çalışır** ama GPU
hızlandırma olmadan yalnızca CPU'da koşar.

README'nin önerdiği `qwen2.5:3b` küçük bir model olduğu için bu makul —
3 milyar parametre CPU'da kabul edilebilir hızda çalışır. Daha büyük model
denemeyin.

> Karşılaştırma: `yokbi/llm` deposundaki 32B model Intel Mac'te pratikte
> kullanılamaz (bkz. o deponun `DURUM-RAPORU.md` §6). Buradaki 3B modeli
> onunla karıştırmayın.

---

## N6 🟢 Hangi workflow'un çalıştığı belgelenmiyor

`README.md` her workflow'un **ne yapması gerektiğini** anlatıyor, ama hiçbir
yerde **hangisinin gerçekten denendiği** yazmıyor.

**Yapılacak (N2'den sonra):** README'ye veya bu dosyaya küçük bir durum tablosu
ekleyin:

| Workflow | Denendi mi | Tarih | Not |
|---|---|---|---|
| 01 Anlık mail uyarısı | ⬜ | | |
| 02 Günlük mail özeti | ⬜ | | |
| 03 Görev takibi | ⬜ | | |
| 04 Yerel AI özet | ⬜ | | |
| 05 Telegram botu | ⬜ | | |
| 06 Fiyat takibi | ⬜ | | |
| 07 Fatura/harcama | ⬜ | | |
| 08 Takvim özeti | ⬜ | | |
| 09 Not ve hatırlatma | ⬜ | | |
| 10 Günaydın brifingi | ⬜ | | |
| 11 Hata nöbetçisi | ⬜ | | |
| 12 Yerel AI sohbet | ⬜ | | |
| 13 Link özetleyici | ⬜ | | |
| 14 RSS haber özeti | ⬜ | | |
| 15 Otomatik yedekleme | ⬜ | | |
| 16 Sayfa takibi | ⬜ | | |
| 17 Servis nöbetçisi | ⬜ | | |
| 18 GitHub nöbetçisi | ⬜ | | |
| 19 Kod parçacığı kasası | ⬜ | | |
| 20 Geliştirici araç kutusu | ⬜ | | |
| 21 Webhook yakalayıcı | ⬜ | | |
| 22 Alışkanlık takibi | ⬜ | | |
| 23 Bütçe nöbetçisi | ⬜ | | |
| 24 Abonelik ve ödemeler | ⬜ | | |
| 25 Önemli tarihler | ⬜ | | |
| 26 Haftalık rapor | ⬜ | | |

Altı ay sonra "bu çalışıyor muydu?" diye düşünmemek için.

---

## N7 🟡 Yeni workflow'ların tek seferlik ayarları

26 workflow'un birkaçı, içe aktarmanın ötesinde panelde birer ayar ister.
Atlanırsa **sessizce** çalışmazlar:

- [ ] **Workflow 11 (hata nöbetçisi)** — kullandığınız her workflow'da
      **⋮ → Settings → Error Workflow** alanından 11'i seçin. Sadece Active
      yapmak yetmez (README §9.2).
- [ ] **Workflow 05 → 12/13 bağlantısı** — `/ai` ve `/oku` komutlarının
      çalışması için workflow 05'teki *AI Workflow'una İlet* ve
      *Link Workflow'una İlet* düğümlerinde hedef workflow'u seçin
      (README §12.3). Seçilmezse yalnızca bu iki komut çalışmaz.
- [ ] **Workflow 15 (yedekleme)** — workflow'ların kendisini de yedeklemek
      isterseniz panelden bir API anahtarı üretip `.env` içine
      `N8N_API_KEY=...` yazın (README §10.2). İsteğe bağlıdır.
- [ ] **Workflow 05 → 17/18/19/20/21 bağlantısı** — `/servis`, `/pr`, `/kod`,
      `/arac` ve `/istekler` komutları için workflow 05'teki beş yeni
      *… Workflow'una İlet* düğümünde hedefi seçin (README §13.6).
      Seçilmeyenin yalnızca kendi komutu çalışmaz.
- [ ] **Workflow 18 için token** — `.env` içine okuma yetkili `GITHUB_TOKEN`
      yazıp `docker compose up -d`. Boş bırakılırsa workflow sessizce durur.
- [ ] **Workflow 05 → 22/23/24/25/26 bağlantısı** — `/aliskanlik`, `/yaptim`,
      `/butce`, `/abonelik`, `/tarihler` ve `/hafta` için workflow 05'teki
      *Alışkanlık / Bütçe / Abonelik / Tarih / Rapor Workflow'una İlet*
      düğümlerinde hedefi seçin (README §14).
- [ ] **Telegram'sız kullanım** — 22–26 bildirimleri Telegram yoksa mail ile
      gider; her birinin *… Mail At (SMTP)* düğümünde credential ve adres
      alanlarını doldurun.

---

## Öncelik sırası önerisi

1. ~~**N1** — dayanıklılık dalını birleştir~~ ✅ tamamlandı
2. **N3** — şifreleme anahtarını üret ve yedekle *(kurulumun ilk 5 dakikası)*
3. **N7** — yeni workflow'ların panel ayarlarını yap
4. **N2** — workflow'ları tek tek dene, sonuçları not et
5. **N6** — hangisinin çalıştığını tabloya yaz
6. **N4, N5** — dış yedekleme ve AI profili notları
