# 🏠 Yerel n8n Otomasyon Kurulumu

Kendi bilgisayarınızda çalışan, **verileri dışarı göndermeyen** kişisel otomasyon
merkezi: günlük e-posta özeti, önemli mail uyarıları, Telegram'dan yönetilen
yerel görev listesi, fiyat takibi, fatura/harcama kaydı, günlük takvim özeti,
not/hatırlatma ve isterseniz tamamen yerel AI (Ollama).

Yazılım geliştiriyorsanız **geliştirici paketi** (workflow 17–21) da hazır:
servis/uptime nöbetçisi, GitHub inceleme ve CI takibi, kod parçacığı kasası,
internetsiz araç kutusu (uuid · base64 · JWT · cron · JSON) ve kendi webhook
yakalayıcınız. Hepsi **iPhone, Mac ve Windows'tan** kullanılabilir — §13 ve §15.

Günlük hayat için **kişisel takip paketi** (workflow 22–26): alışkanlık
serileri, aylık bütçe limiti, abonelik/ödeme hatırlatıcısı, doğum günü ve
yıl dönümleri, Pazar akşamı haftalık rapor — §14.

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
9. [Günaydın brifingi ve hata nöbetçisi](#9-günaydın-brifingi-ve-hata-nöbetçisi)
10. [Haberler, yedekleme ve sayfa takibi](#10-haberler-yedekleme-ve-sayfa-takibi)
11. [Opsiyonel: Yerel AI (Ollama)](#11-opsiyonel-yerel-ai-ollama)
12. [Yerel AI sohbet ve link özetleyici](#12-yerel-ai-sohbet-ve-link-özetleyici)
13. [Geliştirici paketi (workflow 17–21)](#13-geliştirici-paketi-workflow-1721)
14. [Kişisel takip paketi (workflow 22–26)](#14-kişisel-takip-paketi-workflow-2226)
15. [iPhone, Mac ve Windows'tan kullanmak](#15-iphone-mac-ve-windowstan-kullanmak)
16. [Verileriniz nerede? Yedekleme](#16-verileriniz-nerede-yedekleme)
17. [Başka uygulamalar bağlamak](#17-başka-uygulamalar-bağlamak)
18. [Sorun giderme](#18-sorun-giderme)
19. [Güncelleme](#19-güncelleme)

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
│  │ 10 Günaydın brifingi — 07:30         │                            │
│  │ 11 Hata nöbetçisi (tüm workflow'lar) │                            │
│  │ 12 Yerel AI sohbet           ────────┼─────▶                      │
│  │ 13 Link özetleyici           ────────┼─────▶                      │
│  │ 14 RSS haber özeti — 08:15   ────────┼─────▶                      │
│  │ 15 Otomatik yedekleme — 03:00        │                            │
│  │ 16 Sayfa değişiklik takibi           │                            │
│  │ ── geliştirici paketi ─────────────  │                            │
│  │ 17 Servis nöbetçisi (uptime)         │                            │
│  │ 18 GitHub nöbetçisi (PR, CI, issue)  │                            │
│  │ 19 Kod parçacığı kasası              │                            │
│  │ 20 Geliştirici araç kutusu           │                            │
│  │ 21 Webhook yakalayıcı                │                            │
│  │ ── kişisel takip paketi ───────────  │                            │
│  │ 22 Alışkanlık takibi — 21:00         │                            │
│  │ 23 Bütçe nöbetçisi — 20:00           │                            │
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
| `10-gunaydin-brifingi` | Her sabah 07:30'da hava durumu, döviz kuru, açık görevler, bugünün hatırlatmaları ve dünkü harcama tek mesajda | — veya SMTP (§9.1) |
| `11-hata-nobetcisi` | Herhangi bir workflow hata verdiğinde anında uyarır; hataları yerel dosyaya kaydeder | — veya SMTP (§9.2) |
| `12-yerel-ai-sohbet` | Ollama ile sohbet: webhook'tan veya Telegram'da `/ai` ile; geçmiş yerel dosyada tutulur | — (Ollama, §12.1) |
| `13-link-ozetleyici` | Gönderdiğiniz bağlantıyı indirip yerel AI ile özetler, okuma listesine kaydeder (`/oku`) | — (Ollama, §12.2) |
| `14-rss-haber-ozeti` | Takip ettiğiniz RSS/Atom beslemelerinden yalnızca **yeni** haberleri gönderir; isteğe bağlı AI özeti | — veya SMTP (§10.1) |
| `15-otomatik-yedekleme` | Her gece `local-files/` klasörünü tarihli klasöre kopyalar; isteğe bağlı workflow yedeği | — (§10.2) |
| `16-sayfa-degisiklik-takibi` | Takip ettiğiniz sayfaların içeriği değişince haber verir (fiyat takibinin metin sürümü) | — veya SMTP (§10.3) |
| `17-servis-nobetcisi` | Siteleriniz/API'leriniz 5 dakikada bir yoklanır; düşünce ve düzelince bir kez haber verir (`/servis`) | — veya SMTP (§13.1) |
| `18-github-nobetcisi` | İncelemenizi bekleyen PR, CI'ı kırık PR, size atanmış issue ve anılmalar (`/pr`) | GitHub token (§13.2) |
| `19-kod-parcacik-kasasi` | Kod parçacıklarınızı kaydedip her cihazdan arayın (`/kod`, `curl`) | — (§13.3) |
| `20-gelistirici-arac-kutusu` | uuid · base64 · JWT · epoch · JSON · SHA-256 · cron — internetsiz (`/arac`) | — (§13.4) |
| `21-webhook-yakalayici` | Gelen HTTP isteğini olduğu gibi kaydeder ve gösterir; kendi request-bin'iniz (`/istekler`) | — (§13.5) |
| `22-aliskanlik-takibi` | Her gün tekrarlanan işler için "yaptım" işareti ve 🔥 seri; akşam 21:00'de eksikleri hatırlatır (`/yaptim`) | — veya SMTP (§14.1) |
| `23-butce-nobetcisi` | Aylık ve kategori bazlı harcama limiti; %80 ve %100'de ayda bir kez uyarır, günlük harcanabilir tutarı söyler (`/butce`) | — veya SMTP (§14.2) |

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
cp local-files/hatalar.ornek.json local-files/hatalar.json
cp local-files/sohbet.ornek.json local-files/sohbet.json
cp local-files/okunacaklar.ornek.json local-files/okunacaklar.json
cp local-files/rss-kaynaklar.ornek.json local-files/rss-kaynaklar.json
cp local-files/rss-durum.ornek.json local-files/rss-durum.json
cp local-files/sayfa-takibi.ornek.json local-files/sayfa-takibi.json
# Geliştirici paketi (workflow 17–21):
cp local-files/servisler.ornek.json local-files/servisler.json
cp local-files/github-durum.ornek.json local-files/github-durum.json
cp local-files/parcacikalar.ornek.json local-files/parcacikalar.json
cp local-files/yakalanan-istekler.ornek.json local-files/yakalanan-istekler.json
# Kişisel takip paketi (workflow 22–26):
cp local-files/aliskanliklar.ornek.json local-files/aliskanliklar.json
cp local-files/butce.ornek.json local-files/butce.json

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

### Workflow mantığını Docker'sız denemek

Workflow'ların Code düğümlerindeki mantık (bozuk dosya koruması, "aynı haberi
iki kez gönderme", Ollama kapalıyken veri kaybetmeme…) n8n başlatılmadan
denenebilir:

```bash
node testler/kod-testleri.js
```

Node.js dışında bir şey gerekmez; gerçek HTTP isteği atılmaz, dosya yazılmaz.
Bir Code düğümünü değiştirdikten sonra bunu çalıştırmak iyi bir alışkanlıktır.

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

> 💡 Ağı hiç açmadan telefondan kullanmanın yolu **Telegram botudur** (§7.1):
> bot dışarıya kapı açmaz, Telegram'ı kendisi yoklar. Hangi özelliğin hangi
> cihazdan nasıl kullanıldığı §15'te tablo hâlinde.

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
- Bazı siteler otomatik istekleri engeller; `sonHata` alanında `403`
  görürseniz o ürün bu yöntemle takip edilemez.

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

## 9. Günaydın brifingi ve hata nöbetçisi

### 9.1 Günaydın brifingi (workflow 10)

Her sabah **07:30**'da tek bir mesaj: hava durumu, dolar/euro kuru, açık
görevleriniz, bugünün hatırlatmaları ve dünkü harcama toplamı.

Telegram kuruluysa (§7.1) oraya, değilse SMTP mail olarak gider.
**Hiçbir API anahtarı gerekmez** — hava [Open-Meteo](https://open-meteo.com),
kur ise TCMB'nin günlük yayınından okunur.

Konumunuzu `.env` dosyasına yazın (boş bırakılırsa İstanbul kullanılır):

```bash
HAVA_SEHIR=Ankara
HAVA_ENLEM=39.93
HAVA_BOYLAM=32.86
```

Sonra `docker compose up -d` ile n8n'i yeniden başlatın.

> Takvim bilerek dâhil değildir: workflow 08 zaten 07:45'te ayrı bir takvim
> özeti gönderir. İkisini birleştirmek isterseniz 08'in metnini bu workflow'un
> **Brifingi Hazırla** düğümüne taşıyabilirsiniz.
>
> TCMB hafta sonu ve resmî tatillerde kur yayınlamaz; o günlerde **son iş
> gününün** kuru görünür.

### 9.2 Hata nöbetçisi (workflow 11)

Bir workflow bozulduğunda n8n varsayılan olarak **sessiz kalır** — sabah özeti
gelmez, siz de günlerce fark etmezsiniz. Bu workflow o boşluğu kapatır:
herhangi bir workflow hata verdiğinde anında Telegram (yoksa mail) uyarısı
gönderir, hatayı `local-files/hatalar.json` içine yazar (son 200 kayıt) ve aynı
workflow gün içinde tekrar patlarsa *"🔁 Bugün 3. kez"* notunu ekler.

**Bunu Active yapmak yetmez.** n8n'de her workflow kendi hata workflow'unu
ayrıca seçer:

1. Workflow 11'i içe aktarın ve **kaydedin**.
2. Diğer workflow'lardan birini açın → sağ üst **⋮ → Settings**.
3. **Error Workflow** listesinden **11 — Hata Nöbetçisi**'ni seçin → **Save**.
4. Aynısını kullandığınız tüm workflow'lar için tekrarlayın.

Denemek için herhangi bir workflow'a geçici bir Code düğümü ekleyip içine
`throw new Error('deneme');` yazın ve elle çalıştırın — uyarı gelmeli.

> Workflow 11'in kendi **Error Workflow** ayarını boş bırakın; nöbetçinin
> nöbetçisi olmaz. Nöbetçi kendisi de asla durmaz: `hatalar.json` bozuksa
> dosyaya yazmayı atlar ama **bildirimi yine gönderir**.

## 10. Haberler, yedekleme ve sayfa takibi

### 10.1 RSS haber özeti (workflow 14)

Takip ettiğiniz beslemeleri her sabah **08:15**'te tarar ve **yalnızca daha
önce göstermediklerini** gönderir. RSS ve Atom desteklenir; hesap, anahtar
veya kayıt gerekmez.

Kaynakları `local-files/rss-kaynaklar.json` dosyasına yazın:

```json
{ "kaynaklar": [
  { "ad": "BBC News Türkçe", "url": "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { "ad": "Kendi blogum",    "url": "https://ornek.com/feed" }
] }
```

Görülen bağlantılar `local-files/rss-durum.json` içinde tutulur, bu yüzden aynı
haber iki kez gelmez.

> **İlk çalıştırma sessizdir:** mevcut haberler "görüldü" diye işaretlenir,
> yüzlerce eski haber gönderilmez. Bildirimler ikinci turdan itibaren başlar.

İsteğe bağlı olarak başlıkları yerel AI'ya özetletebilirsiniz — `.env`
dosyasına `RSS_AI_OZET=1` yazın (Ollama açık olmalı, §11). Ollama kapalıysa
özet atlanır, haber listesi yine gelir.

### 10.2 Otomatik yedekleme (workflow 15)

Her gece **03:00**'te `local-files/` klasöründeki bütün `.json` dosyalarını
tarihli bir klasöre kopyalar:

```
local-files/yedek/2026-09-12-gorevler.json
local-files/yedek/2026-09-12-notlar.json
…
```

Yedekler `local-files/yedek/` klasöründe, dosya adının başında tarihle durur.
Bu klasör depoyla birlikte gelir — n8n'in dosya yazma düğümü var olmayan bir
klasörü kendiliğinden oluşturmadığı için tarih klasör adı değil dosya adıdır.

Workflow'ların kendisi n8n'in veritabanında durur. Onları da yedeklemek
isterseniz panelde **profil → Settings → n8n API → Create an API key** deyip
anahtarı `.env` dosyasına `N8N_API_KEY=...` olarak yazın; artık her gece
`yedek/<tarih>-workflows.json` da oluşur. Anahtar boşsa bu adım sessizce
atlanır.

> ⚠️ **Bu bir dış yedek değildir** — aynı diskte durur. `local-files/`
> klasörünü ayrıca harici bir diske veya bulut yedeğinize dâhil edin (§16).

Yedekler birikir; ayda bir temizlemek için:

```bash
find local-files/yedek -type f -name '*.json' -mtime +30 -delete
```

Geri yükleme: ilgili dosyayı `yedek/` klasöründen tarihsiz adıyla köke
kopyalayın:

```bash
cp local-files/yedek/2026-09-12-gorevler.json local-files/gorevler.json
```

### 10.3 Sayfa değişiklik takibi (workflow 16)

Fiyat takibinin (workflow 06) genel hâli: sayı değil **metin** izler. Bir
duyuru sayfası, iş ilanı listesi, kontenjan tablosu ya da "stokta yok" yazısı
değiştiğinde haber verir. Kontrol **6 saatte bir** yapılır.

`local-files/sayfa-takibi.json`:

```json
{ "sayfalar": [
  { "ad": "Duyurular",
    "url": "https://ornek.com/duyurular",
    "secici": ".duyuru-listesi" }
] }
```

`secici` isteğe bağlıdır — yazılmazsa sayfanın tamamı (`body`) izlenir. Ancak
tüm sayfayı izlerseniz reklam, tarih, sayaç gibi her yüklemede değişen parçalar
yüzünden sürekli uyarı alırsınız; **doğru seçiciyi vermek önemlidir**.
Seçiciyi bulmak için sayfayı tarayıcıda açın → ilgili bölüme sağ tık →
**İncele** → işaretli satıra sağ tık → **Copy → Copy selector**.

> İlk kontrol sessizdir (başlangıç durumu kaydedilir). İçerik JavaScript ile
> yükleniyorsa — workflow 06'daki gibi — bu yöntemle izlenemez; bu durumda
> `sayfa-takibi.json` içindeki `sonHata` alanı sebebi yazar.

## 11. Opsiyonel: Yerel AI (Ollama)

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

## 12. Yerel AI sohbet ve link özetleyici

Bu iki workflow, §11'de kurduğunuz Ollama'yı günlük kullanıma bağlar. Sorunuz
da cevabı da bilgisayarınızdan çıkmaz.

Hangi modelin kullanılacağını `.env` içindeki `OLLAMA_MODEL` belirler
(varsayılan `qwen2.5:3b`).

### 12.1 Yerel AI sohbet (workflow 12)

```bash
# Soru sor
curl -s -X POST http://localhost:5678/webhook/ai \
  -H 'Content-Type: application/json' \
  -d '{"soru": "Kısaca n8n nedir?"}'

# Sohbet geçmişini temizle
curl -s -X POST http://localhost:5678/webhook/ai \
  -H 'Content-Type: application/json' \
  -d '{"komut": "sifirla"}'
```

Sohbet hatırlanır: `local-files/sohbet.json` içinde oturum başına son 100 mesaj
saklanır, modele son 10 tur gönderilir. `{"soru": "...", "oturum": "is"}`
diyerek ayrı sohbetler tutabilirsiniz.

İlk soru modeli belleğe yüklediği için yavaştır (30 saniyeyi bulabilir),
sonrakiler hızlanır. Model cevap veremezse **geçmiş bozulmaz** — ne soru ne
cevap dosyaya yazılır.

### 12.2 Link özetleyici (workflow 13)

```bash
# Bağlantı ekle
curl -s -X POST http://localhost:5678/webhook/oku \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://ornek.com/yazi", "etiket": "iş"}'

# Okuma listesini görüntüle
curl -s http://localhost:5678/webhook/okunacaklar
```

Sayfa indirilir, metni ayıklanır, yerel AI kısa bir özet çıkarır ve hepsi
`local-files/okunacaklar.json` içine kaydedilir. Ollama kapalı olsa bile
çalışır: özet üretilmez ama başlık, adres ve sayfanın kendi açıklaması
kaydedilir. Aynı adres ikinci kez gönderilirse yeniden indirilmez.

İçerik JavaScript ile yükleniyorsa metin ayıklanamaz; bu durumda model
**bilerek çağrılmaz** (uydurma özet üretmesin diye), bağlantı yine listeye
girer.

### 12.3 Telegram'dan kullanmak

Workflow 05'teki bota şunları yazabilirsiniz:

| Komut | Ne yapar |
|---|---|
| `/ai <soru>` | Soruyu yerel modele sorar, cevabı Telegram'a gönderir |
| `/aisifirla` | O sohbetin geçmişini temizler |
| `/oku <adres>` | Sayfayı özetler ve okuma listesine ekler |

**Tek seferlik ayar gerekir.** Workflow 05'i açın, tuvalin altındaki
*AI Workflow'una İlet* ve *Link Workflow'una İlet* düğümlerine tıklayıp
**Workflow** listesinden 12 ve 13 numaralı workflow'ları seçin, kaydedin.
Bu adım atlanırsa yalnızca bu iki komut çalışmaz; bot diğer her şeye cevap
vermeye devam eder.

> Bu çağrılar **cevabı beklemeden** yapılır. Sebebi: `docker-compose.yml`
> içinde çalıştırmalar sıraya alınmıştır (`N8N_CONCURRENCY_PRODUCTION_LIMIT=1`,
> §16). Bot cevabı bekleseydi, beklediği workflow sıraya girip hiç
> başlayamazdı. Bu yüzden bot önce *"🤔 Düşünüyorum…"* der, cevabı 12 numaralı
> workflow ayrıca gönderir.

## 13. Geliştirici paketi (workflow 17–21)

Bu beş workflow yazılım geliştirirken işe yarayan şeyleri yapar ve üçünü de
aynı anda destekler: **iPhone** (Telegram), **Mac** ve **Windows** (terminal,
tarayıcı, kısayol). Hepsi yereldir; veri dışarı çıkmaz.

| # | Workflow | Ne verir | Gereken |
|---|---|---|---|
| 17 | Servis nöbetçisi | Siteniz/API'niz düşünce anında haber | — |
| 18 | GitHub nöbetçisi | İnceleme bekleyen PR, kırık CI, atanmış issue | `GITHUB_TOKEN` |
| 19 | Kod parçacığı kasası | Komutlarınız her cihazdan erişilebilir | — |
| 20 | Geliştirici araç kutusu | uuid · base64 · JWT · cron · JSON · SHA-256 | — |
| 21 | Webhook yakalayıcı | Gelen isteği olduğu gibi görmek | — |

### 13.1 Servis nöbetçisi (workflow 17)

`local-files/servisler.json` içindeki adresleri **5 dakikada bir** yoklar.

```json
{ "servisler": [
  { "ad": "API sağlık", "url": "https://api.ornek.com/health",
    "beklenenKod": 200, "icerir": "ok", "esik": 2 }
] }
```

| Alan | Anlamı |
|---|---|
| `beklenenKod` | Bu koddan farklı yanıt gelirse arıza (varsayılan `200`) |
| `icerir` | Yanıtın içinde geçmesi gereken metin — boşsa kontrol edilmez |
| `esik` | Kaç üst üste başarısız yoklamadan sonra uyarı (varsayılan `2`) |
| `zamanAsimi` | Milisaniye (varsayılan `15000`) |

**Uyarı yalnızca durum değişince gider:** servis düşünce bir kez, düzelince bir
kez ("*3 sa 12 dk kapalı kaldı*"). Aradaki turlarda telefonunuz susar. Anlık ağ
takılmaları `esik` sayesinde elenir.

```bash
curl http://localhost:5678/webhook/servisler   # o anki durum (JSON)
```
Telegram'dan: `/servis`

### 13.2 GitHub nöbetçisi (workflow 18)

**15 dakikada bir** beş sorgu çalıştırır ve yalnızca **yeni** olanları bildirir:

| | |
|---|---|
| 🔍 | İncelemenizi bekleyen PR'lar |
| 🔴 | CI'ı kırık kendi PR'larınız (`status:failure`) |
| ✅ | Onaylanmış, birleştirilmeyi bekleyen PR'larınız |
| 📌 | Size atanmış issue'lar |
| 📣 | Adınızın geçtiği konular |

**Kurulum.** GitHub → *Settings → Developer settings → Personal access tokens*
ile **okuma yetkili** bir token üretin (classic için `repo` + `notifications`;
yalnızca açık depolar için yetkisiz token da yeter), `.env` dosyasına yazın:

```bash
GITHUB_TOKEN=ghp_...
GITHUB_KULLANICI=            # boşsa token'ın sahibi (@me) izlenir
```
sonra `docker compose up -d`. Token boşsa workflow **sessizce** durur.

İlk tarama bilerek sessizdir (mevcut 40 PR birden telefonunuza düşmesin diye).
Bir sorgu hata verirse o kategorinin işaretleri korunur — sorun geçince eski
kayıtlar "yeni" sanılıp tekrar bildirilmez.

Telegram'dan: `/pr` → son taramanın tam dökümü.

### 13.3 Kod parçacığı kasası (workflow 19)

Bir kez yazdığınız komutu bir daha aramayın; `local-files/parcacikalar.json`
dosyasında durur.

```bash
# Kaydet (Mac/Linux/WSL)
curl -X POST http://localhost:5678/webhook/kod \
  -H 'Content-Type: application/json' \
  -d '{"baslik":"Portu dinleyeni bul","dil":"bash","etiket":"ağ",
       "kod":"lsof -i :5678"}'

# Ara — başlık, etiket, dil ve kod içinde arar
curl 'http://localhost:5678/webhook/kodlar?ara=port'

# Doğrudan panoya (Mac: pbcopy · Windows: clip)
curl -s 'http://localhost:5678/webhook/kodlar?id=1&sade=1' | pbcopy
```

Telegram'dan:

```
/kod docker          → arar, ilk 5 sonucu listeler
/kodgetir 3          → #3'ü kod bloğu olarak gönderir (dokun-kopyala)
/kodkaydet Yedek al #pg
pg_dump -Fc veritabani > yedek.dump
/kodsil 3
```
İlk satır başlık, ikinci satırdan itibaren kodun kendisidir; başlıktaki `#etiket`ler
ayıklanır. Arama puanlıdır: **başlık > etiket/dil > kod içi**, eşitlikte çok
kullanılan öne geçer.

### 13.4 Geliştirici araç kutusu (workflow 20)

Telefonda base64 çözmek ya da JWT'nin içine bakmak için "online decoder"
sitelerine gitmeye gerek yok — hepsi burada, **internetsiz ve saf JavaScript**:

| İşlem | Örnek |
|---|---|
| `uuid` | `/arac uuid` |
| `b64` | `/arac b64 bWVyaGFiYQ==` (kodlamayı/çözmeyi kendi anlar) |
| `jwt` | `/arac jwt eyJhbGciOi…` → başlık, gövde, `exp` süresi geçmiş mi |
| `zaman` | `/arac zaman 1735689600` → ISO, yerel saat, "625 gün önce" |
| `json` | `/arac json {"a":1,}` → hatanın satır ve sütunu |
| `sha256` | `/arac sha256 merhaba` |
| `parola` | `/arac parola 24` |
| `url` | `/arac url merhaba dünya` |
| `cron` | `/arac cron 30 9 * * 1-5` → *"saat 09:30, Pazartesi-Cuma günleri arası"* + sonraki 3 çalışma |
| `slug` | `/arac slug Çağrı Günlüğü` → `cagri-gunlugu` |
| `hex` | `/arac hex 0xff` → onluk, ikilik, sekizlik |

```bash
curl 'http://localhost:5678/webhook/arac?islem=uuid'
curl -X POST http://localhost:5678/webhook/arac \
  -H 'Content-Type: application/json' -d '{"islem":"cron","veri":"0 */4 * * *"}'
```

> `jwt` **imzayı doğrulamaz** (anahtar gerekir, burada bilerek yok) — içeriği
> okunur hâle getirir. `parola` mümkünse `crypto.getRandomValues` kullanır,
> kullanamazsa çıktının altında bunu açıkça söyler.

### 13.5 Webhook yakalayıcı (workflow 21)

Kendi "request bin"iniz: bir servisin gerçekte **ne gönderdiğini** görün.

```bash
# Test edeceğiniz uygulamaya bu adresi verin
http://localhost:5678/webhook/yakala

curl -X POST 'http://localhost:5678/webhook/yakala?etiket=stripe' \
  -H 'X-Imza: abc' -d '{"olay":"odeme.basarili"}'

curl 'http://localhost:5678/webhook/istekler?adet=5'   # son 5 istek
curl 'http://localhost:5678/webhook/istekler?id=3'     # tek isteğin tamamı
```

- `?etiket=stripe` → isteği adlandırır, sonra süzebilirsiniz.
- `?kod=500` → yanıt kodunu seçer (gönderen tarafın hata yolunu denemek için).
- Son **50** istek tutulur; gövde 4 000 karakterde kırpılır.
- **Gizli başlıklar maskelenir**: `Authorization`, `Cookie`, `X-Api-Key` ve
  içinde `token`/`secret`/`imza` geçen başlıklar ilk 6 karakter dışında
  saklanır — telefona düşen ayrıntıda gerçek anahtarınız görünmez.

Telegram'dan: `/istekler` · `/istek 3` · `/istektemizle`

### 13.6 Telegram bağlantısı (tek seferlik ayar)

`/servis`, `/pr`, `/kod`, `/arac` ve `/istekler` komutlarının çalışması için
workflow 05'teki beş **… Workflow'una İlet** düğümünü açıp **Workflow**
listesinden hedefini seçin:

| Düğüm | Hedef |
|---|---|
| *Servis Workflow'una İlet* | 17 — Servis Nöbetçisi |
| *GitHub Workflow'una İlet* | 18 — GitHub Nöbetçisi |
| *Kod Workflow'una İlet* | 19 — Kod Parçacığı Kasası |
| *Araç Workflow'una İlet* | 20 — Geliştirici Araç Kutusu |
| *İstek Workflow'una İlet* | 21 — Webhook Yakalayıcı |

Seçmediğiniz düğümün komutu çalışmaz; bot geri kalan her şeye cevap vermeye
devam eder. Yalnızca kullanacağınız workflow'lar için yapmanız yeterli —
hedef workflow'ların da **Active** olması gerekir.

## 14. Kişisel takip paketi (workflow 22–26)

Tekrarlanan, zamana yayılan işler için beş workflow. Hepsi yereldir,
credential gerektirmez; Telegram kuruluysa bildirim oraya, değilse mail
olarak gider. Tasarım ayrıntıları: [`YENI-OZELLIKLER.md`](YENI-OZELLIKLER.md).

| # | Workflow | Ne verir | Telegram |
|---|---|---|---|
| 22 | Alışkanlık takibi | 🔥 Seri, son 7 gün, akşam hatırlatması | `/aliskanlik` · `/yaptim 2` |
| 23 | Bütçe nöbetçisi | Limit, kalan, günlük harcanabilir, %80/%100 uyarısı | `/butce` · `/butce limit 20000` |
<!-- paket-tablosu -->

Telegram komutları için workflow 05'teki ilgili **… Workflow'una İlet**
düğümünde hedefi bir kez seçin (§13.6'daki ayarın aynısı).

### 14.1 Alışkanlık takibi (workflow 22)

Görev listesinden farkı: alışkanlık tamamlanınca kaybolmaz, **her gün** için
ayrı işaret tutulur ve kaç gündür aralıksız yaptığınız sayılır.

```
/aliskanlik ekle Su iç (2 L)
/aliskanlik ekle 10 dk kitap
/yaptim 1            → bugün işaretle
/yaptim kitap        → adın bir parçası da olur
/yaptim 2 dün        → dün unuttuysanız
/aliskanlik          → liste
/aliskanlik geri 1 · /aliskanlik sil 1
```

`/aliskanlik` çıktısı:

```
🔥 Alışkanlıklar — bugün 1/2
✅ #1 Su iç (2 L)  ●●●○●●●  🔥3
⬜ #2 10 dk kitap  ●●●●●●○  🔥6
```

- **Seri kuralı:** bugün işaretliyse bugünden, değilse **dünden** geriye
  kesintisiz gün sayısı — akşam henüz yapmadığınız alışkanlığın serisi gün
  bitene kadar bozulmuş görünmez.
- **Her akşam 21:00** yapılmayanları tek mesajda hatırlatır
  (*"🔥 6 günlük seri bozulmasın"*). Hepsi tamamsa **sessiz** kalır; aynı gün
  ikinci kez yazmaz.
- Veriler `local-files/aliskanliklar.json` dosyasında; alışkanlık başına son
  400 gün tutulur.

```bash
curl -X POST http://localhost:5678/webhook/aliskanlik \
  -H 'Content-Type: application/json' -d '{"metin":"yaptim 1"}'
curl -X POST http://localhost:5678/webhook/aliskanlik -H 'Content-Type: application/json' -d '{}'   # liste (JSON)
```

### 14.2 Bütçe nöbetçisi (workflow 23)

Harcama kaydı (07, `/harcama`) zaten var; eksik olan **sınırdı**. Bu workflow
`harcamalar.json`'u yalnızca okur ve bu ayı limitlerinizle karşılaştırır.

```
/butce limit 20000              → aylık genel limit
/butce limit Market 6000        → kategori limiti (yoksa oluşturur)
/butce anahtar Market migros,a101
/butce sil Market
/butce                          → durum
```

`/butce` çıktısı:

```
🎯 Bütçe — Eylül 2026 (23/30. gün, 41 kayıt)
Genel ▓▓▓▓▓▓░░░░ %64
  12.720 TL / 20.000 TL · kalan 7.280 TL · günde 910 TL

Kategoriler:
• Market ▓▓▓▓▓▓▓▓░░ %81 — 4.860 TL / 6.000 TL
• Ulaşım: 320 TL (limitsiz)
• Diğer: 7.540 TL

Ay sonu tahmini: 16.591 TL
```

- **Kategori eşleşmesi:** harcamanın açıklamasında (`konu`) ya da
  gönderende (`kimden`) kategorinin adı veya anahtar kelimelerinden biri
  geçiyorsa o kategoriye sayılır; ilk eşleşen kazanır. Örnek dosyada Market,
  Yeme-içme, Ulaşım ve Fatura için hazır kelimeler var.
- **Her akşam 20:00** genel ve kategori limitleri için %80 ve %100
  eşiklerini kontrol eder. Her eşik **ayda bir kez** bildirilir; ay değişince
  sıfırlanır.
- "Günde X TL" = kalan tutar ÷ bugün dahil ayın kalan günleri.
- Yalnızca TL harcamalar sayılır.

```bash
curl http://localhost:5678/webhook/butce          # durum (JSON)
curl -X POST http://localhost:5678/webhook/butce \
  -H 'Content-Type: application/json' -d '{"metin":"limit 20000"}'
```

<!-- paket-bolumleri -->

## 15. iPhone, Mac ve Windows'tan kullanmak

Panel `127.0.0.1`'e bağlıdır, yani telefon paneli göremez. Buna rağmen her şeyi
telefondan kullanabilirsiniz: **Telegram botu dışarıya hiçbir kapı açmadan
çalışır** (bot, Telegram'ı yoklar; içeriye bağlantı gelmez).

### 15.1 iPhone — Telegram (önerilen, ek ayar yok)

| Komut | Ne yapar |
|---|---|
| `/servis` | İzlenen servisler ayakta mı |
| `/pr` | GitHub: inceleme bekleyen, CI kırık, atanmış |
| `/kod docker` · `/kodgetir 3` | Kasada arama · kod bloğunu getirme |
| `/kodkaydet Başlık` ⏎ kod | Kasaya ekleme |
| `/arac uuid` · `/arac jwt …` | Araç kutusu |
| `/istekler` · `/istek 3` | Yakalanan webhook istekleri |
| `/aliskanlik` · `/yaptim 2` | Alışkanlık serileri · bugünü işaretleme |
| `/butce` · `/butce limit 20000` | Bütçe durumu · limit koyma |
| `/yardim` | Tüm komutlar |

Uyarılar (servis düştü, PR bekliyor) siz bir şey yapmadan gelir.
Telegram'ı kurmadıysanız aynı uyarılar SMTP ile mail olarak gider.

### 15.2 Mac ve Windows — terminal

Bilgisayarınızın kendisinde panel açık olduğu için uçları doğrudan çağırın.
Kullandığınız kabuğa birkaç kısayol tanımlamak işi iyice kısaltır:

```bash
# ~/.zshrc  ya da  ~/.bashrc   (Mac / Linux / WSL)
kod()  { curl -s "http://localhost:5678/webhook/kodlar?ara=$1" | jq -r '.[] | "#\(.id) \(.baslik)"'; }
kodal(){ curl -s "http://localhost:5678/webhook/kodlar?id=$1&sade=1" | pbcopy; echo "panoya kopyalandı"; }
arac() { curl -s "http://localhost:5678/webhook/arac?islem=$1&veri=$2" | jq -r .sonuc; }
```

```powershell
# Windows PowerShell profili:  notepad $PROFILE
function kod  { param($q) (Invoke-RestMethod "http://localhost:5678/webhook/kodlar?ara=$q") |
                          ForEach-Object { "#$($_.id) $($_.baslik)" } }
function kodal { param($id) (Invoke-RestMethod "http://localhost:5678/webhook/kodlar?id=$id&sade=1") | Set-Clipboard }
function arac { param($i,$v) (Invoke-RestMethod "http://localhost:5678/webhook/arac?islem=$i&veri=$v").sonuc }
```

Tarayıcı da yeter: `localhost:5678/webhook/arac?islem=zaman&veri=1735689600`
adresini yer imi yapabilirsiniz.

### 15.3 iPhone — Kısayollar (aynı Wi-Fi'da, isteğe bağlı)

Telegram yerine doğrudan HTTP çağırmak isterseniz önce paneli ev ağınıza
açmanız gerekir (§6'daki adımlar: compose'ta `"5678:5678"` +
`N8N_SECURE_COOKIE=false`). Sonra:

1. **Kısayollar** → yeni kısayol → *URL İçeriğini Al*
2. URL: `http://192.168.1.20:5678/webhook/kod` (kendi yerel IP'niz)
3. Yöntem `POST`, İstek Gövdesi `JSON`, alanlar: `baslik`, `kod`
   → `baslik` için *Her Seferinde Sor*
4. Ana ekrana ekleyin; **Paylaş sayfasında göster** seçeneğini açarsanız
   Safari'de seçtiğiniz metni tek dokunuşla kasaya atabilirsiniz.

> 🔒 Bu adımdan sonra panel ev ağınızdaki herkese açıktır. Ev ağı dışında
> kullanmayın; dilerseniz Webhook düğümlerine *Authentication → Header Auth*
> ekleyip aynı başlığı kısayola da koyun.

### 15.4 Hangisi nerede çalışır?

| | iPhone | Mac | Windows |
|---|:---:|:---:|:---:|
| Telegram komutları | ✅ | ✅ | ✅ |
| Uyarı/bildirim almak | ✅ | ✅ | ✅ |
| `curl` / PowerShell uçları | ⚠️ LAN gerekir (§15.3) | ✅ | ✅ |
| n8n paneli | ⚠️ LAN gerekir | ✅ | ✅ |

## 16. Verileriniz nerede? Yedekleme

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

> **`local-files/*.json` dosyaları hakkında iki not.** Görev listesini hem
> webhook (03) hem Telegram botu (05) yazdığı için compose'ta
> `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` ayarlıdır: çalıştırmalar sıraya girer,
> böylece iki güncelleme birbirinin üzerine yazmaz. Yazma sırasında bilgisayar
> kapanırsa dosya yine de yarım kalabilir; bu durumda workflow'lar hata verip
> **durur** (boş liste yazmaz), siz de dosyayı düzeltir veya yedekten
> dönersiniz. Bu yüzden `local-files/` klasörünü yedeğe dâhil edin.

## 17. Başka uygulamalar bağlamak

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

## 18. Sorun giderme

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
| `sonHata` alanında `403` / `Forbidden` | Site otomatik istekleri engelliyor. Bu siteler bu yöntemle takip edilemez; listeden çıkarın. |
| Telegram `409 Conflict` hatası | Aynı bot token'ında bir webhook kurulu (başka bir uygulama/örnek kullanıyor). `curl https://api.telegram.org/bot<TOKEN>/deleteWebhook` ile silin — bir token'ı yalnızca tek kurulum kullanabilir. |
| `EACCES: permission denied` (dosya yazılamıyor) | Yalnızca Linux'ta olur: konteyner `uid 1000` ile çalışır, klasör başka bir kullanıcıya ait. Çözüm: `sudo chown -R 1000:1000 local-files`. Mac/Windows'ta bu sorun çıkmaz. |
| `... okunamadı; veri kaybını önlemek için durduruldu` | JSON dosyası bozulmuş (ör. yazma sırasında bilgisayar kapanmış). Workflow **bilerek** durur: aksi hâlde listeyi boş sanıp üzerine yazardı. Dosyayı bir metin düzenleyicide açıp düzeltin, ya da yedeğinizden / `.ornek.json`'dan geri kopyalayın. |
| Brifingde hava durumu yok | `.env` içindeki `HAVA_ENLEM`/`HAVA_BOYLAM` sayı mı (ör. `41.01`)? Değiştirdiyseniz `docker compose up -d` yaptınız mı? İnternete erişilemiyorsa brifing hava satırı olmadan gider. |
| Brifingde kur satırı yok | TCMB hafta sonu ve resmî tatillerde yayın yapmaz. Ertesi iş günü kendiliğinden düzelir. |
| Hata nöbetçisi hiç uyarı göndermiyor | Workflow 11'i **Active** yapmak yetmez: uyarı almak istediğiniz **her** workflow'da **⋮ → Settings → Error Workflow** alanından 11'i seçmelisiniz (§9.2). |
| `/ai` veya `/oku` yazınca bot sessiz kalıyor | Workflow 05'teki *AI/Link Workflow'una İlet* düğümlerinde hedef workflow seçilmemiş (§12.3). Ayrıca 12 ve 13 numaralı workflow'lar **Active** olmalı. |
| `/ai` cevabı "Ollama çalışmıyor gibi" diyor | AI profilini başlatın: `docker compose --profile ai up -d`; ilk kullanımda `docker exec -it ollama ollama pull qwen2.5:3b`. |
| RSS özeti hiç gelmiyor | İlk çalıştırma bilerek sessizdir (mevcut haberler işaretlenir). İkinci turdan sonra da gelmiyorsa `rss-kaynaklar.json` içindeki adresleri tarayıcıda açıp gerçekten RSS/Atom olduklarını doğrulayın. |
| Sayfa takibi sürekli "değişti" diyor | Seçici çok geniş (muhtemelen `body`) ve sayfada her yüklemede değişen bir parça var. Daha dar bir CSS seçici verin (§10.3). |
| Yedekleme `.json dosyası bulunamadı` diyor | `local-files/` klasöründe hiç veri dosyası yok — §3'teki `cp ... .ornek.json` adımlarını tamamlayın. |
| Yedekte `workflows.json` yok | `.env` içinde `N8N_API_KEY` boş (isteğe bağlıdır) ya da anahtar geçersiz — §10.2. |
| Servis nöbetçisi hiç uyarmıyor | Uyarı **durum değişince** gider. Ayrıca `esik` kadar (varsayılan 2) üst üste başarısız yoklama gerekir — yani ~10 dk. Hemen denemek için `esik` değerini `1` yapın ve **Elle Test Et** ile çalıştırın. |
| Servis "kapalı" diyor ama tarayıcıda açılıyor | Site otomatik isteklere farklı davranıyor olabilir (403/429) ya da `beklenenKod` yanlış. `servisler.json` içindeki `sonHata` alanına bakın; gerekirse `beklenenKod` değerini gerçek yanıtla eşitleyin. |
| `/pr` "henüz tarama yapılmadı" diyor | Workflow 18 **Active** değil ya da `.env` içindeki `GITHUB_TOKEN` boş. Token yazdıktan sonra `docker compose up -d` gerekir. |
| GitHub nöbetçisi "GITHUB_TOKEN geçersiz" diyor | Token'ın süresi dolmuş ya da yetkisi yetmiyor. Özel depoları izliyorsanız classic token'da `repo` yetkisi gerekir. |
| GitHub ilk turda hiçbir şey göndermedi | İlk tarama bilerek sessizdir (mevcut kayıtlar işaretlenir). İkinci turdan sonra yalnızca yenileri gelir — §13.2. |
| `/kod`, `/arac`, `/servis` komutuna bot sessiz | Workflow 05'teki *… Workflow'una İlet* düğümünde hedef seçilmemiş (§13.6) ya da hedef workflow **Active** değil. |
| `/webhook/yakala` 404 dönüyor | Workflow 21 **Active** değil. Test modunda `webhook-test/yakala` adresi kullanılır (§5). |
| Yakalanan istekte `Authorization` görünmüyor | Bilerek: gizli başlıklar ilk 6 karakter dışında maskelenir (§13.5). Gerçek değeri görmek için `local-files/yakalanan-istekler.json` yerine isteği gönderen tarafa bakın. |
| `/yaptim` "bulunamadı" diyor | Numara yerine adın bir parçasını da yazabilirsiniz (`/yaptim kitap`); numaraları `/aliskanlik` gösterir. Aynı kelime birden çok alışkanlıkta geçiyorsa ilk eşleşen seçilir — numara kullanın. |
| Bütçede harcama "Diğer"e düşüyor | Kategorinin anahtar kelimesi harcamanın açıklamasında geçmiyor. `/butce anahtar Market <kelime>` ile ekleyin (§14.2). |

## 19. Güncelleme

`docker-compose.yml` içinde n8n sürümü **sabittir** (`n8n:2.35.3`) — böylece
büyük sürüm atlamaları kurulumunuzu bir sabah habersiz bozamaz. Güncellemek
için sürüm numarasını elle yükseltin:

```bash
# 1) docker-compose.yml → image: docker.n8n.io/n8nio/n8n:<yeni-sürüm>
# 2) sonra:
docker compose pull
docker compose up -d
```

Yeni sürümler ve varsa geriye dönük uyumsuzluklar:
<https://github.com/n8n-io/n8n/releases>

Workflow'larınız ve credential'larınız volume'da olduğu için güncellemeden
etkilenmez. Yine de büyük sürüm (ör. 2.x → 3.x) geçişinden önce §16'daki
yedeklemeyi yapın.
