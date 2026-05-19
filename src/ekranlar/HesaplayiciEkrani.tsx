import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Modal, ScrollView, TextInput, Image
} from 'react-native';
import { RENKLER } from '../sabitler/renkler';
import { VARSAYILAN_HISSELER } from '../veriler/hisseVerileri';
import Svg, { Path } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

const LogoResim = ({ sembol, sirketAdi, kategori, boyut = 36 }: { sembol: string, sirketAdi: string, kategori?: string, boyut?: number }) => {
  const [hata, setHata] = useState(false);
  const getUrl = () => {
    if (hata) return `https://ui-avatars.com/api/?name=${encodeURIComponent(sirketAdi || sembol)}&background=random&color=fff&rounded=true&bold=true`;
    if (kategori === 'Kripto') {
      const s = sembol.replace('-USD', '').toLowerCase();
      return `https://assets.coincap.io/assets/icons/${s}@2x.png`;
    }
    if (kategori === 'ABD' || kategori === 'BIST') {
      const sStr = kategori === 'BIST' ? `${sembol}.IS` : sembol;
      return `https://financialmodelingprep.com/image-stock/${sStr}.png`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(sirketAdi || sembol)}&background=random&color=fff&rounded=true&bold=true`;
  };
  return <Image source={{ uri: getUrl() }} style={{ width: boyut, height: boyut, borderRadius: boyut / 2, backgroundColor: '#2A2A35' }} onError={() => setHata(true)} />;
};

const BackspaceIkon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" stroke={RENKLER.metin} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SwapIkon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke={RENKLER.birincilParlak} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

type Varlik = { id: string; isim: string; kategori: string; altisim: string; gercekSembol: string };

const HesaplayiciEkrani: React.FC = () => {
  const [usdPrices, setUsdPrices] = useState<Record<string, number>>({});
  const [fiyatDetaylari, setFiyatDetaylari] = useState<Record<string, { fiyat: number, yuzde: number }>>({});
  const [miktar, setMiktar] = useState('1'); 
  const [kaynak, setKaynak] = useState<Varlik>({ id: 'USD', isim: 'USD', altisim: 'Amerikan Doları', kategori: 'Döviz', gercekSembol: 'USD' });
  const [hedef, setHedef] = useState<Varlik>({ id: 'TRY', isim: 'TRY', altisim: 'Türk Lirası', kategori: 'Döviz', gercekSembol: 'TRY' });
  
  const [islemTipi, setIslemTipi] = useState<'Satış' | 'Alım'>('Satış');

  const [secimModaliAcik, setSecimModaliAcik] = useState<'kaynak' | 'hedef' | null>(null);
  const [arama, setArama] = useState('');
  const [seciliKategori, setSeciliKategori] = useState<string>('Tümü');

  useEffect(() => {
    const fetchPrices = async () => {
      const raw: Record<string, number> = {};
      const detaylar: Record<string, { fiyat: number, yuzde: number }> = {};

      const promises = VARSAYILAN_HISSELER.map(h => {
        const sStr = h.kategori === 'BIST' ? `${h.sembol}.IS` : h.sembol;
        return fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sStr}?range=5d&interval=1d`)
          .then(res => res.json())
          .then(data => {
            if (!data.chart?.result) return;
            const meta = data.chart.result[0].meta;
            const quotes = data.chart.result[0].indicators.quote[0];
            let son = 0, onceki = 0;
            if (quotes.close) {
              const gecerli = quotes.close.filter((c: any) => c !== null);
              if (gecerli.length > 1) {
                son = gecerli[gecerli.length - 1];
                onceki = gecerli[gecerli.length - 2];
              } else if (gecerli.length === 1) {
                son = gecerli[0];
              }
            }
            const anlik = meta.regularMarketPrice || son;
            const dy = onceki ? ((anlik - onceki) / onceki) * 100 : (meta.regularMarketChangePercent || 0);
            
            raw[h.sembol] = anlik;
            detaylar[h.sembol] = { fiyat: anlik, yuzde: dy };
          }).catch(() => {});
      });

      await Promise.all(promises);
      setFiyatDetaylari(detaylar);

      setUsdPrices(prev => {
        const p = { ...prev };
        const usdTry = raw['TRY=X'] || 32.2;
        p['USD'] = 1;
        p['TRY'] = 1 / usdTry;
        p['EUR'] = raw['EURUSD=X'] || 1.08;
        p['GBP'] = raw['GBPUSD=X'] || 1.25;
        p['JPY'] = 1 / (raw['USDJPY=X'] || 155);

        VARSAYILAN_HISSELER.forEach(v => {
           if (v.kategori === 'BIST' && raw[v.sembol]) p[v.sembol] = raw[v.sembol] / usdTry;
           else if (raw[v.sembol]) p[v.sembol] = raw[v.sembol];
        });
        
        return p;
      });
    };

    fetchPrices();
    const int = setInterval(fetchPrices, 30000); // 30 saniyede bir o anki ikiliyi yenile
    return () => clearInterval(int);
  }, [kaynak.id, hedef.id]);

  const varliklar: Varlik[] = useMemo(() => {
    const list: Varlik[] = [
      { id: 'USD', isim: 'USD', altisim: 'Amerikan Doları', kategori: 'Döviz', gercekSembol: 'USD' },
      { id: 'TRY', isim: 'TRY', altisim: 'Türk Lirası', kategori: 'Döviz', gercekSembol: 'TRY' },
      { id: 'EUR', isim: 'EUR', altisim: 'Euro', kategori: 'Döviz', gercekSembol: 'EUR' },
      { id: 'GBP', isim: 'GBP', altisim: 'İngiliz Sterlini', kategori: 'Döviz', gercekSembol: 'GBP' },
      { id: 'JPY', isim: 'JPY', altisim: 'Japon Yeni', kategori: 'Döviz', gercekSembol: 'JPY' },
    ];
    VARSAYILAN_HISSELER.forEach(h => {
      if (h.kategori !== 'Döviz') {
        list.push({ id: h.sembol, isim: h.sembol.replace('=F', '').replace('-USD', ''), altisim: h.sirketAdi, kategori: h.kategori, gercekSembol: h.sembol });
      }
    });
    return list;
  }, []);

  const handleNumpadPress = (tus: string) => {
    setMiktar(prev => {
      if (tus === 'X') {
        return prev.length > 1 ? prev.slice(0, -1) : '0';
      }
      if (tus === '.') {
        if (prev.includes('.')) return prev;
        return prev + '.';
      }
      if (prev === '0' && tus !== '.') {
        return tus;
      }
      if (prev.length >= 12) return prev;
      return prev + tus;
    });
  };

  const kategoriler = ['Tümü', 'Döviz', 'Kripto', 'Maden', 'ABD', 'BIST'];

  const filtrelenmisVarliklar = varliklar.filter(v => {
    if (seciliKategori !== 'Tümü' && v.kategori !== seciliKategori) return false;
    if (arama && !v.isim.toLowerCase().includes(arama.toLowerCase()) && !v.altisim.toLowerCase().includes(arama.toLowerCase())) return false;
    return true;
  });

  const m = parseFloat(miktar) || 0;
  const kP = usdPrices[kaynak.id] || 0;
  const hP = usdPrices[hedef.id] || 0;
  
  let gercekFiyatKatsayisi = hP > 0 ? (kP / hP) : 0;
  
  // %0.5 Banka/Aracı Kurum Makas Simülasyonu
  if (islemTipi === 'Satış') {
    // Satışta daha az para geçer ele
    gercekFiyatKatsayisi = gercekFiyatKatsayisi * 0.995;
  } else if (islemTipi === 'Alım') {
    // Alımda daha pahalıya gelir
    gercekFiyatKatsayisi = gercekFiyatKatsayisi * 1.005;
  }

  const sonuc = m * gercekFiyatKatsayisi;
  
  const miktarFormat = miktar; 
  const sonucFormat = sonuc > 100 ? sonuc.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : sonuc.toLocaleString('tr-TR', { maximumFractionDigits: 4 });

  const numpadTuslar = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'X']
  ];

  return (
    <View style={st.kont}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.arkaplan} />
      
      {/* Header Area */}
      <View style={st.headerAlan}>
        <View>
          <Text style={st.baslikMetin}>Hesaplayıcı</Text>
          <Text style={st.baslikAlt}>Canlı Çapraz Kur</Text>
        </View>

        {/* Segmented Control */}
        <View style={st.segmentKont}>
          <TouchableOpacity style={[st.segmentBtn, islemTipi === 'Satış' && st.segmentBtnAktif]} onPress={() => setIslemTipi('Satış')} activeOpacity={0.8}>
            <Text style={[st.segmentMetin, islemTipi === 'Satış' && st.segmentMetinAktif]}>Satış</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.segmentBtn, islemTipi === 'Alım' && st.segmentBtnAktif]} onPress={() => setIslemTipi('Alım')} activeOpacity={0.8}>
            <Text style={[st.segmentMetin, islemTipi === 'Alım' && st.segmentMetinAktif]}>Alım</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={st.icerikAlan}>
        {/* Dönüştürücü Kartı */}
        <View style={st.converterKart}>
          
          {/* Kaynak Satırı */}
          <View style={st.satir}>
            <Text style={st.degerBuyuk} numberOfLines={1} adjustsFontSizeToFit>{miktarFormat}</Text>
            <TouchableOpacity style={st.varlikSecici} onPress={() => setSecimModaliAcik('kaynak')} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <LogoResim sembol={kaynak.gercekSembol} sirketAdi={kaynak.altisim} kategori={kaynak.kategori} boyut={28} />
                <Text style={st.varlikIsim}>{kaynak.isim}</Text>
              </View>
              <Text style={st.downIkon}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Cizgi ve Swap */}
          <View style={st.swapKonteyner}>
            <View style={st.yatayCizgi} />
            <TouchableOpacity style={st.swapBtn} onPress={() => { setKaynak(hedef); setHedef(kaynak); }} activeOpacity={0.8}>
              <SwapIkon />
            </TouchableOpacity>
          </View>

          {/* Hedef Satırı */}
          <View style={st.satir}>
            <Text style={st.degerSonuc} numberOfLines={1} adjustsFontSizeToFit>{sonucFormat}</Text>
            <TouchableOpacity style={st.varlikSecici} onPress={() => setSecimModaliAcik('hedef')} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <LogoResim sembol={hedef.gercekSembol} sirketAdi={hedef.altisim} kategori={hedef.kategori} boyut={28} />
                <Text style={st.varlikIsim}>{hedef.isim}</Text>
              </View>
              <Text style={st.downIkon}>▼</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* Şık Finans Numpad Kapsayıcısı */}
      <View style={st.numpadKapsayici}>
        {numpadTuslar.map((satir, i) => (
          <View key={i} style={st.numpadSatir}>
            {satir.map(tus => (
              <TouchableOpacity 
                key={tus} 
                style={[st.numpadTus, tus === 'X' && { backgroundColor: 'transparent', borderWidth: 0 }]} 
                onPress={() => handleNumpadPress(tus)} 
                activeOpacity={0.6}
              >
                {tus === 'X' ? <BackspaceIkon /> : <Text style={st.numpadTusMetin}>{tus}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Varlık Seçim Modalı */}
      <Modal visible={secimModaliAcik !== null} animationType="slide" transparent>
        <View style={st.modalArka}>
          <View style={st.modalKart}>
            <View style={st.modalHeader}>
              <Text style={st.modalBaslik}>{secimModaliAcik === 'kaynak' ? 'Dönüştürülecek Varlık' : 'Alınacak Varlık'}</Text>
              <TouchableOpacity onPress={() => setSecimModaliAcik(null)} style={st.kapatBtn}>
                <Text style={{ color: RENKLER.metin, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={st.aramaInput}
              placeholder="Sembol veya şirket ara..."
              placeholderTextColor={RENKLER.metinUcuncul}
              value={arama}
              onChangeText={setArama}
            />

            <View style={{ height: 50, marginBottom: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.katScroll}>
                {kategoriler.map(k => (
                  <TouchableOpacity key={k} style={[st.katBtn, seciliKategori === k && st.katBtnSecili]} onPress={() => setSeciliKategori(k)}>
                    <Text style={[st.katMetin, seciliKategori === k && st.katMetinSecili]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {filtrelenmisVarliklar.map(v => {
                let sym = v.gercekSembol;
                if (v.id === 'TRY') sym = 'TRY=X';
                if (v.id === 'EUR') sym = 'EURUSD=X';
                if (v.id === 'GBP') sym = 'GBPUSD=X';
                if (v.id === 'JPY') sym = 'USDJPY=X';
                
                const detay = fiyatDetaylari[sym];
                let fStr = '';
                let yStr = '';
                let renk = RENKLER.metinIkincil;
                
                if (detay) {
                  let pre = v.kategori === 'BIST' || v.id === 'TRY' ? '₺' : '$';
                  if (v.id === 'EUR') pre = '€';
                  if (v.id === 'GBP') pre = '£';
                  if (v.id === 'JPY') pre = '¥';
                  
                  fStr = `${pre}${detay.fiyat > 10 ? detay.fiyat.toFixed(2) : detay.fiyat.toFixed(4)}`;
                  yStr = `${detay.yuzde >= 0 ? '+' : ''}${detay.yuzde.toFixed(2)}%`;
                  renk = detay.yuzde >= 0 ? '#10B981' : '#EF4444'; // Yeşil ve Kırmızı renk kodları (Tailwind)
                }

                return (
                <TouchableOpacity key={v.id} style={st.secimKart} onPress={() => {
                  if (secimModaliAcik === 'kaynak') setKaynak(v);
                  else setHedef(v);
                  setSecimModaliAcik(null);
                  setArama('');
                }}>
                  <View style={{ marginRight: 14 }}>
                    <LogoResim sembol={v.gercekSembol} sirketAdi={v.altisim} kategori={v.kategori} boyut={38} />
                  </View>
                  <View style={st.secimSol}>
                    <Text style={st.secimIsim}>{sym}</Text>
                    <Text style={st.secimAltIsim} numberOfLines={1}>{v.altisim}</Text>
                  </View>
                  
                  {detay && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: RENKLER.metin, fontWeight: '800', fontSize: 14 }}>{fStr}</Text>
                      <Text style={{ color: renk, fontWeight: '800', fontSize: 12, marginTop: 4 }}>{yStr}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )})}
              {filtrelenmisVarliklar.length === 0 && (
                <Text style={{ textAlign: 'center', color: RENKLER.metinUcuncul, marginTop: 20 }}>Aramaya uygun varlık bulunamadı.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const st = StyleSheet.create({
  kont: { flex: 1, backgroundColor: RENKLER.arkaplan }, 
  
  headerAlan: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  baslikMetin: { fontSize: 24, fontWeight: '900', color: RENKLER.metin },
  baslikAlt: { fontSize: 13, color: RENKLER.metinIkincil, marginTop: 4, fontWeight: '600' },
  
  segmentKont: { flexDirection: 'row', backgroundColor: RENKLER.kartIki, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: RENKLER.sinir },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  segmentBtnAktif: { backgroundColor: RENKLER.birincil }, 
  segmentMetin: { color: RENKLER.metinUcuncul, fontSize: 13, fontWeight: '700' },
  segmentMetinAktif: { color: RENKLER.beyaz, fontWeight: '800' },

  icerikAlan: { paddingHorizontal: 20, flex: 1, justifyContent: 'flex-start', paddingTop: 30 },

  converterKart: { paddingVertical: 10 },
  
  satir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  degerBuyuk: { flex: 1, fontSize: 46, fontWeight: '800', color: RENKLER.metin, paddingRight: 10 },
  degerSonuc: { flex: 1, fontSize: 46, fontWeight: '800', color: RENKLER.metinIkincil, paddingRight: 10 },
  
  varlikSecici: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: RENKLER.kartBir, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: RENKLER.sinir },
  varlikIsim: { fontSize: 18, fontWeight: '800', color: RENKLER.metin },
  downIkon: { color: RENKLER.metinUcuncul, fontSize: 12, marginLeft: 8, marginTop: 2, fontWeight: '900' },

  swapKonteyner: { position: 'relative', marginVertical: 15, alignItems: 'center', justifyContent: 'center' },
  yatayCizgi: { height: 1, backgroundColor: RENKLER.sinir, width: '100%', opacity: 0.5 },
  swapBtn: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: RENKLER.arkaplan, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: RENKLER.sinir },
  
  numpadKapsayici: { backgroundColor: RENKLER.kartBir, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 15, borderWidth: 1, borderColor: RENKLER.sinir, borderBottomWidth: 0 },
  numpadSatir: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  numpadTus: { width: SW / 3 - 22, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: RENKLER.kartIki, borderRadius: 16, borderWidth: 1, borderColor: RENKLER.sinir },
  numpadTusMetin: { fontSize: 26, color: RENKLER.metin, fontWeight: '700' },

  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalKart: { flex: 0.9, backgroundColor: RENKLER.kartBir, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: RENKLER.sinir },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalBaslik: { fontSize: 18, fontWeight: '800', color: RENKLER.metin },
  kapatBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: RENKLER.kartIki, alignItems: 'center', justifyContent: 'center' },
  aramaInput: { backgroundColor: RENKLER.kartIki, borderRadius: 12, padding: 14, color: RENKLER.metin, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: RENKLER.sinir },
  katScroll: { gap: 10, paddingBottom: 10, alignItems: 'center' },
  katBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: RENKLER.kartIki, borderWidth: 1, borderColor: RENKLER.sinir, height: 38, justifyContent: 'center' },
  katBtnSecili: { backgroundColor: RENKLER.birincil },
  katMetin: { fontSize: 14, color: RENKLER.metinIkincil, fontWeight: '700' },
  katMetinSecili: { color: RENKLER.beyaz, fontWeight: '800' },
  
  secimKart: { backgroundColor: RENKLER.kartIki, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: RENKLER.sinir },
  secimSol: { flex: 1, paddingRight: 10 },
  secimIsim: { fontSize: 16, fontWeight: '800', color: RENKLER.metin },
  secimAltIsim: { fontSize: 13, color: RENKLER.metinIkincil, fontWeight: '500', marginTop: 2 }
});

export default HesaplayiciEkrani;
