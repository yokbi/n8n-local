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
  // Dün öğlen: testin günün hangi saatinde çalıştığından bağımsız olarak "dün".
  const dunD = new Date(); dunD.setDate(dunD.getDate() - 1); dunD.setHours(12, 0, 0, 0);
  const dun = dunD.toISOString();
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

  // ── Geliştirici komutları (workflow 17–21) ──
  dene('/servis ve /pr ilgili workflow\'a iletilir, bot susar', () => {
    const s = bot('/servis');
    esit(s.servisIstekleri.length, 1); esit(s.servisIstekleri[0].chat_id, 42);
    esit(s.yanitlar.length, 0, 'çift mesaj'); esit(s.gorevYazilsin, false);
    const p = bot('/pr');
    esit(p.githubIstekleri.length, 1); esit(p.yanitlar.length, 0);
  });
  dene('/kod arama, /kodgetir ve /kodkaydet workflow 19\'a gider', () => {
    const ara = bot('/kod docker');
    esit(ara.kodIstekleri.length, 1); esit(ara.kodIstekleri[0].komut, 'ara');
    esit(ara.kodIstekleri[0].metin, 'docker');
    esit(bot('/kod').kodIstekleri[0].komut, 'liste');
    esit(bot('/kodgetir 3').kodIstekleri[0].komut, 'getir');
    esit(bot('/kodsil 3').kodIstekleri[0].komut, 'sil');
  });
  dene('/kodkaydet çok satırlı mesajı bozulmadan iletir', () => {
    const r = bot('/kodkaydet Docker temizlik #docker\ndocker system prune -af');
    esit(r.kodIstekleri.length, 1); esit(r.kodIstekleri[0].komut, 'kaydet');
    esit(r.kodIstekleri[0].metin, 'Docker temizlik #docker\ndocker system prune -af');
  });
  dene('/kodgetir numarasız → kullanım bilgisi, istek yok', () => {
    const r = bot('/kodgetir');
    esit(r.kodIstekleri.length, 0);
    if (!r.yanitlar[0].text.includes('Kullanım: /kodgetir')) throw new Error('kullanım yok');
  });
  dene('/arac işlem ve veriyi workflow 20\'ye iletir', () => {
    const r = bot('/arac cron 0 */4 * * *');
    esit(r.aracIstekleri.length, 1); esit(r.aracIstekleri[0].metin, 'cron 0 */4 * * *');
    esit(bot('/arac').aracIstekleri[0].metin, '', 'argümansız çağrı da iletilmeli (yardım için)');
  });
  dene('/istekler, /istek 3 ve /istektemizle workflow 21\'e gider', () => {
    esit(bot('/istekler').istekIstekleri[0].komut, 'liste');
    const d = bot('/istek 3').istekIstekleri[0];
    esit(d.komut, 'detay'); esit(d.id, 3);
    esit(bot('/istektemizle').istekIstekleri[0].komut, 'temizle');
    const yanlis = bot('/istek');
    esit(yanlis.istekIstekleri.length, 0);
    if (!yanlis.yanitlar[0].text.includes('Kullanım: /istek')) throw new Error('kullanım yok');
  });
  dene('geliştirici komutları görev listesine dokunmaz', () => {
    for (const k of ['/servis', '/pr', '/kod x', '/arac uuid', '/istekler']) {
      const r = bot(k);
      esit(r.gorevYazilsin, false, k + ' görev ekledi');
      esit(r.notYazilsin, false, k + ' not ekledi');
    }
  });
  dene('/yardim geliştirici komutlarını da listeliyor', () => {
    const t = bot('/yardim').yanitlar[0].text;
    for (const k of ['/servis', '/pr ', '/kod ', '/arac ', '/istekler']) {
      if (!t.includes(k)) throw new Error('yardımda eksik: ' + k);
    }
  });

  // ── Kişisel takip komutları (workflow 22–26) ──
  dene('/aliskanlik ve /yaptim workflow 22\'ye iletilir', () => {
    const l = bot('/aliskanlik ekle Su iç');
    esit(l.aliskanlikIstekleri.length, 1); esit(l.aliskanlikIstekleri[0].metin, 'ekle Su iç');
    esit(l.yanitlar.length, 0, 'çift mesaj'); esit(l.gorevYazilsin, false);
    esit(bot('/aliskanlik').aliskanlikIstekleri[0].metin, '');
    esit(bot('/yaptim 2 dün').aliskanlikIstekleri[0].metin, 'yaptim 2 dün');
    const y = bot('/yaptim');
    esit(y.aliskanlikIstekleri.length, 0);
    if (!y.yanitlar[0].text.includes('Kullanım: /yaptim')) throw new Error('kullanım yok');
  });
}

// ═══ 17 — Servis nöbetçisi ═══
console.log('17 — Servis nöbetçisi');
{
  const d17 = wf('17-servis-nobetcisi.json');
  const listele = kodu(d17, 'Servisleri Listele');
  const degerlendir = kodu(d17, 'Sonuçları Değerlendir');
  const ozet = kodu(d17, 'Durum Özetini Hazırla');

  const servis = (ek) => ({
    ad: 'API', url: 'https://api.ornek.com/health', yontem: 'GET', beklenenKod: 200,
    icerir: '', zamanAsimi: 15000, esik: 2, sonDurum: 'ayakta', sonKod: 200, sonHata: null,
    sonKontrol: null, ardArda: 0, ilkHata: null, uyarildi: false, ...ek,
  });
  const yokla = (servisler, sonuclar) =>
    calistir(degerlendir, { dugumler: { 'Servisleri Listele': servisler }, girdi: sonuclar })[0].json;

  dene('liste okunur, eksik alanlara varsayılan verilir', () => {
    const d = { 'Servisleri Oku': [{}], 'Servisleri Çıkar': [{ data: { servisler: [{ url: 'https://a.com' }] } }] };
    const r = calistir(listele, { dugumler: d, girdi: [{ data: { servisler: [{ url: 'https://a.com' }] } }] });
    esit(r.length, 1); esit(r[0].json.esik, 2); esit(r[0].json.beklenenKod, 200); esit(r[0].json.ad, 'https://a.com');
  });
  dene('servisler.json bozuk → hiç yoklamaya başlamaz', () => {
    const d = { 'Servisleri Oku': [{}], 'Servisleri Çıkar': [{ error: { message: 'Unexpected token }' } }] };
    let attı = false;
    try { calistir(listele, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /servisler\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
  dene('dosya yoksa kurulum komutunu söyler', () => {
    const yok = { message: 'ENOENT: no such file or directory' };
    const d = { 'Servisleri Oku': [{ error: yok }], 'Servisleri Çıkar': [{ error: yok }] };
    let mesaj = '';
    try { calistir(listele, { dugumler: d, girdi: [{ error: yok }] }); } catch (e) { mesaj = e.message; }
    if (!mesaj.includes('servisler.ornek.json')) throw new Error('kurulum ipucu yok: ' + mesaj);
  });
  dene('ayakta servis sessiz kalır ama durumu yazılır', () => {
    const r = yokla([servis()], [{ statusCode: 200, body: 'ok' }]);
    esit(r.gonderilecek, false); esit(r.yazilsin, true);
    esit(r.servisler[0].sonDurum, 'ayakta'); esit(r.ayakta, 1);
  });
  dene('tek seferlik hata eşiğin altında: uyarı yok, sayaç artar', () => {
    const r = yokla([servis()], [{ error: { message: 'connect ECONNREFUSED 10.0.0.1:443' } }]);
    esit(r.gonderilecek, false, 'tek hatada uyarı gitti');
    esit(r.servisler[0].ardArda, 1); esit(r.servisler[0].uyarildi, false);
    if (!r.servisler[0].ilkHata) throw new Error('ilk hata zamanı yazılmadı');
  });
  dene('eşiğe ulaşınca bir kez uyarı gider', () => {
    const onceki = servis({ ardArda: 1, sonDurum: 'kapali', ilkHata: new Date(Date.now() - 300000).toISOString() });
    const r = yokla([onceki], [{ error: { message: 'connect ECONNREFUSED 10.0.0.1:443' } }]);
    esit(r.gonderilecek, true); esit(r.dusen, 1);
    if (!r.text.includes('KAPALI')) throw new Error('uyarı metni yok: ' + r.text);
    if (!r.text.includes('bağlantı reddedildi')) throw new Error('hata açıklaması yok: ' + r.text);
    esit(r.servisler[0].uyarildi, true);
  });
  dene('kapalı servis her turda tekrar uyarı göndermez', () => {
    const r = yokla([servis({ ardArda: 7, uyarildi: true, sonDurum: 'kapali' })], [{ error: { message: 'ETIMEDOUT' } }]);
    esit(r.gonderilecek, false, 'ikinci kez uyardı');
    esit(r.servisler[0].ardArda, 8);
  });
  dene('düzelince ne kadar kapalı kaldığını söyler', () => {
    const onceki = servis({ uyarildi: true, ardArda: 4, sonDurum: 'kapali', ilkHata: new Date(Date.now() - 1800000).toISOString() });
    const r = yokla([onceki], [{ statusCode: 200, body: 'ok' }]);
    esit(r.gonderilecek, true); esit(r.duzelen, 1);
    if (!r.text.includes('yeniden ayakta')) throw new Error('düzelme mesajı yok');
    if (!r.text.includes('30 dk')) throw new Error('süre yok: ' + r.text);
    esit(r.servisler[0].uyarildi, false); esit(r.servisler[0].ardArda, 0);
  });
  dene('beklenmeyen HTTP kodu arıza sayılır', () => {
    const r = yokla([servis({ esik: 1 })], [{ statusCode: 502, body: 'Bad Gateway' }]);
    esit(r.gonderilecek, true);
    if (!r.text.includes('HTTP 502')) throw new Error('kod bildirilmedi: ' + r.text);
  });
  dene('beklenen metin yanıtta yoksa arıza sayılır', () => {
    const r = yokla([servis({ esik: 1, icerir: 'ok' })], [{ statusCode: 200, body: 'bakımdayız' }]);
    esit(r.gonderilecek, true);
    if (!r.text.includes('metni yanıtta yok')) throw new Error('içerik denetimi çalışmadı: ' + r.text);
  });
  dene('/servis komutu son durumu özetler', () => {
    const dosya = { data: { servisler: [
      { ad: 'API', sonDurum: 'kapali', sonHata: 'HTTP 502 döndü', ardArda: 2, sonKontrol: new Date().toISOString() },
      { ad: 'Site', sonDurum: 'ayakta', sonKod: 200, sonKontrol: new Date().toISOString() },
    ] } };
    const d = { "Workflow 05'ten Çağrı (Servis)": [{ chat_id: '42' }], 'Servisleri Oku (Durum)': [{}], 'Servisleri Çıkar (Durum)': [dosya] };
    const r = calistir(ozet, { dugumler: d, girdi: [dosya] })[0].json;
    esit(r.chat_id, '42');
    if (!r.text.includes('🔴 API') || !r.text.includes('✅ Site')) throw new Error('özet hatalı: ' + r.text);
  });
  dene('chat_id yoksa mesaj gönderilmez', () => {
    const d = { "Workflow 05'ten Çağrı (Servis)": [{}], 'Servisleri Oku (Durum)': [{}], 'Servisleri Çıkar (Durum)': [{ data: { servisler: [] } }] };
    esit(calistir(ozet, { dugumler: d, girdi: [{}] }).length, 0);
  });
}

// ═══ 18 — GitHub nöbetçisi ═══
console.log('18 — GitHub nöbetçisi');
{
  const d18 = wf('18-github-nobetcisi.json');
  const sorgular = kodu(d18, 'Sorguları Hazırla');
  const yenileri = kodu(d18, 'Yenileri Bul');
  const rapor = kodu(d18, 'Rapor Hazırla (GitHub)');

  const durumDosya = (durum) => ({ data: durum });
  const hazirla = (env, durum = { gorulen: [], sonCalisma: null }, elle = false) => {
    const d = { 'Durumu Oku (GitHub)': [{}], 'Durumu Çıkar (GitHub)': [durumDosya(durum)] };
    if (elle) d['Elle Test Et (GitHub)'] = [{}];
    return calistir(sorgular, { dugumler: d, girdi: [durumDosya(durum)], env });
  };
  const pr = (no, baslik, ek) => ({
    number: no, title: baslik, html_url: 'https://github.com/a/b/pull/' + no,
    repository_url: 'https://api.github.com/repos/a/b', user: { login: 'biri' },
    updated_at: '2026-09-01T00:00:00Z', ...ek,
  });
  const tara = (sonuclar, durum) => {
    const q = hazirla({ GITHUB_TOKEN: 't' }, durum).map((x) => x.json);
    const d = { 'Sorguları Hazırla': q, 'Durumu Çıkar (GitHub)': [durumDosya(durum)] };
    return calistir(yenileri, { dugumler: d, girdi: sonuclar })[0].json;
  };
  const bos = { total_count: 0, items: [] };

  dene('token yoksa zamanlanmış tur sessizce hiçbir şey yapmaz', () => {
    esit(hazirla({}).length, 0);
  });
  dene('token yoksa elle çalıştırmada anlaşılır hata verir', () => {
    let mesaj = '';
    try { hazirla({}, { gorulen: [], sonCalisma: null }, true); } catch (e) { mesaj = e.message; }
    if (!/GITHUB_TOKEN/.test(mesaj)) throw new Error('uyarı yok: ' + mesaj);
  });
  dene('5 sorgu hazırlanır; kullanıcı adı ayarlanabilir', () => {
    const r = hazirla({ GITHUB_TOKEN: 't', GITHUB_KULLANICI: 'yokbi' });
    esit(r.length, 5);
    if (!r[0].json.url.includes('review-requested%3Ayokbi')) throw new Error('kullanıcı adı geçmedi: ' + r[0].json.url);
    if (!r.every((x) => x.json.url.startsWith('https://api.github.com/search/issues?'))) throw new Error('adres hatalı');
  });
  dene('github-durum.json bozuk → taramaya başlamaz', () => {
    const d = { 'Durumu Oku (GitHub)': [{}], 'Durumu Çıkar (GitHub)': [{ error: { message: 'Unexpected end of JSON input' } }] };
    let attı = false;
    try { calistir(sorgular, { dugumler: d, girdi: [{}], env: { GITHUB_TOKEN: 't' } }); }
    catch (e) { attı = /github-durum\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
  dene('ilk tarama sessizdir (eski kayıtlar bildirilmez)', () => {
    const r = tara([{ total_count: 1, items: [pr(1, 'Eski PR')] }, bos, bos, bos, bos], { gorulen: [], sonCalisma: null });
    esit(r.gonderilecek, false, 'ilk turda bildirim gitti');
    esit(r.gorulen.length, 1); esit(r.yazilsin, true);
  });
  dene('ikinci turda yalnızca yeni kayıt bildirilir', () => {
    const durum = { gorulen: ['inceleme|https://github.com/a/b/pull/1'], sonCalisma: '2026-09-01T00:00:00Z' };
    const r = tara([{ total_count: 2, items: [pr(1, 'Eski PR'), pr(2, 'Yeni PR')] }, bos, bos, bos, bos], durum);
    esit(r.gonderilecek, true); esit(r.yeniSayisi, 1);
    if (r.text.includes('Eski PR')) throw new Error('görülen kayıt tekrar bildirildi');
    if (!r.text.includes('Yeni PR')) throw new Error('yeni kayıt yok: ' + r.text);
  });
  dene('taslak PR CI kategorisinde bildirilmez', () => {
    const durum = { gorulen: [], sonCalisma: '2026-09-01T00:00:00Z' };
    const r = tara([bos, { total_count: 1, items: [pr(9, 'Yarım iş', { draft: true })] }, bos, bos, bos], durum);
    esit(r.gonderilecek, false, 'taslak bildirildi');
    esit(r.gorulen.length, 1, 'taslak yine de işaretlenmeli');
  });
  dene('geçersiz token bir kez uyarır, sonra susar', () => {
    const durum = { gorulen: [], sonCalisma: '2026-09-01T00:00:00Z' };
    const hata = [{ error: { message: '401 - {"message":"Bad credentials"}' } }, bos, bos, bos, bos];
    const ilk = tara(hata, durum);
    esit(ilk.gonderilecek, true);
    if (!ilk.text.includes('GITHUB_TOKEN geçersiz')) throw new Error('uyarı metni yok: ' + ilk.text);
    const ikinci = tara(hata, { gorulen: ilk.gorulen, sonCalisma: '2026-09-02T00:00:00Z' });
    esit(ikinci.gonderilecek, false, 'aynı uyarı tekrar gitti');
  });
  dene('sorgu hata verirse o kategorinin işaretleri KORUNUR', () => {
    const anahtar = 'inceleme|https://github.com/a/b/pull/1';
    const durum = { gorulen: [anahtar], sonCalisma: '2026-09-01T00:00:00Z' };
    const r = tara([{ error: { message: 'API rate limit exceeded' } }, bos, bos, bos, bos], durum);
    if (!r.gorulen.includes(anahtar)) throw new Error('işaret kayboldu → sorun geçince tekrar bildirilirdi');
  });
  dene('/pr raporu son taramayı özetler', () => {
    const durum = { gorulen: [], sonCalisma: new Date().toISOString(), ozet: {
      inceleme: { ad: 'İncelemeni bekleyen PR', ikon: '🔍', kayitlar: [{ repo: 'a/b', no: 5, baslik: 'Şunu düzelt', url: 'u' }] },
    } };
    const d = { "Workflow 05'ten Çağrı (GitHub)": [{ chat_id: '42' }], 'Durumu Oku (Rapor)': [{}], 'Durumu Çıkar (Rapor)': [durumDosya(durum)] };
    const r = calistir(rapor, { dugumler: d, girdi: [durumDosya(durum)] })[0].json;
    if (!r.text.includes('a/b#5')) throw new Error('rapor eksik: ' + r.text);
    if (!r.text.includes('az önce')) throw new Error('tarama zamanı yok: ' + r.text);
  });
  dene('/pr bekleyen iş yoksa bunu söyler', () => {
    const durum = { gorulen: [], sonCalisma: new Date().toISOString(), ozet: {} };
    const d = { "Workflow 05'ten Çağrı (GitHub)": [{ chat_id: '42' }], 'Durumu Oku (Rapor)': [{}], 'Durumu Çıkar (Rapor)': [durumDosya(durum)] };
    const r = calistir(rapor, { dugumler: d, girdi: [durumDosya(durum)] })[0].json;
    if (!r.text.includes('bekleyen bir şey yok')) throw new Error('boş rapor hatalı: ' + r.text);
  });
}

// ═══ 19 — Kod parçacığı kasası ═══
console.log('19 — Kod parçacığı kasası');
{
  const d19 = wf('19-kod-parcacik-kasasi.json');
  const alKod = kodu(d19, 'İsteği Al (Kod)');
  const uygula = kodu(d19, 'İşlemi Uygula');
  const suz = kodu(d19, 'Listeyi Süz (Kod)');

  const kasa = (liste) => ({ data: { parcacikalar: liste || [] } });
  const cagir = (girdi, liste) => {
    const istek = calistir(alKod, { girdi: [girdi] })[0].json;
    const d = { 'İsteği Al (Kod)': [istek], 'Parçacıkları Oku': [{}], 'Parçacıkları Çıkar': [kasa(liste)] };
    return calistir(uygula, { dugumler: d, girdi: [kasa(liste)] })[0].json;
  };
  const ornek = [
    { id: 1, baslik: 'Docker temizlik', dil: 'bash', etiketler: ['docker'], kod: 'docker system prune -af', kullanim: 0 },
    { id: 2, baslik: 'Git geri al', dil: 'bash', etiketler: ['git'], kod: 'git reset --soft HEAD~1', kullanim: 5 },
  ];

  dene('webhook ile kaydedilir', () => {
    const r = cagir({ body: { baslik: 'Portu dinleyeni bul', dil: 'bash', etiket: 'ağ,port', kod: 'lsof -i :5678' } });
    esit(r.yazilsin, true); esit(r.parcacikalar.length, 1);
    esit(r.parcacikalar[0].etiketler.join(','), 'ağ,port');
    esit(r.webhooktan, true);
  });
  dene('Telegram\'dan çok satırlı kayıt: ilk satır başlık, gerisi kod', () => {
    const r = cagir({ komut: 'kaydet', chat_id: '42', metin: 'Docker temizlik #docker #bash\ndocker system prune -af\ndocker volume ls' }, []);
    const p = r.parcacikalar[0];
    esit(p.baslik, 'Docker temizlik');
    esit(p.etiketler.join(','), 'docker,bash');
    esit(p.kod, 'docker system prune -af\ndocker volume ls');
    esit(r.webhooktan, false); esit(r.chat_id, '42');
  });
  dene('başlıksız/kodsuz kayıt reddedilir, dosyaya yazılmaz', () => {
    const r = cagir({ komut: 'kaydet', chat_id: '42', metin: 'sadece başlık' }, []);
    esit(r.yazilsin, false); esit(r.hata, true);
  });
  dene('arama: başlık eşleşmesi kod içi eşleşmeden önce gelir', () => {
    const liste = [
      { id: 1, baslik: 'Rastgele not', dil: '', etiketler: [], kod: 'echo docker', kullanim: 0 },
      { id: 2, baslik: 'Docker temizlik', dil: 'bash', etiketler: ['docker'], kod: 'prune', kullanim: 0 },
    ];
    const r = cagir({ komut: 'ara', metin: 'docker', chat_id: '42' }, liste);
    esit(r.sonuc[0].id, 2, 'sıralama hatalı');
    esit(r.sonuc.length, 2);
    esit(r.yazilsin, false);
  });
  dene('getir: kodu kod bloğu olarak verir ve kullanım sayacını artırır', () => {
    const r = cagir({ komut: 'getir', metin: '1', chat_id: '42' }, ornek);
    esit(r.yazilsin, true);
    esit(r.parcacikalar[0].kullanim, 1);
    if (!r.telegramText.includes('<pre><code>')) throw new Error('kod bloğu yok: ' + r.telegramText);
    if (!r.mesaj.includes('docker system prune -af')) throw new Error('kod yok');
  });
  dene('getir: HTML işaretleri kaçırılır (mesaj bozulmaz)', () => {
    const liste = [{ id: 1, baslik: 'XML', dil: 'xml', etiketler: [], kod: '<a href="x">&y</a>', kullanim: 0 }];
    const r = cagir({ komut: 'getir', metin: '1' }, liste);
    if (r.telegramText.includes('<a href')) throw new Error('ham HTML sızdı');
    if (!r.telegramText.includes('&lt;a href=')) throw new Error('kaçırma yapılmadı: ' + r.telegramText);
  });
  dene('olmayan numara: hata verir, kasaya dokunmaz', () => {
    const r = cagir({ komut: 'getir', metin: '99' }, ornek);
    esit(r.hata, true); esit(r.yazilsin, false); esit(r.parcacikalar.length, 2);
  });
  dene('sil: kayıt gider, liste yazılır', () => {
    const r = cagir({ komut: 'sil', metin: '2' }, ornek);
    esit(r.yazilsin, true); esit(r.parcacikalar.length, 1); esit(r.parcacikalar[0].id, 1);
  });
  dene('liste: en çok kullanılan önce', () => {
    const r = cagir({ komut: 'liste' }, ornek);
    const satirlar = r.mesaj.split('\n');
    if (!satirlar[1].includes('#2')) throw new Error('sıralama hatalı: ' + r.mesaj);
  });
  dene('parcacikalar.json bozuk → durur (kasayı silmez)', () => {
    const istek = calistir(alKod, { girdi: [{ komut: 'liste' }] })[0].json;
    const d = { 'İsteği Al (Kod)': [istek], 'Parçacıkları Oku': [{}], 'Parçacıkları Çıkar': [{ error: { message: 'Unexpected token' } }] };
    let attı = false;
    try { calistir(uygula, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /parcacikalar\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
  dene('GET /webhook/kodlar?id=1&sade=1 yalnızca kodu döndürür', () => {
    const d = { 'Parçacık Listesi (Webhook GET)': [{ query: { id: '1', sade: '1' } }],
                'Parçacıkları Oku (Liste)': [{}], 'Parçacıkları Çıkar (Liste)': [kasa(ornek)] };
    const r = calistir(suz, { dugumler: d, girdi: [kasa(ornek)] })[0].json;
    esit(r.sade, true); esit(r.govde, 'docker system prune -af');
  });
  dene('GET /webhook/kodlar?ara=git süzer', () => {
    const d = { 'Parçacık Listesi (Webhook GET)': [{ query: { ara: 'git' } }],
                'Parçacıkları Oku (Liste)': [{}], 'Parçacıkları Çıkar (Liste)': [kasa(ornek)] };
    const r = calistir(suz, { dugumler: d, girdi: [kasa(ornek)] })[0].json;
    esit(r.govde.length, 1); esit(r.govde[0].id, 2);
  });
}

// ═══ 20 — Geliştirici araç kutusu ═══
console.log('20 — Geliştirici araç kutusu');
{
  const d20 = wf('20-gelistirici-arac-kutusu.json');
  const alArac = kodu(d20, 'İsteği Al (Araç)');
  const calistirArac = kodu(d20, 'Aracı Çalıştır');
  const arac = (girdi) => {
    const istek = calistir(alArac, { girdi: [girdi] })[0].json;
    return calistir(calistirArac, { girdi: [istek] })[0].json;
  };
  const telegram = (metin) => arac({ metin, chat_id: '42' });

  dene('SHA-256 bilinen değerle uyuşuyor', () => {
    esit(telegram('sha256 abc').sonuc, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  dene('base64 Türkçe karakterlerle gidip geliyor', () => {
    const kodlu = telegram('b64kodla merhaba dünya').sonuc;
    esit(kodlu, 'bWVyaGFiYSBkw7xueWE=');
    esit(telegram('b64coz ' + kodlu).sonuc, 'merhaba dünya');
    if (!telegram('b64 ' + kodlu).sonuc.includes('merhaba dünya')) throw new Error('otomatik çözme çalışmadı');
  });
  dene('JWT açılır ve süresi geçmişse söylenir', () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = b64({ alg: 'HS256' }) + '.' + b64({ sub: '1', exp: Math.floor(Date.now() / 1000) - 60 }) + '.imza';
    const r = telegram('jwt ' + token);
    esit(r.basarili, true);
    if (!r.sonuc.includes('⛔ Süresi GEÇMİŞ')) throw new Error('süre denetimi yok: ' + r.sonuc);
    if (!r.sonuc.includes('imza doğrulanmadı')) throw new Error('imza uyarısı yok');
  });
  dene('JWT olmayan girdi anlaşılır hata verir', () => {
    const r = telegram('jwt selam');
    esit(r.basarili, false);
    if (!r.sonuc.includes('JWT değil')) throw new Error('hata metni: ' + r.sonuc);
  });
  dene('cron Türkçe açıklanır ve sonraki çalışmalar hesaplanır', () => {
    const r = telegram('cron 0 */4 * * *');
    if (!r.sonuc.includes('her 4 saatte bir')) throw new Error('açıklama: ' + r.sonuc);
    esit(r.sonuc.split('•').length - 1, 3, 'sonraki çalışma sayısı');
    const haftaici = telegram('cron 30 9 * * 1-5').sonuc;
    if (!haftaici.includes('09:30') || !haftaici.includes('Pazartesi-Cuma')) throw new Error('hafta içi: ' + haftaici);
  });
  dene('geçersiz cron alanı reddedilir', () => {
    const r = telegram('cron 99 * * * *');
    esit(r.basarili, false);
    if (!r.sonuc.includes('0-59')) throw new Error('aralık uyarısı yok: ' + r.sonuc);
    esit(telegram('cron 0 9 * *').basarili, false, '4 alanlı ifade kabul edildi');
  });
  dene('bozuk JSON satır ve sütun bildirir', () => {
    const r = telegram('json {"a":1,}');
    esit(r.basarili, false);
    if (!r.sonuc.includes('Satır 1')) throw new Error('konum yok: ' + r.sonuc);
  });
  dene('geçerli JSON biçimlendirilir', () => {
    const r = telegram('json {"a":[1,2]}');
    esit(r.basarili, true);
    if (!r.sonuc.includes('"a": [')) throw new Error('biçimlendirme yok');
  });
  dene('zaman: epoch → ISO ve yerel saat', () => {
    const r = telegram('zaman 1735689600');
    if (!r.sonuc.includes('2025-01-01T00:00:00.000Z')) throw new Error('ISO yok: ' + r.sonuc);
    if (!r.sonuc.includes('epoch (ms): 1735689600000')) throw new Error('ms yok');
  });
  dene('slug Türkçe karakterleri çevirir', () => {
    esit(telegram('slug Çağrı Günlüğü — İlk Adım!').sonuc, 'cagri-gunlugu-ilk-adim');
  });
  dene('uuid v4 biçiminde üretilir', () => {
    const uuid = telegram('uuid').sonuc.split('\n')[0];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)) {
      throw new Error('biçim hatalı: ' + uuid);
    }
  });
  dene('parola istenen uzunlukta üretilir', () => {
    esit(telegram('parola 24').sonuc.split('\n')[0].length, 24);
  });
  dene('bilinmeyen işlem yardım listesi döndürür', () => {
    const r = telegram('şapşal');
    esit(r.basarili, false);
    if (!r.sonuc.includes('kullanılabilir işlemler')) throw new Error('yardım yok');
  });
  dene('webhook isteği (body/query) de çalışır', () => {
    esit(arac({ body: { islem: 'sha256', veri: 'abc' } }).webhooktan, true);
    const q = arac({ query: { islem: 'slug', veri: 'Merhaba Dünya' }, body: {} });
    esit(q.sonuc, 'merhaba-dunya'); esit(q.webhooktan, true);
  });
  dene('Telegram yanıtı kod bloğu olarak kaçırılır', () => {
    const r = telegram('json {"a":"<b>"}');
    if (!r.telegramText.startsWith('<pre>')) throw new Error('kod bloğu yok');
    if (r.telegramText.includes('"<b>"')) throw new Error('ham HTML sızdı: ' + r.telegramText);
  });
}

// ═══ 21 — Webhook yakalayıcı ═══
console.log('21 — Webhook yakalayıcı');
{
  const d21 = wf('21-webhook-yakalayici.json');
  const gelen = kodu(d21, 'Gelen İsteği Al');
  const kaydet = kodu(d21, 'İsteği Kaydet');
  const rapor = kodu(d21, 'İstek Raporu');
  const suz = kodu(d21, 'Listeyi Süz (İstek)');

  const istekDosya = (liste) => ({ data: { istekler: liste || [] } });
  const yakala = (girdi, getMi) => {
    const dugumler = getMi ? { 'İstek Yakala (GET)': [{}] } : {};
    return calistir(gelen, { dugumler, girdi: [girdi] })[0].json;
  };
  const kaydetIstek = (g, liste) => {
    const d = { 'Gelen İsteği Al': [g], 'Yakalananları Oku': [{}], 'Yakalananları Çıkar': [istekDosya(liste)] };
    return calistir(kaydet, { dugumler: d, girdi: [istekDosya(liste)] })[0].json;
  };

  dene('POST isteği çözülür, gövde JSON olarak saklanır', () => {
    const g = yakala({ headers: { 'content-type': 'application/json' }, query: { etiket: 'stripe' }, body: { olay: 'odeme' } });
    esit(g.yontem, 'POST'); esit(g.etiket, 'stripe'); esit(g.govdeTipi, 'json');
    if (!g.govde.includes('"olay": "odeme"')) throw new Error('gövde yok: ' + g.govde);
  });
  dene('GET webhook\'u tetiklerse yöntem GET olur', () => {
    esit(yakala({ headers: {}, query: {}, body: {} }, true).yontem, 'GET');
  });
  dene('gizli başlıklar maskelenir (telefona düşen metinde anahtar olmaz)', () => {
    const g = yakala({ headers: {
      authorization: 'Bearer sk_live_1234567890abcdef',
      'x-api-key': 'gizli-anahtar-degeri',
      'x-stripe-signature': 't=1,v1=abcdef1234567890',
      'user-agent': 'curl/8.0',
    }, query: {}, body: {} });
    if (JSON.stringify(g.basliklar).includes('sk_live_1234567890abcdef')) throw new Error('token sızdı');
    if (JSON.stringify(g.basliklar).includes('gizli-anahtar-degeri')) throw new Error('api anahtarı sızdı');
    if (JSON.stringify(g.basliklar).includes('v1=abcdef1234567890')) throw new Error('imza sızdı');
    esit(g.basliklar['user-agent'], 'curl/8.0', 'zararsız başlık maskelenmiş');
  });
  dene('yanıt kodu ?kod= ile seçilir ve sınırlanır', () => {
    esit(yakala({ headers: {}, query: { kod: '500' }, body: {} }).kod, 500);
    esit(yakala({ headers: {}, query: { kod: '9999' }, body: {} }).kod, 599);
    esit(yakala({ headers: {}, query: {}, body: {} }).kod, 200);
  });
  dene('uzun gövde kırpılır ama boyutu kaydedilir', () => {
    const g = yakala({ headers: {}, query: {}, body: 'x'.repeat(5000) });
    esit(g.boyut, 5000);
    if (g.govde.length > 4100) throw new Error('kırpılmadı');
    if (!g.govde.includes('kırpıldı')) throw new Error('kırpma bildirilmedi');
  });
  dene('istek listeye eklenir, numara verilir', () => {
    const r = kaydetIstek(yakala({ headers: {}, query: {}, body: { a: 1 } }), []);
    esit(r.id, 1); esit(r.istekler.length, 1); esit(r.yazilsin, true);
  });
  dene('yalnızca son 50 istek tutulur', () => {
    const eski = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, zaman: '2026-01-01T00:00:00Z', yontem: 'POST', boyut: 0 }));
    const r = kaydetIstek(yakala({ headers: {}, query: {}, body: {} }), eski);
    esit(r.istekler.length, 50);
    esit(r.istekler[0].id, 2, 'en eski kayıt düşmedi');
    esit(r.id, 51);
  });
  dene('yakalanan-istekler.json bozuk → yazmaz, durur', () => {
    const d = { 'Gelen İsteği Al': [yakala({ headers: {}, query: {}, body: {} })], 'Yakalananları Oku': [{}],
                'Yakalananları Çıkar': [{ error: { message: 'Unexpected token' } }] };
    let attı = false;
    try { calistir(kaydet, { dugumler: d, girdi: [{}] }); } catch (e) { attı = /yakalanan-istekler\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
  const kayitlar = [
    { id: 1, zaman: new Date().toISOString(), yontem: 'POST', etiket: 'stripe', sorgu: { etiket: 'stripe' },
      basliklar: { 'content-type': 'application/json' }, govdeTipi: 'json', boyut: 20, govde: '{"a":1}' },
    { id: 2, zaman: new Date().toISOString(), yontem: 'GET', etiket: '', sorgu: {}, basliklar: {}, govdeTipi: 'yok', boyut: 0, govde: '' },
  ];
  const raporla = (cagri, liste) => {
    const d = { "Workflow 05'ten Çağrı (İstek)": [cagri], 'Yakalananları Oku (Rapor)': [{}],
                'Yakalananları Çıkar (Rapor)': [istekDosya(liste)] };
    const r = calistir(rapor, { dugumler: d, girdi: [istekDosya(liste)] });
    return r.length ? r[0].json : null;
  };
  dene('/istekler son istekleri özetler (yeni en üstte)', () => {
    const r = raporla({ chat_id: '42', komut: 'liste' }, kayitlar);
    if (!r.text.includes('#2')) throw new Error('liste yok: ' + r.text);
    if (r.text.indexOf('#2') > r.text.indexOf('#1')) throw new Error('sıralama ters');
    esit(r.yazilsin, false);
  });
  dene('/istek 1 ayrıntıyı kod bloğunda verir', () => {
    const r = raporla({ chat_id: '42', komut: 'detay', id: 1 }, kayitlar);
    if (!r.text.includes('<pre>')) throw new Error('kod bloğu yok');
    if (!r.text.includes('content-type')) throw new Error('başlıklar yok');
    esit(r.yazilsin, false);
  });
  dene('/istektemizle listeyi boşaltır ve dosyaya yazar', () => {
    const r = raporla({ chat_id: '42', komut: 'temizle' }, kayitlar);
    esit(r.yazilsin, true); esit(r.istekler.length, 0);
    if (!r.text.includes('2 kayıt silindi')) throw new Error('mesaj: ' + r.text);
  });
  dene('chat_id yoksa mesaj gönderilmez', () => {
    esit(raporla({ komut: 'liste' }, kayitlar), null);
  });
  dene('GET /webhook/istekler süzme ve adet çalışır', () => {
    const d = { 'İstek Listesi (Webhook GET)': [{ query: { etiket: 'stripe' } }], 'Yakalananları Oku (Liste)': [{}],
                'Yakalananları Çıkar (Liste)': [istekDosya(kayitlar)] };
    const r = calistir(suz, { dugumler: d, girdi: [istekDosya(kayitlar)] })[0].json;
    esit(r.govde.length, 1); esit(r.govde[0].id, 1);
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

// ═══ 22 — Alışkanlık takibi ═══
console.log('22 — Alışkanlık takibi');
{
  const d22 = wf('22-aliskanlik-takibi.json');
  const istekKod = kodu(d22, 'İsteği Al (Alışkanlık)');
  const islemKod = kodu(d22, 'İşlemi Uygula (Alışkanlık)');
  const aksamKod = kodu(d22, 'Eksikleri Bul');
  const iki = (n) => String(n).padStart(2, '0');
  const gun = (fark) => { const d = new Date(); d.setDate(d.getDate() + fark); return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate()); };
  const istek = (govde) => calistir(istekKod, { girdi: [govde] })[0].json;
  const islem = (metin, aliskanliklar, ek = {}) => {
    const d = {
      'İsteği Al (Alışkanlık)': [istek({ chat_id: 42, metin })],
      'Alışkanlıkları Oku': [ek.okuHata ? { error: ek.okuHata } : {}],
      'Alışkanlıkları Çıkar': [ek.cikarHata ? { error: ek.cikarHata } : {}],
    };
    return calistir(islemKod, { dugumler: d, girdi: [{ data: { aliskanliklar, sonHatirlatma: 'x' } }] })[0].json;
  };

  dene('istek: "yaptim 2 dün" → işlem, numara ve dün ayrışır', () => {
    const r = istek({ chat_id: 1, metin: 'yaptim 2 dün' });
    esit(r.islem, 'yaptim'); esit(r.arg, '2'); esit(r.dun, true); esit(r.webhooktan, false);
  });
  dene('istek: webhook boş gövde → liste; yapılandırılmış alanlar da olur', () => {
    esit(istek({ body: {} }).islem, 'liste');
    const r = istek({ body: { islem: 'yaptim', id: 2, gun: 'dun' } });
    esit(r.islem, 'yaptim'); esit(r.arg, '2'); esit(r.dun, true); esit(r.webhooktan, true);
  });
  dene('dosya yokken ekle → #1 oluşur, yazılır', () => {
    const r = islem('ekle Su iç', [], { okuHata: { message: 'ENOENT: no such file' } });
    esit(r.yazilsin, true); esit(r.aliskanliklar.length, 1);
    esit(r.aliskanliklar[0].id, 1); esit(r.aliskanliklar[0].ad, 'Su iç');
  });
  dene('aliskanliklar.json BOZUK → durur (üzerine yazmaz)', () => {
    let attı = false;
    try { islem('ekle x', [], { cikarHata: { message: 'Unexpected token' } }); }
    catch (e) { attı = /aliskanliklar\.json okunamadı/.test(e.message); }
    if (!attı) throw new Error('bozuk dosyada durmadı');
  });
  dene('yaptim → bugün işaretlenir, seri dünden devam eder', () => {
    const r = islem('yaptim 1', [{ id: 1, ad: 'Kitap', gunler: [gun(-2), gun(-1)] }]);
    esit(r.yazilsin, true);
    if (!r.aliskanliklar[0].gunler.includes(gun(0))) throw new Error('bugün işaretlenmedi');
    esit(r.sonuc[0].seri, 3);
    if (!r.mesaj.includes('Seri: 3 gün')) throw new Error('mesaj: ' + r.mesaj);
  });
  dene('bugün işaretsizken seri dünden sayılır (gün bitmeden bozulmaz)', () => {
    const r = islem('', [{ id: 1, ad: 'Kitap', gunler: [gun(-3), gun(-2), gun(-1)] }]);
    esit(r.sonuc[0].seri, 3); esit(r.sonuc[0].bugun, false); esit(r.yazilsin, false);
    if (!r.mesaj.includes('⬜ #1 Kitap')) throw new Error('liste: ' + r.mesaj);
  });
  dene('arada boşluk varsa seri kırılır, rekor korunur', () => {
    const r = islem('', [{ id: 1, ad: 'Kitap', gunler: [gun(-6), gun(-5), gun(-4), gun(-3), gun(-1)] }]);
    esit(r.sonuc[0].seri, 1); esit(r.sonuc[0].rekor, 4); esit(r.sonuc[0].son7, '●●●●○●○');
  });
  dene('"yaptim su dün" adla bulur ve dünü işaretler', () => {
    const r = islem('yaptim su dün', [{ id: 1, ad: 'Kitap', gunler: [] }, { id: 2, ad: 'Su iç', gunler: [] }]);
    esit(r.aliskanliklar[1].gunler.join(), gun(-1)); esit(r.aliskanliklar[0].gunler.length, 0);
  });
  dene('aynı gün iki kez yaptim → dosyaya yazılmaz', () => {
    const r = islem('yaptim 1', [{ id: 1, ad: 'Kitap', gunler: [gun(0)] }]);
    esit(r.yazilsin, false);
    if (!r.mesaj.includes('zaten işaretli')) throw new Error(r.mesaj);
  });
  dene('geri ve sil', () => {
    const g = islem('geri 1', [{ id: 1, ad: 'Kitap', gunler: [gun(-1), gun(0)] }]);
    esit(g.aliskanliklar[0].gunler.join(), gun(-1)); esit(g.yazilsin, true);
    const s = islem('sil 1', [{ id: 1, ad: 'Kitap', gunler: [] }]);
    esit(s.aliskanliklar.length, 0); esit(s.yazilsin, true);
  });
  dene('bulunamayan alışkanlık → hata, yazma yok', () => {
    const r = islem('yaptim 9', [{ id: 1, ad: 'Kitap', gunler: [] }]);
    esit(r.hata, true); esit(r.yazilsin, false);
  });
  dene('en fazla 400 gün tutulur', () => {
    const cok = Array.from({ length: 450 }, (_, i) => gun(-450 + i));
    const r = islem('yaptim 1', [{ id: 1, ad: 'Kitap', gunler: cok }]);
    esit(r.aliskanliklar[0].gunler.length, 400);
    esit(r.aliskanliklar[0].gunler[399], gun(0));
  });

  const aksam = (aliskanliklar, sonHatirlatma, elle) => {
    const d = { 'Alışkanlıkları Oku (Akşam)': [{}], 'Alışkanlıkları Çıkar (Akşam)': [{}] };
    if (elle) d['Elle Test Et (Alışkanlık)'] = [{}];
    return calistir(aksamKod, { dugumler: d, girdi: [{ data: { aliskanliklar, sonHatirlatma } }] })[0].json;
  };
  dene('akşam: eksik varsa hatırlatır, seriyi söyler, günü işaretler', () => {
    const r = aksam([{ id: 1, ad: 'Kitap', gunler: [gun(-2), gun(-1)] }, { id: 2, ad: 'Su', gunler: [gun(0)] }], null);
    esit(r.gonderilecek, true); esit(r.yazilsin, true);
    if (!r.text.includes('#1 Kitap — 🔥 2 günlük seri')) throw new Error(r.text);
    if (r.text.includes('#2 Su')) throw new Error('yapılan alışkanlık listelendi');
    esit(r.govde.sonHatirlatma, gun(0));
  });
  dene('akşam: hepsi tamamsa sessiz', () => {
    esit(aksam([{ id: 1, ad: 'Kitap', gunler: [gun(0)] }], null).gonderilecek, false);
    esit(aksam([], null).gonderilecek, false);
  });
  dene('akşam: aynı gün ikinci kez göndermez, elle testte gönderir', () => {
    const l = [{ id: 1, ad: 'Kitap', gunler: [] }];
    esit(aksam(l, gun(0)).gonderilecek, false);
    esit(aksam(l, gun(0), true).gonderilecek, true);
  });
}

// ═══ Yapı — tüm workflow dosyaları ═══
// Code düğümü dışındaki hataları yakalar: bozuk konum, dosya yolu yerine sayı
// yazılmış okuma düğümü (ifade "=" ile başlarsa serbest), var olmayan düğüme giden bağlantı, tekrarlanan ad.
console.log('Yapı — tüm workflow dosyaları');
for (const dosya of fs.readdirSync('workflows').filter((f) => f.endsWith('.json')).sort()) {
  dene(dosya, () => {
    const d = wf(dosya);
    const adlar = new Set();
    for (const n of d.nodes) {
      if (adlar.has(n.name)) throw new Error('aynı ad iki kez: ' + n.name);
      adlar.add(n.name);
      if (!Array.isArray(n.position) || n.position.length !== 2 || !n.position.every(Number.isFinite)) {
        throw new Error(n.name + ': konum bozuk ' + JSON.stringify(n.position));
      }
      if (n.type === 'n8n-nodes-base.readWriteFile') {
        const yol = n.parameters.operation === 'write' ? n.parameters.fileName : n.parameters.fileSelector;
        if (typeof yol !== 'string' || !(yol.startsWith('/files/') || yol.startsWith('='))) {
          throw new Error(n.name + ': dosya yolu /files/ ile başlamıyor → ' + JSON.stringify(yol));
        }
      }
    }
    for (const [kaynak, c] of Object.entries(d.connections || {})) {
      if (!adlar.has(kaynak)) throw new Error('bağlantı kaynağı yok: ' + kaynak);
      for (const cikis of c.main || []) for (const h of cikis || []) {
        if (!adlar.has(h.node)) throw new Error('bağlantı hedefi yok: ' + kaynak + ' → ' + h.node);
      }
    }
  });
}

console.log('\nBaşarılı: ' + basari + '   Hatalı: ' + hata);
process.exit(hata ? 1 : 0);
