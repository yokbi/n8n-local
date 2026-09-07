# Durum Raporu — n8n-local

**Denetim tarihi:** 2026-09-07 · **Depo:** https://github.com/yokbi/n8n-local
**Varsayılan dal:** `main`

---

## 1. Özet

| | |
|---|---|
| Proje | Kendi bilgisayarınızda çalışan, veriyi dışarı göndermeyen kişisel otomasyon merkezi |
| Teknoloji | **n8n** (Docker) + SQLite · isteğe bağlı **Ollama** (yerel AI) |
| Kurulum | `docker compose up -d` → http://localhost:5678 |
| Workflow | **9 adet** hazır, `workflows/` altında JSON olarak |
| Doküman | `README.md` (22 KB, 13 bölüm) + `RUNNING.md` (adım adım) |
| Çalıştırma betiği | Üç platform için **zaten mevcut** ✅ |
| Olgunluk | **Yüksek.** Bu, denetlenen depolar arasında dokümantasyonu en iyi olanlardan biri. |

**Depoda kod yazılmıyor** — n8n workflow'ları JSON olarak ve Docker
yapılandırması olarak duruyor. Bu yüzden "test" burada *çalıştırıp denemek*
demek, *derlemek* değil.

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

---

## 3. 🟡 ÖNEMLİ BULGU — dayanıklılık düzeltmeleri birleştirilmemiş

`claude/bu-repo-nedr-fy2s7i` dalında **1 commit, 6 dosya** duruyor ve
birleştirilmemiş:

```
1ec494f  Dayanıklılık: sürüm sabitleme, yazma çakışması ve bozuk dosya koruması
```

Bu **doküman değil, gerçek düzeltmeler.** İçeriği:

### a) n8n sürümü sabitleniyor
```diff
-    image: docker.n8n.io/n8nio/n8n:latest
+    image: docker.n8n.io/n8nio/n8n:2.35.3
```
`latest` bir gün sessizce büyük sürüm atlayıp kurulumu bozabilir. `main`'de
şu anda `latest` duruyor — yani **kurulumunuz bir sabah kendiliğinden
bozulabilir.**

### b) Yazma çakışması koruması
```diff
+    - N8N_CONCURRENCY_PRODUCTION_LIMIT=1
```
Görev listesini **hem webhook (03) hem Telegram botu (05)** yazıyor. Eşzamanlı
çalışırlarsa klasik "oku-değiştir-yaz" yarışı oluşur ve **bir görev sessizce
kaybolur**. Sıraya alma bunu engelliyor.

### c) Bozuk dosya koruması (4 workflow JSON'unda)
JSON dosyası bozuksa (ör. yazma sırasında bilgisayar kapandıysa) workflow artık
**bilerek duruyor** — eskiden listeyi boş sanıp **üzerine yazıyordu**, yani
veri kaybediyordu.

### d) Sorun giderme tablosuna 4 yeni satır
`403`/`Forbidden` fiyat takibi, Telegram `409 Conflict`, Linux `EACCES`,
bozuk JSON.

**Değerlendirme:** Bu düzeltmeler `main`'dekinden **açıkça daha güvenli**.
Özellikle (b) ve (c) gerçek veri kaybı senaryolarını kapatıyor.
→ `YAPILACAKLAR.md` N1

---

## 4. Doküman doğruluk kontrolü

`README.md` ve `RUNNING.md` iyi yazılmış. Kontrol edilenler:

| İddia | Kontrol | Sonuç |
|---|---|:---:|
| "Klonlayın, `.env` oluşturun, `docker compose up -d`" | `.env.example` + `docker-compose.yml` mevcut | ✅ |
| Üç platform için çalıştırma betiği | `run-mac-intel.sh`, `run-mac-apple-silicon.sh`, `run-windows.bat` — üçü de var | ✅ |
| "Panel yalnızca `127.0.0.1`'e bağlı" | `ports: - "127.0.0.1:5678:5678"` | ✅ |
| "Telemetri kapalı" | `N8N_DIAGNOSTICS_ENABLED=false` + 4 ayar daha | ✅ |
| 9 workflow | `workflows/` altında 9 JSON | ✅ |
| `docker-compose.yml` geçerli | YAML olarak ayrıştırıldı | ✅ |
| Şifreleme anahtarı `.env`'den | `N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}` | ✅ |

**Dokümanlar doğrudur.** Tek istisna: `README.md` §12 (Güncelleme) `latest`
imajını varsayıyor; birleştirilmemiş dal bunu düzeltiyor (§3a).

---

## 5. Dal envanteri

| Dal | `main`'in önünde | Fark | İçerik |
|---|---:|---:|---|
| `main` | — | — | Ana sürüm |
| **`claude/bu-repo-nedr-fy2s7i`** | **1** | **6 dosya** | **Dayanıklılık düzeltmeleri — birleştirilmemiş** |
| `claude/kalan-kod-isleri-9b8tt5` | 0 | 0 | Birleştirilmiş |
| `claude/multi-platform-setup-scripts-8qef52` | 0 | 0 | Birleştirilmiş (PR #3) |
| `claude/repo-audit-docs-e1dail` | — | — | Bu doküman turu |

---

## 6. Bu ortamda ne doğrulandı, ne doğrulanmadı

### ✅ Yapılanlar
- `docker-compose.yml` YAML olarak ayrıştırıldı — **geçerli**
- 9 workflow JSON dosyasının varlığı doğrulandı
- Gizlilik ayarları (127.0.0.1 bağlama, telemetri kapalı) kaynakta doğrulandı
- Dal envanteri `git` ile ölçüldü, birleştirilmemiş dalın diff'i okundu
- Çalıştırma betiklerinin üçü de mevcut

### ❌ Doğrulanamayanlar
Bu ortamda **Docker çalışmıyor**, bu yüzden:
- n8n **başlatılmadı**, panel açılmadı
- Hiçbir workflow içe aktarılmadı veya çalıştırılmadı
- E-posta, Telegram, fiyat takibi, takvim — hiçbiri denenmedi
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

**Önce yapılması önerilen:** `YAPILACAKLAR.md` → **N1** (dayanıklılık dalını
birleştirin). Sürüm sabitlemesi olmadan `latest` imajı çekilir ve kurulumunuz
hangi n8n sürümüne denk geleceği belirsizdir.

**Denenecekler (öncelik sırasıyla):**
1. Panel açılıyor mu (`http://localhost:5678`)
2. Workflow 03 (görev takibi) — webhook ile bir görev ekleyip listeleyin
3. Workflow 05 (Telegram) — bot token'ı varsa
4. E-posta workflow'ları (01, 02) — uygulama şifresi gerektirir, README §4

**Ollama profili Intel Mac'te:** `docker compose --profile ai up -d` çalışır ama
GPU hızlandırma olmadan yalnızca CPU'da koşar. README küçük bir model
(`qwen2.5:3b`) öneriyor — bu boyut Intel Mac'te makul hızda çalışır.

---

Kalan işler: [`YAPILACAKLAR.md`](YAPILACAKLAR.md)
Kurulum rehberi: [`RUNNING.md`](RUNNING.md) · Tam belge: [`README.md`](README.md)
