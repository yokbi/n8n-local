# Çalıştırma Rehberi (Windows & Mac)

Bu rehber, projeyi indirdikten sonra **çift tıklama / tek komutla** nasıl
çalıştıracağınızı anlatır. Ayrıntılı özellik dokümantasyonu için `README.md`
dosyasına bakın — burada yalnızca kurulum ve çalıştırma adımları var.

## İçindekiler

1. [Gereksinim: Docker Desktop](#1-gereksinim-docker-desktop)
2. [Windows'ta çalıştırma](#2-windowsta-çalıştırma)
3. [Intel Mac'te çalıştırma](#3-intel-macte-çalıştırma)
4. [n8n'i tarayıcıda açma](#4-n8ni-tarayıcıda-açma)
5. [Doldurmanız gereken ortam değişkenleri (.env)](#5-doldurmanız-gereken-ortam-değişkenleri-env)
6. [Durdurma](#6-durdurma)
7. [Sorun giderme](#7-sorun-giderme)

---

## 1. Gereksinim: Docker Desktop

Bu proje Docker Compose ile çalışır; n8n'i doğrudan kurmanıza gerek yoktur,
her şey Docker container'ı içinde izole çalışır.

- **Windows:** [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  indirin ve kurun. Kurulum sihirbazı WSL 2 gerektiğini söylerse önerdiği
  adımları uygulayın. Kurulumdan sonra **Docker Desktop'ı bir kez açın** ve
  sol alttaki simgenin "Docker Desktop is running" diyene kadar bekleyin.
- **Mac (Intel):** [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
  sayfasından **Intel Chip** sürümünü indirin (Apple Silicon değil), kurun,
  bir kez açın ve menü çubuğundaki balina simgesinin çalışır duruma
  gelmesini bekleyin.

Docker Desktop açık ve çalışır durumda değilse aşağıdaki betikler size net
bir hata mesajı ve indirme bağlantısı gösterip duracaktır.

## 2. Windows'ta çalıştırma

1. Bu repoyu indirin (yeşil **Code → Download ZIP** veya `git clone`) ve
   klasörü bir yere çıkarın.
2. Klasörün içine girip **`run-windows.bat`** dosyasına **çift tıklayın**
   (veya bir komut satırından `run-windows.bat` yazıp çalıştırın).
3. Betik sırasıyla:
   - Docker'ın kurulu ve çalışır olduğunu kontrol eder,
   - `.env` dosyanız yoksa `.env.example`'dan oluşturur,
   - `local-files/` altındaki örnek veri dosyalarını (görev, fiyat takibi,
     harcama, not) kopyalar,
   - `docker compose up -d` ile n8n'i arka planda başlatır,
   - açılacak adresi ekrana yazar.

Yerel AI (Ollama) ile birlikte başlatmak isterseniz:

```bat
run-windows.bat --ai
```

## 3. Intel Mac'te çalıştırma

1. Bu repoyu indirin (`git clone https://github.com/yokbi/n8n-local.git` ya
   da ZIP olarak indirip çıkarın) ve klasöre girin.
2. Terminal açıp betiği çalıştırılabilir yapın ve çalıştırın:

   ```bash
   cd n8n-local
   chmod +x run-mac.sh
   ./run-mac.sh
   ```

3. Betik Windows'takiyle aynı adımları uygular: Docker kontrolü → `.env`
   oluşturma (ve mümkünse şifreleme anahtarını otomatik üretme) → örnek veri
   dosyalarını kopyalama → `docker compose up -d` → açılacak adresi yazdırma.

Yerel AI (Ollama) ile birlikte başlatmak isterseniz:

```bash
./run-mac.sh --ai
docker exec -it ollama ollama pull qwen2.5:3b   # tek seferlik, ~2 GB indirir
```

> **Not:** Betikler *Intel* Mac (x86_64) için yazılmıştır. Apple Silicon
> (M1/M2/M3/M4) bir Mac'te de Docker Desktop bunu Rosetta üzerinden sorunsuz
> çalıştırır; ekstra bir şey yapmanız gerekmez.

## 4. n8n'i tarayıcıda açma

Betik "n8n çalışıyor" dedikten sonra tarayıcınızda şu adresi açın:

```
http://localhost:5678
```

İlk açılışta bir **sahip hesabı** (e-posta + şifre) oluşturmanız istenir —
bu hesap yalnızca sizin bilgisayarınızda saklanır, hiçbir sunucuya
gönderilmez. Ardından `README.md` §5'teki adımlarla `workflows/` klasöründeki
otomasyonları içe aktarabilirsiniz.

## 5. Doldurmanız gereken ortam değişkenleri (.env)

Betikler `.env` dosyasını otomatik oluşturur, ama içindeki bazı alanları elle
doldurmanız/gözden geçirmeniz gerekir:

| Değişken | Zorunlu mu? | Açıklama |
|---|---|---|
| `N8N_ENCRYPTION_KEY` | **Evet** | Mail şifreleri gibi credential'ları diskte şifreler. Mac betiği bunu `openssl` varsa otomatik üretir; Windows'ta veya `openssl` yoksa elle doldurun (rehber `.env.example` içinde). **Bu anahtarı kaybetmeyin** — kaybederseniz kayıtlı credential'lar açılamaz. |
| `GENERIC_TIMEZONE` | Hayır (varsayılan `Europe/Istanbul`) | Zamanlanmış workflow'ların çalışacağı saat dilimi. |
| `TELEGRAM_BOT_TOKEN` | Hayır | Yalnızca Telegram botu (workflow 05) kullanacaksanız gerekir. `@BotFather`'dan alınır. |
| `TELEGRAM_CHAT_ID` | Hayır | Telegram botunu etkinleştirdikten sonra `/start` yazınca bot size söyler. |

Bir değeri değiştirdikten sonra n8n'in bunu okuması için betiği (veya
`docker compose up -d`) tekrar çalıştırmanız gerekir.

Windows'ta PowerShell ile rastgele bir `N8N_ENCRYPTION_KEY` üretmek için:

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

Mac/Linux'te:

```bash
openssl rand -hex 32
```

## 6. Durdurma

n8n'i durdurmak (verileriniz Docker volume'unda korunur, silinmez):

```bash
# Mac
./run-mac.sh --stop
# veya doğrudan:
docker compose down
```

```bat
:: Windows
run-windows.bat --stop
:: veya doğrudan:
docker compose down
```

Tekrar başlatmak için betiği yeniden çalıştırmanız yeterli — `.env` ve örnek
veri dosyaları zaten var olduğu için betik onlara dokunmaz, sadece
`docker compose up -d` çalıştırır.

## 7. Sorun giderme

| Belirti | Çözüm |
|---|---|
| Betik "Docker bulunamadı" diyor | Docker Desktop'ı kurup açtığınızdan emin olun, sonra betiği tekrar çalıştırın. |
| Betik "Docker kurulu ama çalışmıyor" diyor | Docker Desktop uygulamasını açın, balina/simge "running" durumuna gelene kadar bekleyin. |
| `localhost:5678` tarayıcıda açılmıyor | `docker compose ps` ve `docker compose logs n8n` ile container'ın ayakta olduğunu kontrol edin. |
| "port is already allocated" hatası | 5678 portu başka bir uygulama tarafından kullanılıyordur; `docker-compose.yml` içinde `"127.0.0.1:5679:5678"` yapıp `localhost:5679` adresini kullanabilirsiniz. |
| Mac'te `chmod +x` sonrası "Permission denied" | Betiği doğrudan `bash run-mac.sh` ile çalıştırmayı deneyin. |
| Windows'ta betik pencereyi hemen kapatıyor | Çift tıklamak yerine bir komut satırı (cmd) açıp içinden `run-windows.bat` yazarak çalıştırın; hata mesajını görürsünüz. |

Daha fazla sorun giderme maddesi (IMAP/SMTP, Gmail OAuth, Telegram botu vb.)
için `README.md` §12'ye bakın.
