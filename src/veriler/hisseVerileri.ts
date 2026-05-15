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

function bosHisse(sembol: string, sirketAdi: string, para: 'USD' | 'TRY'): HisseSenedi {
  return {
    sembol, sirketAdi, para,
    fiyat: 0,
    degisim: 0,
    degisimYuzde: 0,
    hacim: 0,
    piyasaDegeri: 0,
    gunlukYuksek: 0,
    gunlukDusuk: 0,
    haftaBirYuksek: 0,
    haftaBirDusuk: 0,
    mum: [],
    cizgi: [],
  };
}

export const VARSAYILAN_HISSELER: HisseSenedi[] = [
  bosHisse('THYAO', 'Türk Hava Yolları', 'TRY'),
  bosHisse('ASELS', 'Aselsan A.Ş.', 'TRY'),
  bosHisse('KCHOL', 'Koç Holding', 'TRY'),
  bosHisse('TUPRS', 'Tüpraş', 'TRY'),
  bosHisse('BIMAS', 'BİM Birleşik Mağazalar', 'TRY'),
  bosHisse('EREGL', 'Ereğli Demir Çelik', 'TRY')
];

export function hisseAra(sorgu: string): HisseSenedi[] {
  const k = sorgu.toLowerCase();
  return VARSAYILAN_HISSELER.filter(h =>
    h.sembol.toLowerCase().includes(k) || h.sirketAdi.toLowerCase().includes(k)
  );
}
