// ─────────────────────────────────────────────────────────────────────────────
// Workflow mantığı testleri — Docker ve n8n GEREKMEZ.
//
// Çalıştırmak için (Node.js kurulu olmalı):
//     node testler/kod-testleri.js
//
// Ne yapar: workflow JSON dosyalarındaki Code düğümlerinin JavaScript'ini
// okur ve n8n'in çalışma ortamının küçük bir taklidinde ($, $input, $env)
// çalıştırır. Böylece "dosya bozuksa duruyor mu", "Ollama kapalıyken veri
// kayboluyor mu", "aynı haber iki kez gönderiliyor mu" gibi sorular n8n'i
// hiç başlatmadan yanıtlanabilir.
//
// Ne YAPMAZ: gerçek HTTP istekleri, gerçek dosya okuma/yazma, n8n'in kendi
// düğüm davranışları (IMAP, Telegram, zamanlayıcı) test edilmez. Bunlar için
// workflow'u panelde elle çalıştırmak gerekir.
//
// Bir workflow'un Code düğümünü değiştirirseniz bu testleri çalıştırın.
// ─────────────────────────────────────────────────────────────────────────────

// n8n Code düğümü ortamının küçük bir taklidi: $(), $input, $env.
const fs = require('fs');

function calistir(kod, { dugumler = {}, girdi = [], env = {} } = {}) {
  const it = (a) => a.map((j) => ({ json: j, binary: undefined }));
  const $ = (ad) => {
    if (!(ad in dugumler)) throw new Error('Düğüm çalışmadı: ' + ad);
    const arr = it(dugumler[ad]);
    return { first: () => arr[0], all: () => arr, item: arr[0] };
  };
  const arr = it(girdi);
  const $input = { first: () => arr[0], all: () => arr, last: () => arr[arr.length - 1] };
  const f = new Function('$', '$input', '$env', '"use strict";' + kod);
  return f($, $input, env);
}

const wf = (n) => JSON.parse(fs.readFileSync('workflows/' + n, 'utf8'));
const kodu = (d, ad) => d.nodes.find((x) => x.name === ad).parameters.jsCode;
let basari = 0, hata = 0;
const dene = (ad, fn) => {
  try { fn(); console.log('  ✓', ad); basari++; }
  catch (e) { console.log('  ✗', ad, '→', e.message); hata++; }
};
const esit = (a, b, m) => { if (a !== b) throw new Error((m||'') + ' beklenen ' + JSON.stringify(b) + ', gelen ' + JSON.stringify(a)); };

// ═══ 10 — Brifingi Hazırla ═══
console.log('10 — Günaydın brifingi');
{
  const kod = kodu(wf('10-gunaydin-brifingi.json'), 'Brifingi Hazırla');
  const dun = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const bugunSaat = new Date(); bugunSaat.setHours(23, 0, 0, 0);
  const temel = {
    'Görevleri Oku (Brifing)': [{}], 'Notları Oku (Brifing)': [{}], 'Harcamaları Oku (Brifing)': [{}],
    'Görevleri Çıkar (Brifing)': [{ data: { gorevler: [{ id: 1, baslik: 'Süt al', durum: 'acik' }, { id: 2, baslik: 'Bitti', durum: 'tamam' }] } }],
    'Notları Çıkar (Brifing)': [{ data: { notlar: [{ id: 1, metin: 'Doktoru ara', hatirlat: bugunSaat.toISOString(), durum: 'acik' }] } }],
    'Harcamaları Çıkar (Brifing)': [{ data: { harcamalar: [{ tarih: dun, tutar: 250, kimden: 'Market' }] } }],
    'Hava Durumunu Al': [{ daily: { weather_code: [61], temperature_2m_max: [22.4], temperature_2m_min: [14.1], precipitation_probability_max: [80] } }],
    'Kurları Al (TCMB)': [{ data: '<Tarih_Date><Currency CurrencyCode="USD"><ForexSelling>34.1234</ForexSelling></Currency><Currency CurrencyCode="EUR"><ForexSelling>37.5000</ForexSelling></Currency></Tarih_Date>' }],
  };
  dene('tam veri: hava, kur, görev, hatırlatma, harcama', () => {
    const r = calistir(kod, { dugumler: temel, girdi: [{}], env: { HAVA_SEHIR: 'İzmir' } })[0].json;
    const t = r.text;
    if (!t.includes('🌧 İzmir: Hafif yağmur, 14° / 22°')) throw new Error('hava satırı: ' + t.split('\n')[2]);
    if (!t.includes('☔ yağış %80')) throw new Error('yağış yok');
    if (!t.includes('$ 34.12') || !t.includes('€ 37.50')) throw new Error('kur yok');
    if (!t.includes('#1 Süt al') || t.includes('#2 Bitti')) throw new Error('görev süzme hatalı');
    if (!t.includes('Doktoru ara')) throw new Error('hatırlatma yok');
    if (!t.includes('💸 Dün: 250 TL')) throw new Error('dünkü harcama: ' + t);
    esit(r.gonderilecek, true);
  });
  dene('hava ve kur alınamadı → brifing yine gider', () => {
    const d = { ...temel, 'Hava Durumunu Al': [{ error: { message: 'ETIMEDOUT' } }], 'Kurları Al (TCMB)': [{ error: { message: 'ETIMEDOUT' } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    if (!r.text.includes('Hava durumu alınamadı')) throw new Error('hava hatası bildirilmiyor');
    if (r.text.includes('💱')) throw new Error('kur satırı olmamalı');
    if (!r.text.includes('#1 Süt al')) throw new Error('görevler kaybolmuş');
  });
  dene('dosyalar hiç yok → boş listelerle çalışır', () => {
    const yok = { message: 'ENOENT: no such file or directory' };
    const d = { ...temel,
      'Görevleri Oku (Brifing)': [{ error: yok }], 'Görevleri Çıkar (Brifing)': [{ error: yok }],
      'Notları Oku (Brifing)': [{ error: yok }], 'Notları Çıkar (Brifing)': [{ error: yok }],
      'Harcamaları Oku (Brifing)': [{ error: yok }], 'Harcamaları Çıkar (Brifing)': [{ error: yok }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    if (!r.text.includes('Açık görev yok')) throw new Error('boş liste işlenmedi');
  });
  dene('gorevler.json BOZUK → durur (üzerine yazmaz)', () => {
    const d = { ...temel, 'Görevleri Çıkar (Brifing)': [{ error: { message: 'Unexpected token } in JSON' } }] };
    let attı = false;
    try { calistir(kod, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /gorevler\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
}

// ═══ 14 — Yeni Haberleri Bul ═══
console.log('14 — RSS haber özeti');
{
  const kod = kodu(wf('14-rss-haber-ozeti.json'), 'Yeni Haberleri Bul');
  const rss = (basliklar) => '<rss><channel>' + basliklar.map((b, i) =>
    `<item><title><![CDATA[${b}]]></title><link>https://ornek.com/${i}</link><description>Açıklama ${i}</description></item>`).join('') + '</channel></rss>';
  const atom = '<feed><entry><title>Atom haberi</title><link href="https://atom.com/1"/><summary>özet</summary></entry></feed>';
  const kaynak = { 'Kaynakları Listele': [{ ad: 'A', url: 'https://a' }, { ad: 'B', url: 'https://b' }], 'Kaynakları Oku': [{}], 'Kaynakları Çıkar': [{}], 'Durumu Oku': [{}] };

  dene('ilk çalışma sessiz (arşiv gönderilmez)', () => {
    const d = { ...kaynak, 'Durumu Çıkar': [{ data: { gorulen: [] } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{ data: rss(['H1', 'H2']) }, { data: atom }] })[0].json;
    esit(r.gonderilecek, false, 'ilk turda bildirim'); esit(r.yazilsin, true);
    esit(r.gorulen.length, 3, 'işaretlenen');
  });
  dene('ikinci turda yalnızca yeni haber gelir', () => {
    const d = { ...kaynak, 'Durumu Çıkar': [{ data: { gorulen: ['https://ornek.com/0'] } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{ data: rss(['H1', 'H2']) }, { data: atom }] })[0].json;
    esit(r.gonderilecek, true);
    esit(r.yeniler.length, 2, 'yeni sayısı');
    if (r.text.includes('H1')) throw new Error('görülen haber tekrar gönderildi');
    if (!r.text.includes('H2') || !r.text.includes('Atom haberi')) throw new Error('yeni haberler eksik');
  });
  dene('bir kaynak hata verirse diğeri işlenir, hatalı kaynak "görüldü" sayılmaz', () => {
    const d = { ...kaynak, 'Durumu Çıkar': [{ data: { gorulen: ['x'] } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{ error: { message: '403 Forbidden' } }, { data: atom }] })[0].json;
    if (!r.text.includes('⚠️ A: 403')) throw new Error('hata bildirilmedi');
    if (!r.text.includes('Atom haberi')) throw new Error('sağlam kaynak işlenmedi');
    esit(r.yazilsin, true);
  });
  const listeKod = kodu(wf('14-rss-haber-ozeti.json'), 'Kaynakları Listele');
  dene('rss-durum.json bozuk → hiç taramaya başlamaz', () => {
    const d = { 'Kaynakları Oku': [{}], 'Kaynakları Çıkar': [{ data: { kaynaklar: [{ ad: 'A', url: 'https://a' }] } }],
                'Durumu Oku': [{}], 'Durumu Çıkar': [{ error: { message: 'Unexpected end of JSON input' } }] };
    let attı = false;
    try { calistir(listeKod, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /rss-durum\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk durumda durmadı');
  });
  dene('kaynak listesi boşsa anlaşılır hata verir', () => {
    const d = { 'Kaynakları Oku': [{}], 'Kaynakları Çıkar': [{ data: { kaynaklar: [] } }],
                'Durumu Oku': [{}], 'Durumu Çıkar': [{ data: { gorulen: [] } }] };
    let attı = false;
    try { calistir(listeKod, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /geçerli kaynak yok/.test(e.message); }
    if (!attı) throw new Error('boş listede uyarmadı');
  });
  dene('dosya hiç yoksa (ENOENT) koruma devreye girmez', () => {
    const yok = { message: 'ENOENT: no such file' };
    const d = { 'Kaynakları Oku': [{}], 'Kaynakları Çıkar': [{ data: { kaynaklar: [{ ad: 'A', url: 'https://a' }] } }],
                'Durumu Oku': [{ error: yok }], 'Durumu Çıkar': [{ error: yok }] };
    const r = calistir(listeKod, { dugumler: d, girdi: [{}] });
    esit(r.length, 1, 'kaynak sayısı');
  });
}

// ═══ 16 — Değişenleri Bul ═══
console.log('16 — Sayfa değişiklik takibi');
{
  const kod = kodu(wf('16-sayfa-degisiklik-takibi.json'), 'Değişenleri Bul');
  const sayfa = (ek) => ({ 'Sayfaları Aç': [{ ad: 'Duyurular', url: 'https://o.com', secici: 'body', ...ek }],
                           'Sayfaları Oku': [{}], 'Sayfaları Çıkar': [{}], 'Sayfayı İndir': [{ data: '<html>' }] });
  dene('ilk kontrol sessiz, parmak izi kaydedilir', () => {
    const r = calistir(kod, { dugumler: sayfa({}), girdi: [{ icerik: 'İlk içerik' }] })[0].json;
    esit(r.gonderilecek, false); esit(r.yazilsin, true);
    if (!r.sayfalar[0].sonIz) throw new Error('parmak izi yazılmadı');
  });
  dene('içerik aynıysa bildirim yok', () => {
    const ilk = calistir(kod, { dugumler: sayfa({}), girdi: [{ icerik: 'Aynı içerik' }] })[0].json.sayfalar[0];
    const r = calistir(kod, { dugumler: sayfa({ sonIz: ilk.sonIz }), girdi: [{ icerik: 'Aynı içerik' }] })[0].json;
    esit(r.gonderilecek, false, 'aynı içerikte bildirim gitti');
  });
  dene('içerik değişince bildirim gider', () => {
    const ilk = calistir(kod, { dugumler: sayfa({}), girdi: [{ icerik: 'Eski duyuru' }] })[0].json.sayfalar[0];
    const r = calistir(kod, { dugumler: sayfa({ sonIz: ilk.sonIz }), girdi: [{ icerik: 'Yeni duyuru geldi' }] })[0].json;
    esit(r.gonderilecek, true, 'değişiklik yakalanmadı');
    if (!r.text.includes('Yeni duyuru geldi')) throw new Error('özet yok');
  });
  dene('sayfa indirilemezse eski parmak izi korunur', () => {
    const d = sayfa({ sonIz: 'abc:10' });
    d['Sayfayı İndir'] = [{ error: { message: '403 Forbidden' } }];
    const r = calistir(kod, { dugumler: d, girdi: [{ error: { message: 'veri yok' } }] })[0].json;
    esit(r.gonderilecek, false);
    esit(r.sayfalar[0].sonIz, 'abc:10', 'parmak izi kaybolmuş');
    if (!r.sayfalar[0].sonHata.includes('403')) throw new Error('hata kaydedilmedi');
  });
  dene('seçici boş dönerse uyarı, iz korunur', () => {
    const r = calistir(kod, { dugumler: sayfa({ sonIz: 'abc:10' }), girdi: [{ icerik: '' }] })[0].json;
    esit(r.sayfalar[0].sonIz, 'abc:10');
    if (!r.sayfalar[0].sonHata.includes('hiçbir metin')) throw new Error('uyarı yok');
  });
}

// ═══ 05 — /ai ve /oku komutları ═══
console.log('05 — Telegram bot komutları');
{
  const kod = kodu(wf('05-telegram-botu.json'), 'Komutları İşle');
  const bot = (metin) => {
    const bos = [{}];
    const d = {
      'Yeni Mesajları Getir': [{ ok: true, result: [{ update_id: 7, message: { chat: { id: 42 }, text: metin } }] }],
      'Görev Dosyasını Oku (Bot)': bos, 'Görevleri Çıkar (Bot)': [{ data: { gorevler: [] } }],
      'Harcamaları Oku (Bot)': bos, 'Harcamaları Çıkar (Bot)': [{ data: { harcamalar: [] } }],
      'Notları Oku (Bot)': bos, 'Notları Çıkar (Bot)': [{ data: { notlar: [] } }],
      'Fiyat Listesini Oku (Bot)': bos, 'Fiyatları Çıkar (Bot)': [{ data: { urunler: [] } }],
      'Offset Dosyasını Oku': bos, 'Offseti Çıkar': [{ data: { offset: 0 } }],
    };
    return calistir(kod, { dugumler: d, girdi: [{ data: { gorevler: [] } }], env: {} })[0].json;
  };
  dene('/ai → workflow 12 isteği kuyruğa girer, kullanıcıya bilgi verilir', () => {
    const r = bot('/ai merhaba dünya');
    esit(r.aiIstekleri.length, 1); esit(r.aiIstekleri[0].soru, 'merhaba dünya');
    esit(r.aiIstekleri[0].chat_id, 42); esit(r.yanitlar[0].text, '🤔 Düşünüyorum…');
    esit(r.gorevYazilsin, false, 'yanlışlıkla görev eklendi');
  });
  dene('/ai argümansız → kullanım bilgisi, istek yok', () => {
    const r = bot('/ai');
    esit(r.aiIstekleri.length, 0);
    if (!r.yanitlar[0].text.includes('Kullanım: /ai')) throw new Error('kullanım yok');
  });
  dene('/aisifirla → istek gider, çift mesaj gönderilmez', () => {
    const r = bot('/aisifirla');
    esit(r.aiIstekleri.length, 1); esit(r.aiIstekleri[0].komut, 'sifirla');
    esit(r.yanitlar.length, 0, 'çift onay mesajı');
  });
  dene('/oku <url> → workflow 13 isteği', () => {
    const r = bot('/oku https://ornek.com/yazi');
    esit(r.okumaIstekleri.length, 1); esit(r.okumaIstekleri[0].url, 'https://ornek.com/yazi');
    esit(r.gorevYazilsin, false);
  });
  dene('/oku adressiz → kullanım bilgisi', () => {
    const r = bot('/oku selam');
    esit(r.okumaIstekleri.length, 0);
    if (!r.yanitlar[0].text.includes('Kullanım: /oku')) throw new Error('kullanım yok');
  });
  dene('düz metin hâlâ görev ekliyor (mevcut davranış bozulmadı)', () => {
    const r = bot('markete git');
    esit(r.gorevYazilsin, true); esit(r.gorevler.length, 1);
    esit(r.aiIstekleri.length, 0); esit(r.okumaIstekleri.length, 0);
  });
  dene('/yardim yeni komutları listeliyor', () => {
    const r = bot('/yardim');
    const t = r.yanitlar[0].text;
    if (!t.includes('/ai ') || !t.includes('/oku ')) throw new Error('yardımda yeni komutlar yok');
  });
}

// ═══ 12 — Yerel AI sohbet ═══
console.log('12 — Yerel AI sohbet');
{
  const d12 = wf('12-yerel-ai-sohbet.json');
  const al = kodu(d12, 'İsteği Al'), hazirla = kodu(d12, 'Soruyu Hazırla'), isle = kodu(d12, 'Cevabı İşle');
  const gecmis = { data: { oturumlar: { '42': [{ rol: 'ben', metin: 'selam' }, { rol: 'ai', metin: 'merhaba' }] } } };
  const kur = (girdi, sohbet = gecmis) => {
    const istek = calistir(al, { girdi: [girdi] })[0].json;
    const dug = { 'İsteği Al': [istek], 'Sohbeti Oku': [{}], 'Sohbeti Çıkar': [sohbet] };
    const h = calistir(hazirla, { dugumler: dug, girdi: [sohbet] })[0].json;
    return { istek, h, dug: { ...dug, 'Soruyu Hazırla': [h] } };
  };
  dene('webhook isteği (body içinde) çözülür', () => {
    const { istek } = kur({ body: { soru: 'n8n nedir?' } });
    esit(istek.soru, 'n8n nedir?'); esit(istek.webhooktan, true);
  });
  dene("workflow 05 çağrısı (body'siz) çözülür", () => {
    const { istek } = kur({ soru: 'merhaba', chat_id: '42', oturum: '42' });
    esit(istek.webhooktan, false); esit(istek.chat_id, '42'); esit(istek.oturum, '42');
  });
  dene('geçmiş modele gönderilir (sistem + 2 tur + soru)', () => {
    const { h } = kur({ soru: 'devam', chat_id: '42', oturum: '42' });
    esit(h.mesajlar.length, 4); esit(h.mesajlar[0].role, 'system');
    esit(h.mesajlar[1].content, 'selam'); esit(h.mesajlar[2].role, 'assistant');
    esit(h.mesajlar[3].content, 'devam'); esit(h.atla, false);
  });
  dene('cevap geçmişe eklenir', () => {
    const { dug } = kur({ soru: 'devam', chat_id: '42', oturum: '42' });
    const r = calistir(isle, { dugumler: dug, girdi: [{ message: { content: '  Cevabım  ' } }] })[0].json;
    esit(r.cevap, 'Cevabım'); esit(r.yazilsin, true);
    esit(r.oturumlar['42'].length, 4, 'geçmiş uzunluğu');
  });
  dene('Ollama kapalıysa geçmiş BOZULMAZ ve anlaşılır uyarı gelir', () => {
    const { dug } = kur({ soru: 'devam', chat_id: '42', oturum: '42' });
    const r = calistir(isle, { dugumler: dug, girdi: [{ error: { message: 'connect ECONNREFUSED 172.18.0.3:11434' } }] })[0].json;
    esit(r.yazilsin, false, 'hatada dosyaya yazılıyor');
    if (!r.cevap.includes('--profile ai up -d')) throw new Error('yönlendirme yok: ' + r.cevap);
    esit(r.oturumlar['42'].length, 2, 'geçmiş değişmiş');
  });
  dene('model yoksa pull komutu önerilir', () => {
    const { dug } = kur({ soru: 'x', chat_id: '42' });
    const r = calistir(isle, { dugumler: dug, girdi: [{ error: { message: '404 model not found' } }] })[0].json;
    if (!r.cevap.includes('ollama pull')) throw new Error('pull önerisi yok: ' + r.cevap);
  });
  dene('/sifirla modele gitmeden geçmişi siler', () => {
    const { h } = kur({ komut: 'sifirla', chat_id: '42', oturum: '42' });
    esit(h.atla, true); esit(h.yazilsin, true); esit(h.oturumlar['42'].length, 0);
  });
  dene('sohbet.json bozuksa durur', () => {
    let attı = false;
    try { kur({ soru: 'x' }, { error: { message: 'Unexpected token' } }); }
    catch (e) { attı = /sohbet\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
}

// ═══ 13 — Link özetleyici ═══
console.log('13 — Link özetleyici');
{
  const d13 = wf('13-link-ozetleyici.json');
  const al = kodu(d13, 'İsteği Al (Link)'), dogrula = kodu(d13, 'Bağlantıyı Doğrula');
  const ayikla = kodu(d13, 'Metni Ayıkla'), kaydet = kodu(d13, 'Özeti Kaydet');
  const liste = { data: { baglantilar: [] } };
  const kur = (girdi, l = liste) => {
    const istek = calistir(al, { girdi: [girdi] })[0].json;
    const dug = { 'İsteği Al (Link)': [istek], 'Okunacakları Oku': [{}], 'Okunacakları Çıkar': [l] };
    const dg = calistir(dogrula, { dugumler: dug, girdi: [l] })[0].json;
    return { dg, dug: { ...dug, 'Bağlantıyı Doğrula': [dg] } };
  };
  dene("metin içindeki adres ayıklanır (/oku '<url>' için)", () => {
    const { dg } = kur({ text: 'şuna bak https://ornek.com/yazi. teşekkürler' });
    esit(dg.gecerli, true); esit(dg.url, 'https://ornek.com/yazi');
  });
  dene('adres yoksa reddedilir', () => {
    const { dg } = kur({ url: 'merhaba' });
    esit(dg.gecerli, false); esit(dg.yazilsin, false);
  });
  dene('aynı adres ikinci kez → yeniden indirilmez', () => {
    const { dg } = kur({ url: 'https://ornek.com/a' },
      { data: { baglantilar: [{ id: 1, url: 'https://ornek.com/a', baslik: 'Eski', ozet: 'özet' }] } });
    esit(dg.gecerli, false);
    if (!dg.mesaj.includes('zaten listede')) throw new Error('uyarı yok');
  });
  dene('HTML sadeleştirilir, başlık ve açıklama okunur', () => {
    const { dug, dg } = kur({ url: 'https://ornek.com/y' });
    const html = '<html><head><title>Sayfa Başlığı</title><meta name="description" content="Kısa açıklama">' +
      '</head><body><script>var a=1;</script><style>p{}</style><p>Gövde metni</p>' + 'x'.repeat(400) + '</body></html>';
    const r = calistir(ayikla, { dugumler: dug, girdi: [{ data: html }] })[0].json;
    esit(r.baslik, 'Sayfa Başlığı'); esit(r.aciklama, 'Kısa açıklama'); esit(r.yeterli, true);
    if (r.metin.includes('var a=1') || r.metin.includes('p{}')) throw new Error('script/style sızdı');
    if (!r.metin.includes('Gövde metni')) throw new Error('gövde kaybolmuş');
  });
  dene('JS ile yüklenen sayfa (metin kısa) → model çağrılmaz', () => {
    const { dug } = kur({ url: 'https://ornek.com/y' });
    const r = calistir(ayikla, { dugumler: dug, girdi: [{ data: '<html><body><div id="root"></div></body></html>' }] })[0].json;
    esit(r.yeterli, false);
  });
  dene('özet üretilince listeye kaydedilir', () => {
    const { dug } = kur({ url: 'https://ornek.com/y', chat_id: '42' });
    const ay = calistir(ayikla, { dugumler: dug, girdi: [{ data: '<title>T</title><body>' + 'a'.repeat(400) + '</body>' }] })[0].json;
    const r = calistir(kaydet, { dugumler: { ...dug, 'Metni Ayıkla': [ay] } , girdi: [{ response: '• madde bir' }] })[0].json;
    esit(r.yazilsin, true); esit(r.baglantilar.length, 1); esit(r.baglantilar[0].ozet, '• madde bir');
    esit(r.chatId, '42');
  });
  dene('Ollama kapalıyken bağlantı YİNE kaydedilir', () => {
    const { dug } = kur({ url: 'https://ornek.com/y' });
    const ay = calistir(ayikla, { dugumler: dug, girdi: [{ data: '<title>T</title><body>' + 'a'.repeat(400) + '</body>' }] })[0].json;
    const r = calistir(kaydet, { dugumler: { ...dug, 'Metni Ayıkla': [ay] }, girdi: [{ error: { message: 'ECONNREFUSED' } }] })[0].json;
    esit(r.yazilsin, true); esit(r.baglantilar.length, 1);
    if (!r.mesaj.includes('Ollama kapalı')) throw new Error('uyarı yok: ' + r.mesaj);
  });
  dene('sayfa indirilemezse bağlantı yine kaydedilir', () => {
    const { dug } = kur({ url: 'https://ornek.com/y' });
    const ay = calistir(ayikla, { dugumler: dug, girdi: [{ error: { message: '403 Forbidden' } }] })[0].json;
    const r = calistir(kaydet, { dugumler: { ...dug, 'Metni Ayıkla': [ay] }, girdi: [{ ...ay, ozet: '' }] })[0].json;
    esit(r.yazilsin, true);
    if (!r.mesaj.includes('indirilemedi')) throw new Error('uyarı yok: ' + r.mesaj);
  });
}

// ═══ 11 — Hata nöbetçisi ═══
console.log('11 — Hata nöbetçisi');
{
  const kod = kodu(wf('11-hata-nobetcisi.json'), 'Hata Mesajını Hazırla');
  const olay = { workflow: { id: 'abc', name: '06 — Fiyat Takibi' },
                 execution: { id: 99, lastNodeExecuted: 'Sayfayı İndir', error: { message: '403 Forbidden\nyığın izi' } } };
  dene('hata mesajı kurulur ve geçmişe yazılır', () => {
    const d = { 'Hata Yakalandı': [olay], 'Hataları Oku': [{}], 'Hataları Çıkar': [{ data: { hatalar: [] } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    if (!r.text.includes('06 — Fiyat Takibi')) throw new Error('workflow adı yok');
    if (!r.text.includes('Sayfayı İndir')) throw new Error('düğüm adı yok');
    if (r.text.includes('yığın izi')) throw new Error('yığın izi sızdı');
    esit(r.yazilsin, true); esit(r.hatalar.length, 1);
  });
  dene('aynı gün tekrar → "🔁 Bugün 2. kez"', () => {
    const d = { 'Hata Yakalandı': [olay], 'Hataları Oku': [{}],
      'Hataları Çıkar': [{ data: { hatalar: [{ tarih: new Date().toISOString(), workflow: '06 — Fiyat Takibi', mesaj: 'x' }] } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    if (!r.text.includes('Bugün 2. kez')) throw new Error('tekrar sayacı yok');
  });
  dene('hatalar.json bozuk olsa bile BİLDİRİM GİDER (nöbetçi susmaz)', () => {
    const d = { 'Hata Yakalandı': [olay], 'Hataları Oku': [{}],
                'Hataları Çıkar': [{ error: { message: 'Unexpected token' } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    esit(r.yazilsin, false, 'bozuk dosyaya yazmaya çalışıyor');
    if (!r.text.includes('06 — Fiyat Takibi')) throw new Error('bildirim kayboldu');
    if (!r.text.includes('hatalar.json okunamadı')) throw new Error('uyarı yok');
  });
  dene('geçmiş 200 kayıtla sınırlanır', () => {
    const eski = Array.from({ length: 205 }, (_, i) => ({ tarih: '2020-01-01T00:00:00Z', workflow: 'x', mesaj: String(i) }));
    const d = { 'Hata Yakalandı': [olay], 'Hataları Oku': [{}], 'Hataları Çıkar': [{ data: { hatalar: eski } }] };
    const r = calistir(kod, { dugumler: d, girdi: [{}] })[0].json;
    esit(r.hatalar.length, 200);
  });
}

console.log('\nBaşarılı: ' + basari + '   Hatalı: ' + hata);
process.exit(hata ? 1 : 0);
