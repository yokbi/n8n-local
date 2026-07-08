# 🏠 Yerel n8n Otomasyon Kurulumu

Kendi bilgisayarınızda çalışan, **verileri dışarı göndermeyen** kişisel otomasyon
merkezi: günlük e-posta özeti, önemli mail uyarıları, telefonunuzdan bile
kullanabileceğiniz yerel bir görev listesi ve isterseniz tamamen yerel AI (Ollama).

> Bu repo tek başına çalışır: klonlayın, `.env` oluşturun, `docker compose up -d` deyin.

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
7. [Opsiyonel: Yerel AI (Ollama)](#7-opsiyonel-yerel-ai-ollama)
8. [Verileriniz nerede? Yedekleme](#8-verileriniz-nerede-yedekleme)
9. [Başka uygulamalar bağlamak](#9-başka-uygulamalar-bağlamak)
10. [Sorun giderme](#10-sorun-giderme)
11. [Güncelleme](#11-güncelleme)

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
│  └──────┬──────────────────┬────────────┘                            │
│         │                  │                                         │
│   n8n_data volume    local-files/gorevler.json                       │
│   (DB + şifreli      (görevleriniz, düz JSON)                        │
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

# 2) Görev listesinin başlangıç dosyasını oluşturun
cp local-files/gorevler.ornek.json local-files/gorevler.json

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
2. `workflows/` klasöründeki 4 dosyayı sırayla içe aktarın.
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

## 7. Opsiyonel: Yerel AI (Ollama)

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

## 8. Verileriniz nerede? Yedekleme

| Veri | Yer |
|---|---|
| Workflow'lar, çalıştırma geçmişi, hesap | Docker volume `n8n_data` içindeki SQLite DB |
| Mail şifreleri / OAuth token'ları | Aynı DB'de, `N8N_ENCRYPTION_KEY` ile **şifreli** |
| Görev listesi | `local-files/gorevler.json` (düz dosya, sizde) |
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

## 9. Başka uygulamalar bağlamak

n8n'de yüzlerce hazır node var — Telegram, Google Takvim, Notion, Todoist,
Slack, WhatsApp, RSS… Panelde **+** deyip aramanız yeterli. İki yol:

- **Hazır node'lar**: örn. günlük özeti mail yerine Telegram'dan almak için
  02'deki son düğümü Telegram node'u ile değiştirin (BotFather'dan bot açıp
  token'ı credential olarak girersiniz).
- **Webhook'lar**: workflow 03'teki gibi kendi HTTP uçlarınızı açın; HTTP
  isteği atabilen her uygulama (kısayollar, betikler, diğer programlar)
  n8n'inizi tetikleyebilir.

Hangi servisi bağlarsanız bağlayın, kimlik bilgileri yine yalnızca sizin
makinenizde (şifreli) durur.

## 10. Sorun giderme

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

## 11. Güncelleme

```bash
docker compose pull
docker compose up -d
```

Workflow'larınız ve credential'larınız volume'da olduğu için güncellemeden etkilenmez.
