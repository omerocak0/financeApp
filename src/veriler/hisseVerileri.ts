export type Kategori = 'BIST' | 'ABD' | 'Maden' | 'Döviz' | 'Kripto';

export interface HisseSenedi {
  sembol: string;
  sirketAdi: string;
  kategori: Kategori;
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

function bosHisse(sembol: string, sirketAdi: string, para: 'USD' | 'TRY', kategori: Kategori): HisseSenedi {
  return {
    sembol, sirketAdi, para, kategori,
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
  // BIST
  bosHisse('THYAO', 'Türk Hava Yolları', 'TRY', 'BIST'),
  bosHisse('ASELS', 'Aselsan A.Ş.', 'TRY', 'BIST'),
  bosHisse('KCHOL', 'Koç Holding', 'TRY', 'BIST'),
  bosHisse('TUPRS', 'Tüpraş', 'TRY', 'BIST'),
  bosHisse('BIMAS', 'BİM Birleşik Mağazalar', 'TRY', 'BIST'),
  bosHisse('EREGL', 'Ereğli Demir Çelik', 'TRY', 'BIST'),
  bosHisse('GARAN', 'Garanti BBVA', 'TRY', 'BIST'),
  bosHisse('AKBNK', 'Akbank', 'TRY', 'BIST'),
  bosHisse('YKBNK', 'Yapı Kredi', 'TRY', 'BIST'),
  bosHisse('ISCTR', 'İş Bankası', 'TRY', 'BIST'),
  bosHisse('SISE', 'Şişecam', 'TRY', 'BIST'),
  bosHisse('SASA', 'SASA Polyester', 'TRY', 'BIST'),
  bosHisse('HEKTS', 'Hektaş', 'TRY', 'BIST'),
  bosHisse('KRDMD', 'Kardemir', 'TRY', 'BIST'),
  bosHisse('PETKM', 'Petkim', 'TRY', 'BIST'),
  
  // ABD
  bosHisse('AAPL', 'Apple Inc.', 'USD', 'ABD'),
  bosHisse('MSFT', 'Microsoft Corp.', 'USD', 'ABD'),
  bosHisse('NVDA', 'NVIDIA Corp.', 'USD', 'ABD'),
  bosHisse('TSLA', 'Tesla Inc.', 'USD', 'ABD'),
  bosHisse('GOOGL', 'Alphabet Inc.', 'USD', 'ABD'),
  bosHisse('AMZN', 'Amazon.com Inc.', 'USD', 'ABD'),
  bosHisse('META', 'Meta Platforms', 'USD', 'ABD'),
  bosHisse('NFLX', 'Netflix Inc.', 'USD', 'ABD'),
  bosHisse('AMD', 'Advanced Micro Devices', 'USD', 'ABD'),
  bosHisse('INTC', 'Intel Corp.', 'USD', 'ABD'),
  bosHisse('BA', 'Boeing Co.', 'USD', 'ABD'),
  bosHisse('DIS', 'Walt Disney Co.', 'USD', 'ABD'),
  bosHisse('KO', 'Coca-Cola Co.', 'USD', 'ABD'),
  bosHisse('PEP', 'PepsiCo Inc.', 'USD', 'ABD'),
  bosHisse('V', 'Visa Inc.', 'USD', 'ABD'),

  // Maden
  bosHisse('GC=F', 'Altın (Ons)', 'USD', 'Maden'),
  bosHisse('SI=F', 'Gümüş (Ons)', 'USD', 'Maden'),
  bosHisse('PL=F', 'Platin', 'USD', 'Maden'),
  bosHisse('PA=F', 'Paladyum', 'USD', 'Maden'),
  bosHisse('HG=F', 'Bakır', 'USD', 'Maden'),
  bosHisse('CL=F', 'Ham Petrol (WTI)', 'USD', 'Maden'),
  bosHisse('BZ=F', 'Brent Petrol', 'USD', 'Maden'),
  bosHisse('NG=F', 'Doğalgaz', 'USD', 'Maden'),
  bosHisse('ZC=F', 'Mısır', 'USD', 'Maden'),
  bosHisse('ZW=F', 'Buğday', 'USD', 'Maden'),

  // Döviz
  bosHisse('TRY=X', 'USD/TRY', 'TRY', 'Döviz'),
  bosHisse('EURTRY=X', 'EUR/TRY', 'TRY', 'Döviz'),
  bosHisse('EURUSD=X', 'EUR/USD', 'USD', 'Döviz'),
  bosHisse('GBPUSD=X', 'GBP/USD', 'USD', 'Döviz'),
  bosHisse('USDJPY=X', 'USD/JPY', 'USD', 'Döviz'),
  bosHisse('AUDUSD=X', 'AUD/USD', 'USD', 'Döviz'),
  bosHisse('USDCAD=X', 'USD/CAD', 'USD', 'Döviz'),
  bosHisse('USDCHF=X', 'USD/CHF', 'USD', 'Döviz'),
  bosHisse('GBPTRY=X', 'GBP/TRY', 'TRY', 'Döviz'),
  bosHisse('CHFTRY=X', 'CHF/TRY', 'TRY', 'Döviz'),

  // Kripto
  bosHisse('BTC-USD', 'Bitcoin', 'USD', 'Kripto'),
  bosHisse('ETH-USD', 'Ethereum', 'USD', 'Kripto'),
  bosHisse('SOL-USD', 'Solana', 'USD', 'Kripto'),
  bosHisse('BNB-USD', 'Binance Coin', 'USD', 'Kripto'),
  bosHisse('XRP-USD', 'XRP', 'USD', 'Kripto'),
  bosHisse('ADA-USD', 'Cardano', 'USD', 'Kripto'),
  bosHisse('DOGE-USD', 'Dogecoin', 'USD', 'Kripto'),
  bosHisse('DOT-USD', 'Polkadot', 'USD', 'Kripto'),
  bosHisse('MATIC-USD', 'Polygon', 'USD', 'Kripto'),
  bosHisse('SHIB-USD', 'Shiba Inu', 'USD', 'Kripto'),
  bosHisse('AVAX-USD', 'Avalanche', 'USD', 'Kripto'),
  bosHisse('LINK-USD', 'Chainlink', 'USD', 'Kripto'),
];

export function hisseAra(sorgu: string): HisseSenedi[] {
  const k = sorgu.toLowerCase();
  return VARSAYILAN_HISSELER.filter(h =>
    h.sembol.toLowerCase().includes(k) || h.sirketAdi.toLowerCase().includes(k)
  );
}
