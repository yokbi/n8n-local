# 🏠 Yerel n8n Otomasyon Kurulumu

Kendi bilgisayarınızda çalışan, **verileri dışarı göndermeyen** kişisel otomasyon
merkezi: günlük e-posta özeti, önemli mail uyarıları, Telegram'dan yönetilen
yerel görev listesi, fiyat takibi, fatura/harcama kaydı, günlük takvim özeti,
not/hatırlatma ve isterseniz tamamen yerel AI (Ollama).

> Bu repo tek başına çalışır: klonlayın, `.env` oluşturun, `docker compose up -d` deyin.
>
> 🚀 **Hızlı başlangıç:** Windows'ta `run-windows.bat`, Intel Mac'te
> `./run-mac-intel.sh`, Apple Silicon Mac'te (M1/M2/M3/M4)
> `./run-mac-apple-silicon.sh` dosyasını çalıştırın — Docker kontrolü, `.env`
> oluşturma ve `docker compose up -d` adımlarını sizin yerinize yapar. Adım
> adım rehber: [`RUNNING.md`](RUNNING.md).

**Neden yerel?** n8n'in kendisi, veritabanı (SQLite), mail şifreleriniz
(şifrelenmiş) ve görev listeniz — hepsi sizin makinenizde durur. Telemetri ve
dışarıya veri gönderen n8n özellikleri `docker-compose.yml` içinde kapatılmıştır.
Panel yalnızca `127.0.0.1`'e bağlıdır: ağdaki başka cihazlar siz istemedikçe erişemez.

---

## İçindekiler

1. [Ne kuruyorsunuz?](#1-ne-kuruyorsunuz)
2. [Gereksinimler](#2-gereksinimler)
3. [Kurulum (≈5 dakika)](#3-kurulum-5-dakika)
4. [E-posta kimlik bilgileri](#4-e-posta-kimlik-bilgileri)
5. [Workflow'ları içe aktarma](#5-workflowları-içe-aktarma)
6. [Görev API'sini başka uygulamalardan kullanma](#6-görev-apisini-başka-uygulamalardan-kullanma)
7. [Telegram botu, fiyat takibi ve harcama kaydı](#7-telegram-botu-fiyat-takibi-ve-harcama-kaydı)
8. [Takvim özeti, not ve hatırlatma](#8-takvim-özeti-not-ve-hatırlatma)
9. [Opsiyonel: Yerel AI (Ollama)](#9-opsiyonel-yerel-ai-ollama)
10. [Verileriniz nerede? Yedekleme](#10-verileriniz-nerede-yedekleme)
11. [Başka uygulamalar bağlamak](#11-başka-uygulamalar-bağlamak)
12. [Sorun giderme](#12-sorun-giderme)
13. [Güncelleme](#13-güncelleme)

---

## 1. Ne kuruyorsunuz?

```
┌──────────────────────── Sizin bilgisayarınız ────────────────────────┐
│                                                                      │
│  ┌──────────── n8n (Docker) ────────────┐      ┌─ Ollama (ops.) ─┐   │
│  │ 01 Anlık önemli mail uyarısı  (IMAP) │      │ Yerel AI modeli │   │
│  │ 02 Günlük mail özeti — 08:00 (Gmail) │ ───▶ │ qwen2.5:3b vb.  │   │
│  │ 03 Görev listesi + hatırlatma        │      └─────────────────┘   │
│  │ 04 Yerel AI özet örneği              │                            │
│  │ 05 Telegram görev botu               │                            │
│  │ 06 Fiyat takibi (web)                │                            │
│  │ 07 Fatura/harcama kaydı              │                            │
│  │ 08 Günlük takvim özeti (Google)      │                            │
│  │ 09 Not ve hatırlatma                 │                            │
│  └──────┬──────────────────┬────────────┘                            │
│         │                  │                                         │
│   n8n_data volume    local-files/*.json (görev, fiyat, harcama, not) │
│   (DB + şifreli      (düz JSON dosyaları)                            │
│    credential'lar)                                                   │
└──────────────────────────────────────────────────────────────────────┘
          ▲ IMAP/SMTP/Gmail API — yalnızca SİZİN posta kutunuzla konuşur
```

| Workflow | Ne yapar | Gereken credential |
|---|---|---|
| `01-anlik-onemli-mail-bildirimi` | Gelen kutusunu canlı dinler; *acil, fatura, son ödeme…* geçen mailleri anında size iletir | IMAP + SMTP (§4-A) |
| `02-gunluk-mail-ozeti` | Her sabah 08:00'de son 24 saatin maillerini gönderene göre gruplayıp özet mail atar | Gmail OAuth2 (§4-B) |
| `03-gorev-takibi` | Webhook ile görev ekle/tamamla/sil + her sabah 08:05'te açık görevleri hatırlatır; veriler yerel JSON dosyasında | SMTP (§4-A) |
| `04-yerel-ai-ozet-ollama` | Metni internete göndermeden yerel AI ile özetler (örnek/başlangıç noktası) | — |
| `05-telegram-botu` | Telegram'dan görev, harcama, not ve hatırlatma yönetimi + her sabah 08:00 görev özeti telefona; dışa açık URL gerektirmez | — (.env'e bot token, §7.1) |
| `06-fiyat-takibi` | Her gün 09:00'da ürün sayfalarını kontrol eder; eşiğin altına inince / fiyat değişince mail atar | SMTP (§4-A) |
| `07-fatura-harcama-cikarma` | Fatura maillerinden tutarı ayıklayıp yerel dosyaya kaydeder; ayın 1'inde önceki ayın dökümünü mail atar | IMAP + SMTP (§4-A) |
| `08-gunluk-takvim-ozeti` | Her sabah 07:45'te Google Takvim'deki bugünün etkinliklerini Telegram'a (yoksa mail) gönderir | Google Calendar OAuth2 (§8.1) |
| `09-not-hatirlatma` | Hızlı not + hatırlatma: webhook veya Telegram'dan ekleyin, zamanı gelince bildirim gelir; veriler yerel JSON'da | — veya SMTP (§4-A) |

Her workflow'un tuvalinde, kurulum adımlarını anlatan Türkçe **sarı not kutuları** vardır.

## 2. Gereksinimler

- **Docker Desktop** (Mac/Windows) veya Docker Engine + Compose (Linux) — <https://docs.docker.com/get-docker/>
- Gmail hesabı (başka sağlayıcılar da olur; §4'teki host adreslerini değiştirmeniz yeterli)

## 3. Kurulum (≈5 dakika)

Repoyu bilgisayarınıza klonlayın (veya ZIP olarak indirin) ve klasörde bir
terminal açın:

```bash
git clone https://github.com/yokbi/n8n-local.git
cd n8n-local

# 1) Ortam dosyasını oluşturun ve şifreleme anahtarını üretin
cp .env.example .env
openssl rand -hex 32   # çıktıyı .env içindeki N8N_ENCRYPTION_KEY= satırına yapıştırın

# 2) Yerel veri dosyalarının başlangıç kopyalarını oluşturun
cp local-files/gorevler.ornek.json local-files/gorevler.json
cp local-files/fiyat-takibi.ornek.json local-files/fiyat-takibi.json
cp local-files/harcamalar.ornek.json local-files/harcamalar.json
cp local-files/notlar.ornek.json local-files/notlar.json

# 3) n8n'i başlatın
docker compose up -d
```

Tarayıcıda **<http://localhost:5678>** adresini açın. İlk açılışta bir **sahip
hesabı** oluşturmanız istenir — bu hesap yalnızca sizin makinenizde durur,
hiçbir yere kaydolmazsınız.

> 💡 `N8N_ENCRYPTION_KEY` mail şifrelerinizi diskte şifreler. `.env` dosyasını
> güvenli bir yere yedekleyin; anahtar kaybolursa kayıtlı credential'lar açılamaz.

## 4. E-posta kimlik bilgileri

İki yöntem var; ikisini de kurmanız gerekmez — hangi workflow'ları
kullanacaksanız onun gerektirdiğini kurun.

### A) Uygulama şifresi ile IMAP + SMTP (kolay yol — workflow 01 ve 03)

1. Google hesabınızda **2 Adımlı Doğrulama** açık olmalı:
   <https://myaccount.google.com/security>
2. **Uygulama şifresi** oluşturun: <https://myaccount.google.com/apppasswords>
   → 16 haneli şifreyi kopyalayın (**boşluksuz** girin).
3. Gmail'de IMAP açık olmalı: Gmail → ⚙️ Ayarlar → *Yönlendirme ve POP/IMAP* →
   IMAP'i etkinleştir.
4. n8n'de **Credentials → Add credential**:
   - **IMAP**: user = Gmail adresiniz, password = uygulama şifresi,
     host `imap.gmail.com`, port `993`, SSL/TLS ✔
   - **SMTP**: aynı kullanıcı/şifre, host `smtp.gmail.com`, port `465`, SSL/TLS ✔

> Gmail dışı sağlayıcılar için yalnızca host/port değişir
> (örn. Yandex: `imap.yandex.com` / `smtp.yandex.com`).

### B) Gmail OAuth2 (workflow 02 için)

Gmail node'u Google'ın resmî API'sini kullanır; tek seferlik ~10 dakikalık
Google Cloud kurulumu ister:

1. <https://console.cloud.google.com> → yeni proje oluşturun (adı önemsiz).
2. **APIs & Services → Library** → "Gmail API" → **Enable**.
3. **OAuth consent screen** → External → uygulama adı verin →
   **Test users** kısmına kendi Gmail adresinizi ekleyin.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. n8n'de **Credentials → Add credential → Gmail OAuth2 API** açın; gösterilen
   **OAuth Redirect URL**'yi (genelde
   `http://localhost:5678/rest/oauth2-credential/callback`) Google'daki
   **Authorized redirect URIs** alanına yapıştırın.
6. Google'ın verdiği **Client ID / Client Secret**'ı n8n'e girin →
   **Sign in with Google** → izin verin.

Resmî anlatım: <https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/>

## 5. Workflow'ları içe aktarma

1. n8n panelinde sol üstten **Workflows** → sağ üstteki **⋯** menüsü →
   **Import from File…**
2. `workflows/` klasöründeki dosyaları sırayla içe aktarın (hepsini kurmak
   zorunda değilsiniz — işinize yarayanları seçin).
3. Her workflow'u açın, tuvaldeki **sarı not** ne diyorsa yapın
   (credential seçin, `sizin-adresiniz@gmail.com` yazan yerleri değiştirin).
4. Sağ üstteki anahtarla workflow'u **Active** yapın.

> Webhook'lar (görev API'si) yalnızca workflow **Active** iken
> `http://localhost:5678/webhook/...` adresinde çalışır. Editördeki
> **Execute workflow** ile test ederken geçici `webhook-test/...` adresi kullanılır.

## 6. Görev API'sini başka uygulamalardan kullanma

Workflow 03 aktifken bilgisayarınızda iki uç açılır:

```bash
# Görev ekle
curl -X POST http://localhost:5678/webhook/gorev \
  -H 'Content-Type: application/json' \
  -d '{"baslik":"Süt al","not":"markete uğra"}'

# Tamamla / sil
curl -X POST http://localhost:5678/webhook/gorev \
  -H 'Content-Type: application/json' \
  -d '{"islem":"tamamla","id":1}'

# Listele
curl http://localhost:5678/webhook/gorevler
```

Her sabah **08:05**'te açık görevler e-posta ile gelir. Görevler
`local-files/gorevler.json` dosyasında düz JSON olarak durur — istediğiniz
programla açıp okuyabilirsiniz.

**Telefondan kullanmak** (aynı Wi-Fi'da):

1. `docker-compose.yml` içinde `"127.0.0.1:5678:5678"` satırını
   `"5678:5678"` yapın ve `N8N_SECURE_COOKIE=false` satırının başındaki
   `#` işaretini kaldırın; `docker compose up -d` ile yeniden başlatın.
2. Bilgisayarınızın yerel IP'sini öğrenin (örn. `192.168.1.20`).
3. **iPhone**: Kısayollar → yeni kısayol → *URL İçeriğini Al* →
   URL `http://192.168.1.20:5678/webhook/gorev`, Yöntem `POST`,
   İstek Gövdesi `JSON` → `baslik` alanını *Her Seferinde Sor* yapın.
   Ana ekrana ekleyin: tek dokunuşla görev ekleme.
   **Android**: "HTTP Shortcuts" uygulamasıyla aynı isteği tanımlayın.

> 🔒 Bu durumda n8n paneli ağınızdaki herkese açılır. Ev ağınız dışında
> kullanmayın; isterseniz Webhook node'una *Authentication → Header Auth*
> ekleyip kısayola da aynı başlığı koyarak uçları şifreleyebilirsiniz.

## 7. Telegram botu, fiyat takibi ve harcama kaydı

### 7.1 Telegram botu (workflow 05)

Görevlerinizi, harcamalarınızı ve notlarınızı telefonunuzdan yönetin; her sabah
08:00'de açık görevler Telegram'dan gelir. Veriler workflow 03, 06, 07 ve 09 ile
**aynı yerel dosyalardır** — webhook'tan eklediğinizi botta da görürsünüz.

| Komut | Ne yapar |
|---|---|
| *düz metin* | Yazdığınızı görev olarak ekler |
| `/liste` · `/tamamla 3` · `/sil 3` | Görevleri listeler / tamamlar / siler |
| `/harcama 149,90 market` | Harcamayı `harcamalar.json` dosyasına kaydeder, ayın toplamını söyler |
| `/harcamalar` | Bu ayın harcama dökümü (gönderene göre gruplu) |
| `/fiyat` | Takip listesindeki ürünlerin son fiyatı ve hedefi (workflow 06 verisi) |
| `/not Süt al` | Hızlı not ekler |
| `/hatirlat 18:30 çamaşırı as` | Hatırlatma kurar — `18:30` · `30dk` · `2saat` · `yarın 09:00` · `25.08 14:00` |
| `/notlar` · `/notsil 3` | Notları ve bekleyen hatırlatmaları listeler / siler |
| `/bugun` | Açık görevler + bugünün hatırlatmaları + bugünkü harcama toplamı |
| `/yardim` | Komut listesi |

> ⏰ `/hatirlat` ile kurduğunuz hatırlatmaların **zamanı gelince** gönderilmesi
> için workflow 09'un da Active olması gerekir (§8.2).

1. Telegram'da **@BotFather**'a `/newbot` yazın; verdiği token'ı `.env`
   dosyasına `TELEGRAM_BOT_TOKEN=...` olarak ekleyin.
2. `docker compose up -d` deyin (yeni ortam değişkeninin yüklenmesi için
   yeniden başlatma şarttır).
3. Workflow 05'i içe aktarıp **Active** yapın ve botunuza `/start` yazın —
   bot size sohbet ID'nizi söyler (yanıt ~1 dakika içinde gelir).
4. ID'yi `.env` içine `TELEGRAM_CHAT_ID=...` olarak yazın ve bir kez daha
   `docker compose up -d` deyin. Bundan sonra bot **yalnızca sizi** dinler ve
   sabah özeti Telegram'a gelir.

> Teknik not: bu bot, n8n'in hazır Telegram Trigger'ı yerine dakikada bir
> `getUpdates` yoklaması kullanır — böylece dışarıya port veya tünel açmanız
> gerekmez, kurulum dışa kapalı kalır. Bedeli, yanıtların en fazla ~1 dakika
> gecikmesidir. Mesaj içerikleri doğal olarak Telegram sunucularından geçer;
> görev dosyanız ise makinenizde kalır.

### 7.2 Fiyat takibi (workflow 06)

Takip listesi `local-files/fiyat-takibi.json` dosyasındadır; her ürün için
şunları girersiniz:

```json
{ "ad": "Kulaklık", "url": "https://...", "secici": ".product-price", "esik": 1500 }
```

Her gün 09:00'da kontrol edilir; fiyat eşiğin altına inince veya değişince
mail gelir, son fiyat ve varsa hata (`sonHata`) dosyaya işlenir.

- **CSS seçici bulmak:** ürün sayfasında fiyata sağ tıklayın → *İncele* →
  vurgulanan öğeye sağ tık → *Copy → Copy selector*.
- Fiyatı tarayıcıda sonradan yüklenen (JavaScript) siteler bu yöntemle
  okunamayabilir — **Elle Test Et** tetikleyicisiyle deneyip `sonHata`
  alanına bakın.

### 7.3 Fatura ve harcama kaydı (workflow 07)

Konu veya gövdesinde *fatura, ekstre, dekont, ödeme, tahsilat, abonelik*
geçen maillerden TL tutarı ayıklanır ("toplam/tutar/ödenecek" yakınındaki
değer tercih edilir) ve `local-files/harcamalar.json` dosyasına eklenir.
Her ayın 1'inde 08:10'da önceki ayın gönderene göre dökümü mail olarak gelir.

- Anahtar kelimeleri workflow'daki **Fatura mı?** düğümünden düzenleyin.
- Aynı fatura (aynı gün + aynı konu) iki kez kaydedilmez.
- Dosya düz JSON'dur: yanlış okunan tutarı elle düzeltebilir, veriyi başka
  bir bütçe uygulamasına kaynak olarak kullanabilirsiniz.

## 8. Takvim özeti, not ve hatırlatma

### 8.1 Günlük takvim özeti (workflow 08)

Her sabah **07:45**'te Google Takvim'inizdeki bugüne ait etkinlikler tek mesajda
gelir: saat aralığı, konum ve varsa Meet bağlantısı. `.env` içinde Telegram
kuruluysa mesaj **Telegram'a**, değilse **mail** olarak gönderilir. Takvimde
etkinlik yoksa mesaj gönderilmez.

Google Takvim credential'ı, Gmail OAuth2 ile aynı yolla kurulur (§4-B); tek
farkı **Library**'de "Google Calendar API"yi etkinleştirmeniz ve n8n'de
**Google Calendar OAuth2 API** credential'ı oluşturmanızdır. Sonra:

1. **Bugünün Etkinlikleri** düğümünde credential'ı seçin, **Calendar** alanından
   takviminizi seçin (varsayılan `primary` = ana takviminiz).
2. Mail yolunu kullanacaksanız **Takvim Özetini Mail At (SMTP)** düğümündeki
   `sizin-adresiniz@gmail.com` alanlarını değiştirin.
3. **Elle Test Et** tetikleyicisiyle deneyin, sonra workflow'u **Active** yapın.

Saati değiştirmek için *Her Sabah 07:45* düğümünü, yarını görmek için
`timeMin`/`timeMax` ifadelerini (`$now` → `$now.plus({ days: 1 })`) düzenleyin.

### 8.2 Not ve hatırlatma (workflow 09)

Notlar ve hatırlatmalar `local-files/notlar.json` dosyasında durur. Workflow üç
işi yapar: webhook'tan not ekleme, listeleme ve **5 dakikada bir** zamanı gelen
hatırlatmaları gönderme (Telegram kuruluysa oraya, yoksa mail).

```bash
# Not ekle (hatirlat alanı isteğe bağlı)
curl -X POST http://localhost:5678/webhook/not \
  -H 'Content-Type: application/json' \
  -d '{"metin":"Çamaşırı as","hatirlat":"18:30"}'

# Sil
curl -X POST http://localhost:5678/webhook/not \
  -H 'Content-Type: application/json' \
  -d '{"islem":"sil","id":3}'

# Listele
curl http://localhost:5678/webhook/notlar
```

`hatirlat` biçimleri: `18:30` (saat geçtiyse yarın) · `yarın 09:00` · `30dk` ·
`2saat` · `25.08 14:00` · ISO tarih (`2026-12-25T14:00:00`). Alanı boş
bırakırsanız düz not olur, bildirim gönderilmez.

Gönderilen hatırlatma `durum: "gonderildi"` olarak işaretlenir, ikinci kez
gelmez. Bildirim en fazla ~5 dakika gecikir; hassaslaştırmak için *Her 5
Dakikada* düğümündeki aralığı 1 dakika yapın.

> Telegram botundan `/hatirlat 18:30 çamaşırı as` yazmak da aynı dosyaya
> hatırlatma ekler (§7.1) — iki workflow tek listeyi paylaşır.

> ⚠️ Bu dosyayı iki workflow da yazabildiği için (bot dakikada bir, hatırlatıcı
> 5 dakikada bir), tam aynı ana denk gelen iki yazma işleminden biri diğerini
> ezebilir. Pratikte nadirdir; şüphelenirseniz `/notlar` ile kontrol edin.

## 9. Opsiyonel: Yerel AI (Ollama)

Mail özetini "insan gibi" yazsın ama veriler makineden çıkmasın istiyorsanız:

```bash
docker compose --profile ai up -d
docker exec -it ollama ollama pull qwen2.5:3b   # tek seferlik, ~2 GB
```

Sonra `04-yerel-ai-ozet-ollama` workflow'unu açıp **Execute workflow** deyin —
örnek metnin özeti son düğümde görünür. Kendi verinize bağlamak için
workflow'daki nota bakın (örn. 02'nin özetini Ollama'ya yazdırmak).
Türkçesi daha iyi/kötü modeller için `llama3.2:3b`, `gemma2:2b` gibi
alternatifleri deneyebilirsiniz.

## 10. Verileriniz nerede? Yedekleme

| Veri | Yer |
|---|---|
| Workflow'lar, çalıştırma geçmişi, hesap | Docker volume `n8n_data` içindeki SQLite DB |
| Mail şifreleri / OAuth token'ları | Aynı DB'de, `N8N_ENCRYPTION_KEY` ile **şifreli** |
| Görevler, fiyat listesi, harcamalar, notlar | `local-files/*.json` (düz dosyalar, sizde) |
| AI modelleri | Docker volume `ollama_data` |

Yedek almak için:

```bash
docker compose stop n8n
docker run --rm -v n8n_n8n_data:/veri -v "$PWD":/yedek alpine \
  tar czf /yedek/n8n-yedek.tar.gz -C /veri .
docker compose start n8n
```

`.env` dosyasını (şifreleme anahtarını) ve `local-files/` klasörünü de aynı
yedeğe koyun. Geri yükleme aynı komutun `tar xzf` hâlidir.

`docker compose down` veriyi **silmez**; volume'lar durur. Veriyi bilerek
silmek isterseniz: `docker compose down -v` (geri dönüşü yoktur).

## 11. Başka uygulamalar bağlamak

n8n'de yüzlerce hazır node var — Telegram, Google Takvim, Notion, Todoist,
Slack, WhatsApp, RSS… Panelde **+** deyip aramanız yeterli. İki yol:

- **Hazır node'lar**: örn. günlük mail özetini (02) Telegram'dan almak için
  son düğümü, workflow 05'teki **Özeti Telegrama Gönder** HTTP düğümünün bir
  kopyasıyla değiştirmeniz yeterli (credential bile gerekmez, token .env'den
  gelir).
- **Webhook'lar**: workflow 03'teki gibi kendi HTTP uçlarınızı açın; HTTP
  isteği atabilen her uygulama (kısayollar, betikler, diğer programlar)
  n8n'inizi tetikleyebilir.

Hangi servisi bağlarsanız bağlayın, kimlik bilgileri yine yalnızca sizin
makinenizde (şifreli) durur.

## 12. Sorun giderme

| Belirti | Çözüm |
|---|---|
| `localhost:5678` açılmıyor | Docker Desktop çalışıyor mu? `docker compose ps` ve `docker compose logs n8n` çıktısına bakın. |
| "port is already allocated" | 5678 portu doluysa compose'ta `"127.0.0.1:5679:5678"` yapın → panel `localhost:5679`. |
| Tarayıcı "secure cookie" hatası veriyor | IP ile (http) erişiyorsunuz demektir → compose'ta `N8N_SECURE_COOKIE=false` satırını açın. |
| IMAP/SMTP "Invalid credentials" | Uygulama şifresini **boşluksuz** girin; normal Gmail şifresi çalışmaz; IMAP'in Gmail ayarlarından açık olduğundan emin olun. |
| Gmail OAuth "access blocked / 403" | Consent screen'de kendinizi **Test users**'a eklemediniz. |
| Zamanlama yanlış saatte çalışıyor | `.env` içindeki `GENERIC_TIMEZONE` doğru mu? Değiştirince `docker compose up -d` ile yeniden başlatın. |
| Webhook 404 dönüyor | Workflow **Active** değil, ya da test modundayken üretim URL'sini çağırdınız (tersi de olur). |
| Görev API'si "dosya bulunamadı" hatası | `cp local-files/gorevler.ornek.json local-files/gorevler.json` adımı atlanmış. |
| Ollama isteği zaman aşımı | Model henüz iniyor olabilir: `docker logs -f ollama`. İlk yanıt model yüklenirken yavaştır. |
| Telegram botu yanıt vermiyor | `.env`'e token yazdıktan sonra `docker compose up -d` yaptınız mı? Workflow 05 **Active** mi? Bot dakikada bir bakar — 1 dk bekleyin. `TELEGRAM_CHAT_ID` doluysa yalnızca o sohbete yanıt verilir. |
| Fiyat okunamıyor / `sonHata` dolu | CSS seçiciyi kontrol edin; sayfayı tarayıcıda *kaynağı görüntüle* ile açın — fiyat kaynakta yoksa (JS ile geliyorsa) bu yöntem çalışmaz. |
| Takvim özeti gelmiyor | Workflow 08 **Active** mi, credential ve **Calendar** alanı seçili mi? Takvimde bugün etkinlik yoksa mesaj gönderilmez — **Elle Test Et** ile deneyin. |
| Hatırlatma zamanı gelince bildirim yok | Workflow 09 **Active** mi? `local-files/notlar.json` kopyalandı mı? Kontrol 5 dakikada bir yapılır. Telegram kuruluysa bildirim mail yerine Telegram'a gider. |
| Bot komutu "dosya bulunamadı" gibi davranıyor | `/harcama`, `/fiyat`, `/not` komutları `harcamalar.json`, `fiyat-takibi.json` ve `notlar.json` dosyalarını okur — §3'teki kopyalama adımını tamamlayın. |

## 13. Güncelleme

```bash
docker compose pull
docker compose up -d
```

Workflow'larınız ve credential'larınız volume'da olduğu için güncellemeden etkilenmez.
