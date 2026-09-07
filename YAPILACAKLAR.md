# Yapılacaklar — n8n-local

Öncelik: 🔴 kritik · 🟡 orta · 🟢 düşük

Bu depo iyi durumda: dokümantasyon doğru, çalıştırma betikleri üç platform için
mevcut, 9 workflow hazır. Aşağıdaki maddeler **dayanıklılık** ve **doğrulama**
ile ilgili.

---

## N1 🔴 Dayanıklılık dalını birleştirin

**Sorun.** `claude/bu-repo-nedr-fy2s7i` dalında 1 commit / 6 dosya
birleştirilmemiş duruyor ve içindekiler **gerçek veri kaybı senaryolarını
kapatıyor.**

```
1ec494f  Dayanıklılık: sürüm sabitleme, yazma çakışması ve bozuk dosya koruması
```

### a) n8n sürümü `latest` — kurulum bir sabah kendiliğinden bozulabilir

`main`'de:
```yaml
image: docker.n8n.io/n8nio/n8n:latest
```
Dalda:
```yaml
image: docker.n8n.io/n8nio/n8n:2.35.3
```

`docker compose pull` yaptığınız gün n8n büyük sürüm atlamışsa, çalışan
workflow'larınız uyumsuz hâle gelebilir. **Kendi makinenizde çalışan bir
otomasyon merkezi için sürüm sabitlemesi şart** — kırıldığında haberiniz olmaz,
sadece sabah özeti gelmez.

### b) İki workflow aynı dosyayı yazıyor — görev kaybı riski

Görev listesini **hem webhook (03) hem Telegram botu (05)** yazıyor. İkisi
aynı anda çalışırsa klasik **oku-değiştir-yaz yarışı** oluşur: biri dosyayı
okur, diğeri okur, biri yazar, diğeri üstüne yazar — **arada eklenen görev
sessizce kaybolur.**

Dalın çözümü:
```yaml
- N8N_CONCURRENCY_PRODUCTION_LIMIT=1
```
Çalıştırmalar sıraya girer. (Ayrıca dal, artık gereksiz olan
`N8N_RUNNERS_ENABLED` satırını da açıklamasıyla birlikte kaldırıyor —
n8n 2.0'dan itibaren varsayılan olarak açık.)

### c) Bozuk JSON dosyası → workflow eskiden veriyi SİLİYORDU

Dört workflow JSON'unda (03, 05, 06, 07) koruma eklenmiş. Eskiden: dosya
bozuksa (yazma sırasında bilgisayar kapandı vb.) workflow listeyi **boş sanıp
üzerine yazıyordu**. Şimdi: hata verip **duruyor**, siz dosyayı düzeltiyorsunuz.

Bu, sessiz veri kaybını gürültülü bir hataya çeviriyor — doğru davranış.

### d) Sorun giderme tablosuna 4 yeni satır
`403 Forbidden` (fiyat takibi), Telegram `409 Conflict` (aynı token'da webhook),
Linux `EACCES` (uid 1000 sahiplik), bozuk JSON mesajı.

**Yapılacak — GitHub üzerinden:**
`claude/bu-repo-nedr-fy2s7i` → `main` için PR açıp birleştirin.

**Yapılacak — komut satırından:**
```bash
git clone https://github.com/yokbi/n8n-local && cd n8n-local
git merge --no-ff origin/claude/bu-repo-nedr-fy2s7i \
  -m "fix: sürüm sabitleme, yazma çakışması ve bozuk dosya koruması"
git push origin main
```

**Birleştirdikten sonra**, workflow'ları n8n'e **yeniden içe aktarın** — JSON
dosyaları değiştiği için paneldeki eski kopyalar güncellenmez.

> **Yarın kurulum yapmadan önce bunu yapın.** Aksi hâlde `latest` imajı
> çekilir ve hangi n8n sürümüne denk geleceğiniz belirsiz olur.

---

## N2 🟡 Hiçbir workflow çalıştırılarak doğrulanmadı

**Durum.** Bu denetimde Docker çalışmadığı için n8n hiç başlatılmadı. 9
workflow'un JSON'u okundu, ama **hiçbiri çalıştırılmadı.**

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

**Yapılacak:** Bu klasörü düzenli yedeğe dâhil edin. N1'in getirdiği bozuk-dosya
koruması sayesinde bozulma artık sessiz kalmıyor, ama **yedek yerine geçmez**.

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
| 03 Görev takibi | ✅ | | |
| 05 Telegram | ⬜ | | |
| … | | | |

Altı ay sonra "bu çalışıyor muydu?" diye düşünmemek için.

---

## Öncelik sırası önerisi

1. **N1** — dayanıklılık dalını birleştir *(kurulumdan ÖNCE)*
2. **N3** — şifreleme anahtarını üret ve yedekle *(kurulumun ilk 5 dakikası)*
3. **N2** — workflow'ları tek tek dene, sonuçları not et
4. **N6** — hangisinin çalıştığını tabloya yaz
5. **N4, N5** — yedekleme ve AI profili notları
