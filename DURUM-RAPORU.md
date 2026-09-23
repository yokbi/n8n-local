# Durum Raporu — n8n-local

**Denetim tarihi:** 2026-09-07 · **Güncelleme:** 2026-09-23 · **Depo:** https://github.com/yokbi/n8n-local
**Varsayılan dal:** `main`

---

## 1. Özet

| | |
|---|---|
| Proje | Kendi bilgisayarınızda çalışan, veriyi dışarı göndermeyen kişisel otomasyon merkezi |
| Teknoloji | **n8n** (Docker) + SQLite · isteğe bağlı **Ollama** (yerel AI) |
| Kurulum | `docker compose up -d` → http://localhost:5678 |
| Workflow | **26 adet** hazır, `workflows/` altında JSON olarak (17–21: geliştirici paketi, 22–26: kişisel takip paketi) |
| Doküman | `README.md` (19 bölüm) + `RUNNING.md` (adım adım) + `YENI-OZELLIKLER.md` (22–26 tasarımı) |
| Çalıştırma betiği | Üç platform için **zaten mevcut** ✅ |
| Olgunluk | **Yüksek.** Bu, denetlenen depolar arasında dokümantasyonu en iyi olanlardan biri. |

**Depoda derlenen bir uygulama yok** — n8n workflow'ları JSON olarak ve Docker
yapılandırması olarak duruyor. Ancak workflow'ların içindeki Code düğümlerinin
JavaScript'i artık `node testler/kod-testleri.js` ile n8n başlatmadan
denenebiliyor (195 test). Uçtan uca deneme için yine *çalıştırmak* gerekiyor.

---

## 2. Hazır workflow'lar

| # | Dosya | Ne yapar |
|---|---|---|
| 01 | `01-anlik-onemli-mail-bildirimi.json` | Önemli mailler için anlık bildirim |
| 02 | `02-gunluk-mail-ozeti.json` | Günlük e-posta özeti |
| 03 | `03-gorev-takibi.json` | Webhook ile görev listesi (ekle/tamamla/sil) |
| 04 | `04-yerel-ai-ozet-ollama.json` | Yerel AI ile özetleme (Ollama) |
| 05 | `05-telegram-botu.json` | Telegram'dan görev yönetimi + sabah özeti |
| 06 | `06-fiyat-takibi.json` | Ürün fiyat takibi |
| 07 | `07-fatura-harcama-cikarma.json` | Fatura/harcama kaydı |
| 08 | `08-gunluk-takvim-ozeti.json` | Günlük takvim özeti |
| 09 | `09-not-hatirlatma.json` | Not ve hatırlatma |
| 10 | `10-gunaydin-brifingi.json` | Günaydın brifingi: hava, kur, görev, hatırlatma, harcama |
| 11 | `11-hata-nobetcisi.json` | Bozulan workflow'u anında haber verir |
| 12 | `12-yerel-ai-sohbet.json` | Ollama ile sohbet (webhook + Telegram `/ai`) |
| 13 | `13-link-ozetleyici.json` | Bağlantıyı özetleyip okuma listesine ekler (`/oku`) |
| 14 | `14-rss-haber-ozeti.json` | RSS/Atom beslemelerinden yalnızca yeni haberler |
| 15 | `15-otomatik-yedekleme.json` | `local-files/` klasörünün gecelik tarihli yedeği |
| 16 | `16-sayfa-degisiklik-takibi.json` | Sayfa içeriği değişince uyarı |
| 17 | `17-servis-nobetcisi.json` | Servis/uptime nöbetçisi; düşünce ve düzelince haber (`/servis`) |
| 18 | `18-github-nobetcisi.json` | İnceleme bekleyen PR, kırık CI, atanmış issue (`/pr`) |
| 19 | `19-kod-parcacik-kasasi.json` | Kod parçacığı kasası: kaydet/ara/getir (`/kod`) |
| 20 | `20-gelistirici-arac-kutusu.json` | uuid · base64 · JWT · cron · JSON · SHA-256 (`/arac`) |
| 21 | `21-webhook-yakalayici.json` | Gelen HTTP isteğini kaydeder ve gösterir (`/istekler`) |
| 22 | `22-aliskanlik-takibi.json` | Alışkanlık serileri, akşam hatırlatması (`/aliskanlik`, `/yaptim`) |
| 23 | `23-butce-nobetcisi.json` | Aylık/kategori limiti, %80–%100 uyarısı (`/butce`) |
| 24 | `24-abonelik-takibi.json` | Düzenli ödemeleri önceden hatırlatır, aylık yük (`/abonelik`) |
| 25 | `25-onemli-tarihler.json` | Doğum günü / yıl dönümü, 7 ve 1 gün önceden (`/tarihler`) |
| 26 | `26-haftalik-rapor.json` | Pazar 20:00 haftalık özet (`/hafta`) |

**2026-09-18 — geliştirici paketi eklendi (17–21).** Beşi de iPhone (Telegram),
Mac ve Windows'tan (curl/PowerShell/tarayıcı) kullanılabilir; workflow 05'e
`/servis`, `/pr`, `/kod`, `/arac`, `/istekler` komutları ve beş yeni
*… Workflow'una İlet* düğümü eklendi (hedefleri panelden bir kez seçilmeli —
README §13.6). Çalıştırma betikleri artık `local-files/*.ornek.json`
dosyalarının **tamamını** kopyalıyor (liste elle güncellenmiyor).

**2026-09-23 — kişisel takip paketi eklendi (22–26).** Alışkanlık, bütçe,
abonelik, önemli tarihler ve haftalık rapor; tasarım belgesi
[`YENI-OZELLIKLER.md`](YENI-OZELLIKLER.md), kullanım README §14. Aynı turda
17, 18, 19 ve 21'deki on dosya-okuma düğümünün bozuk olduğu (yol yerine
sayı dizisi) bulundu ve düzeltildi; testlere bunu yakalayan bir **yapı
kontrolü** eklendi. Bu dört workflow'u **yeniden içe aktarın**.

---

## 3. ✅ ÇÖZÜLDÜ — dayanıklılık düzeltmeleri birleştirildi

Bu raporun ilk hâlinde `claude/bu-repo-nedr-fy2s7i` dalı birleştirilmemiş
duruyordu ve gerçek veri kaybı senaryolarını kapatıyordu. **2026-09-12'de
birleştirildi:**

| Düzeltme | Durum |
|---|---|
| n8n sürümü sabitlendi (`latest` → `2.35.3`) | ✅ `docker-compose.yml` |
| Yazma çakışması koruması (`N8N_CONCURRENCY_PRODUCTION_LIMIT=1`) | ✅ `docker-compose.yml` |
| Bozuk JSON koruması (03, 05, 06, 07) | ✅ birleştirildi |
| Aynı koruma workflow 09'a da eklendi | ✅ dal sonrası yazıldığı için eksikti |
| Sorun giderme tablosuna 4 satır | ✅ README |

Birleştirme sırasında workflow 05'te çakışma çıktı: `main`'deki genişletilmiş
bot komutları (harcama, not, hatırlatma, fiyat) ile daldaki bozuk-dosya
koruması aynı Code düğümünü değiştiriyordu. **İkisi de korundu** — koruma,
botun okuduğu beş dosyanın hepsini kapsayacak şekilde yeni kodun üstüne
yazıldı.

> **Birleştirmeden sonra workflow'ları n8n'e yeniden içe aktarın** — JSON
> dosyaları değiştiği için paneldeki eski kopyalar kendiliğinden güncellenmez.

## 4. Doküman doğruluk kontrolü

`README.md` ve `RUNNING.md` iyi yazılmış. Kontrol edilenler:

| İddia | Kontrol | Sonuç |
|---|---|:---:|
| "Klonlayın, `.env` oluşturun, `docker compose up -d`" | `.env.example` + `docker-compose.yml` mevcut | ✅ |
| Üç platform için çalıştırma betiği | `run-mac-intel.sh`, `run-mac-apple-silicon.sh`, `run-windows.bat` — üçü de var | ✅ |
| "Panel yalnızca `127.0.0.1`'e bağlı" | `ports: - "127.0.0.1:5678:5678"` | ✅ |
| "Telemetri kapalı" | `N8N_DIAGNOSTICS_ENABLED=false` + 4 ayar daha | ✅ |
| 26 workflow | `workflows/` altında 26 JSON | ✅ |
| `docker-compose.yml` geçerli | YAML olarak ayrıştırıldı | ✅ |
| Şifreleme anahtarı `.env`'den | `N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}` | ✅ |

**Dokümanlar doğrudur.** İlk denetimde bulunan tek tutarsızlık (README'nin
`latest` imajını varsayması) §3'teki birleştirmeyle giderildi.

---

## 5. Dal envanteri

| Dal | `main`'in önünde | Fark | İçerik |
|---|---:|---:|---|
| `main` | — | — | Ana sürüm |
| `claude/bu-repo-nedr-fy2s7i` | 0 | 0 | Birleştirildi (2026-09-12) |
| `claude/new-features-suggestions-07uiwu` | — | — | Yeni workflow'lar 10–16 + dayanıklılık birleştirmesi |
| `claude/kalan-kod-isleri-9b8tt5` | 0 | 0 | Birleştirilmiş |
| `claude/multi-platform-setup-scripts-8qef52` | 0 | 0 | Birleştirilmiş (PR #3) |
| `claude/repo-audit-docs-e1dail` | — | — | Bu doküman turu |

---

## 6. Bu ortamda ne doğrulandı, ne doğrulanmadı

### ✅ Yapılanlar
- `docker-compose.yml` YAML olarak ayrıştırıldı — **geçerli**
- 26 workflow JSON dosyasının tamamı ayrıştırıldı; düğüm adları tekil,
  bağlantı hedefleri var, konumlar ve dosya yolları geçerli (otomatik yapı testi)
- Tüm Code düğümlerinin JavaScript'i sözdizimi denetiminden geçti
- 195 mantık testi çalıştırıldı ve geçti (`node testler/kod-testleri.js`)
- Gizlilik ayarları (127.0.0.1 bağlama, telemetri kapalı) kaynakta doğrulandı
- Dal envanteri `git` ile ölçüldü, birleştirilmemiş dalın diff'i okundu
- Çalıştırma betiklerinin üçü de mevcut

### ❌ Doğrulanamayanlar
Bu ortamda **Docker çalışmıyor**, bu yüzden:
- n8n **başlatılmadı**, panel açılmadı
- Hiçbir workflow içe aktarılmadı veya çalıştırılmadı
- E-posta, Telegram, fiyat takibi, takvim — hiçbiri denenmedi
- Geliştirici paketi (17–21): gerçek HTTP yoklaması, GitHub API çağrısı ve
  webhook uçları çalıştırılmadı; yalnızca Code düğümlerinin mantığı test edildi
- Kişisel takip paketi (22–26): zamanlayıcılar (özellikle 26'nın haftalık
  Pazar tetikleyicisi) ve Telegram/SMTP gönderimi çalıştırılmadı
- Ollama profili başlatılmadı

**Kurulabilecek cümle:** *"Yapılandırma tutarlı ve dokümantasyon doğru; ama
hiçbir workflow çalıştırılmadı."*

---

## 7. Yarınki test için (Intel Mac)

Bu depo Intel Mac'te **iyi çalışması beklenen** depolardan biri — tek gereksinim
Docker Desktop.

```bash
git clone https://github.com/yokbi/n8n-local
cd n8n-local
./run-mac-intel.sh
```

Betik: Docker kontrolü → `.env` oluşturma → `docker compose up -d`.
Sonra: **http://localhost:5678**

Adım adım rehber zaten yazılı: [`RUNNING.md`](RUNNING.md)

**Sürüm sabitlemesi artık yapıldı** (§3), ayrıca bir şey yapmanız gerekmiyor.

**Denenecekler (öncelik sırasıyla):**
1. Panel açılıyor mu (`http://localhost:5678`)
2. Workflow 03 (görev takibi) — webhook ile bir görev ekleyip listeleyin
3. Workflow 05 (Telegram) — bot token'ı varsa
4. **Workflow 10 (günaydın brifingi)** — dış servis gerektirmez, *Elle Test Et*
   düğümüyle hemen denenebilir
5. **Workflow 11 (hata nöbetçisi)** — bir workflow'a geçici `throw new Error()`
   koyup deneyin; sonra her workflow'un **Settings → Error Workflow** alanına
   tanıtın (README §9.2)
6. E-posta workflow'ları (01, 02) — uygulama şifresi gerektirir, README §4

**Ollama profili Intel Mac'te:** `docker compose --profile ai up -d` çalışır ama
GPU hızlandırma olmadan yalnızca CPU'da koşar. README küçük bir model
(`qwen2.5:3b`) öneriyor — bu boyut Intel Mac'te makul hızda çalışır.

---

Kalan işler: [`YAPILACAKLAR.md`](YAPILACAKLAR.md)
Kurulum rehberi: [`RUNNING.md`](RUNNING.md) · Tam belge: [`README.md`](README.md)
