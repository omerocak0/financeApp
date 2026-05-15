export interface HisseSenedi {
  sembol: string;
  sirketAdi: string;
  fiyat: number;
  para: 'USD' | 'TRY';
  degisim: number;
  degisimYuzde: number;
  hacim: number;
  piyasaDegeri: number;
  gunlukYuksek: number;
  gunlukDusuk: number;
  haftaBirYuksek: number;
  haftaBirDusuk: number;
  mum: MumVerisi[];
  cizgi: CizgiVerisi[];
}

export interface MumVerisi {
  tarih: string;
  acilis: number;
  kapanis: number;
  yuksek: number;
  dusuk: number;
  hacim: number;
}

export interface CizgiVerisi {
  tarih: string;
  fiyat: number;
}

function mumVerisiUret(basFiyat: number, gun: number): MumVerisi[] {
  const veriler: MumVerisi[] = [];
  let f = basFiyat;
  const bugun = new Date();
  for (let i = gun; i >= 0; i--) {
    const t = new Date(bugun);
    t.setDate(bugun.getDate() - i);
    const ac = f;
    const kp = parseFloat((ac * (1 + (Math.random() - 0.48) * 0.03)).toFixed(2));
    const yk = parseFloat((Math.max(ac, kp) * (1 + Math.random() * 0.012)).toFixed(2));
    const dk = parseFloat((Math.min(ac, kp) * (1 - Math.random() * 0.012)).toFixed(2));
    veriler.push({ tarih: t.toISOString().split('T')[0], acilis: ac, kapanis: kp, yuksek: yk, dusuk: dk, hacim: Math.floor(Math.random() * 50000000 + 5000000) });
    f = kp;
  }
  return veriler;
}

function hisseOlustur(sembol: string, sirketAdi: string, taban: number, para: 'USD' | 'TRY', piyasaDegeri: number): HisseSenedi {
  const mumlar = mumVerisiUret(taban, 1825);
  const son = mumlar[mumlar.length - 1];
  const onceki = mumlar[mumlar.length - 2];
  const degisim = parseFloat((son.kapanis - onceki.kapanis).toFixed(2));
  const fiyatlar = mumlar.map(m => m.kapanis);
  return {
    sembol, sirketAdi, para,
    fiyat: son.kapanis,
    degisim,
    degisimYuzde: parseFloat(((degisim / onceki.kapanis) * 100).toFixed(2)),
    hacim: son.hacim,
    piyasaDegeri,
    gunlukYuksek: son.yuksek,
    gunlukDusuk: son.dusuk,
    haftaBirYuksek: Math.max(...fiyatlar),
    haftaBirDusuk: Math.min(...fiyatlar),
    mum: mumlar,
    cizgi: mumlar.map(m => ({ tarih: m.tarih, fiyat: m.kapanis })),
  };
}

export const VARSAYILAN_HISSELER: HisseSenedi[] = [
  hisseOlustur('AAPL',  'Apple Inc.',             189.5,  'USD', 2920000000000),
  hisseOlustur('MSFT',  'Microsoft Corp.',         415.2,  'USD', 3080000000000),
  hisseOlustur('GOOGL', 'Alphabet Inc.',            174.8,  'USD', 2190000000000),
  hisseOlustur('NVDA',  'NVIDIA Corp.',             875.4,  'USD', 2160000000000),
  hisseOlustur('TSLA',  'Tesla Inc.',               248.7,  'USD',  793000000000),
  hisseOlustur('META',  'Meta Platforms',           505.6,  'USD', 1290000000000),
  hisseOlustur('AMZN',  'Amazon.com Inc.',          198.3,  'USD', 2080000000000),
  hisseOlustur('THYAO', 'Türk Hava Yolları',        268.4,  'TRY',  360000000000),
  hisseOlustur('GARAN', 'Garanti BBVA',              88.6,  'TRY',  374000000000),
  hisseOlustur('ASELS', 'Aselsan A.Ş.',             178.2,  'TRY',  180000000000),
  hisseOlustur('SAHOL', 'Sabancı Holding',           96.4,  'TRY',  212000000000),
  hisseOlustur('EREGL', 'Ereğli Demir Çelik',        58.3,  'TRY',  210000000000),
  hisseOlustur('KCHOL', 'Koç Holding',              188.6,  'TRY',  498000000000),
  hisseOlustur('BIMAS', 'BİM Birleşik Mağazalar',   510.5,  'TRY',  213000000000),
  hisseOlustur('TUPRS', 'Tüpraş',                   224.8,  'TRY',  168000000000),
  hisseOlustur('AKBNK', 'Akbank T.A.Ş.',             72.1,  'TRY',  304000000000),
];

export function hisseAra(sorgu: string): HisseSenedi[] {
  const k = sorgu.toLowerCase();
  return VARSAYILAN_HISSELER.filter(h =>
    h.sembol.toLowerCase().includes(k) || h.sirketAdi.toLowerCase().includes(k)
  );
}
