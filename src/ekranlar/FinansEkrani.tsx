import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, StatusBar, Dimensions, Modal, Platform, Linking
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { RENKLER } from '../sabitler/renkler';
import { VARSAYILAN_HISSELER, hisseAra, HisseSenedi } from '../veriler/hisseVerileri';
import CizgiGrafik from '../bilesenler/CizgiGrafik';
import MumGrafik from '../bilesenler/MumGrafik';
import { BilgiIkonu } from '../bilesenler/BilgiIkonu';

const { width: SW, height: SH } = Dimensions.get('window');
const YATAY_PAD = 12;
const ICERIK_W = SW - YATAY_PAD * 2;

type GrafikTipi = 'cizgi' | 'mum';
type Dilim = '1H' | '1A' | '3A' | '6A' | '1Y' | '3Y' | '5Y';
const DILIM_GUN: Record<Dilim, number> = { '1H': 7, '1A': 30, '3A': 90, '6A': 180, '1Y': 365, '3Y': 1095, '5Y': 1825 };
const DILIMLER: Dilim[] = ['1H', '1A', '3A', '6A', '1Y', '3Y', '5Y'];

const pF = (n: number, para: string) => {
  const s = para === 'TRY' ? '₺' : '$';
  if (n >= 1e12) return `${s}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${s}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${s}${(n / 1e6).toFixed(2)}M`;
  return `${s}${n.toLocaleString()}`;
};
const hF = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n.toLocaleString();

const STAT_W = (ICERIK_W - 8 * 2) / 3;

const StatKutu = ({ etiket, deger, renk }: { etiket: string; deger: string; renk?: string }) => (
  <View style={st.statKutu}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={st.statEtiket} numberOfLines={1}>{etiket}</Text>
      <BilgiIkonu baslik={etiket} />
    </View>
    <Text style={[st.statDeger, renk ? { color: renk } : {}]} numberOfLines={1}>{deger}</Text>
  </View>
);

const SatirItem = ({ etiket, deger }: { etiket: string; deger: string }) => (
  <View style={st.satirSatir}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={st.satirEtiket}>{etiket}</Text>
      <BilgiIkonu baslik={etiket} />
    </View>
    <Text style={st.satirDeger}>{deger}</Text>
  </View>
);

type Haber = {
  id: string;
  baslik: string;
  ozet: string;
  kaynak: string;
  tarih: string;
  icerik: string;
  link?: string;
};

const HaberleriSüzVeGetir = async (hisseAdi: string, sembol: string): Promise<Haber[]> => {
  try {
    const aramaMetni = encodeURIComponent(`${sembol} hisse`);
    const res = await fetch(`https://news.google.com/rss/search?q=${aramaMetni}&hl=tr&gl=TR&ceid=TR:tr`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!res.ok) throw new Error('API Hatası');
    
    const text = await res.text();
    const items = text.split('<item>').slice(1);
    
    if (items.length > 0) {
      return items.slice(0, 5).map((item, index) => {
        const baslikMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const kaynakMatch = item.match(/<source[^>]*>(.*?)<\/source>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        
        let baslik = baslikMatch ? baslikMatch[1] : 'Haber';
        baslik = baslik.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        
        let tarihStr = 'Güncel';
        if (pubDateMatch) {
           const d = new Date(pubDateMatch[1]);
           if (!isNaN(d.getTime())) {
             tarihStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
           }
        }

        return {
          id: String(index),
          baslik: baslik,
          ozet: 'Haberin tam metnini okumak için tıklayın.',
          kaynak: kaynakMatch ? kaynakMatch[1] : 'Google Haberler',
          tarih: tarihStr,
          icerik: '',
          link: linkMatch ? linkMatch[1] : ''
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Haber çekme hatası:", error);
    return [];
  }
};

const HaberKartıBileşeni = ({ haber, onPress }: { haber: Haber, onPress?: () => void }) => (
  <TouchableOpacity style={st.haberKart} onPress={onPress} activeOpacity={0.7}>
    <Text style={st.haberKaynakVeTarih}>{haber.kaynak} • {haber.tarih}</Text>
    <Text style={st.haberBaslik} numberOfLines={2}>{haber.baslik}</Text>
  </TouchableOpacity>
);

const FinansEkrani: React.FC = () => {
  const [arama, setArama]       = useState('');
  const [sec, setSec]           = useState<HisseSenedi>(VARSAYILAN_HISSELER[0]);
  const [tip, setTip]           = useState<GrafikTipi>('cizgi');
  const [dilim, setDilim]       = useState<Dilim>('1A');
  const [zoom, setZoom]         = useState(1);
  const [modalAcik, setModal]   = useState(false);

  const [seciliHisseAdi, setSeciliHisseAdi] = useState(sec.sirketAdi);
  const [haberYukleniyorMu, setHaberYukleniyorMu] = useState(false);
  const [guncelHaberListesi, setGuncelHaberListesi] = useState<Haber[]>([]);
  const [seciliHaber, setSeciliHaber] = useState<Haber | null>(null);

  const TurkceHaberleriYukle = async (sirketAdi: string, sembol: string) => {
    setHaberYukleniyorMu(true);
    try {
      const haberler = await HaberleriSüzVeGetir(sirketAdi, sembol);
      setGuncelHaberListesi(haberler);
    } catch (error) {
      setGuncelHaberListesi([]);
    } finally {
      setHaberYukleniyorMu(false);
    }
  };

  useEffect(() => {
    setSeciliHisseAdi(sec.sirketAdi);
    TurkceHaberleriYukle(sec.sirketAdi, sec.sembol);
  }, [sec.sirketAdi, sec.sembol]);

  const liste = useMemo(() => arama.trim() ? hisseAra(arama) : VARSAYILAN_HISSELER, [arama]);

  const toplamGun = DILIM_GUN[dilim];
  const gorunenGun = Math.max(7, Math.floor(toplamGun / zoom));

  const cizgiVeri = useMemo(() => sec.cizgi.slice(-toplamGun).slice(-gorunenGun), [sec, toplamGun, gorunenGun]);
  const mumVeri   = useMemo(() => sec.mum.slice(-toplamGun).slice(-gorunenGun),   [sec, toplamGun, gorunenGun]);

  const poz     = sec.degisimYuzde >= 0;
  const dRenk   = poz ? RENKLER.yukselis : RENKLER.dusus;
  const sembol  = sec.para === 'TRY' ? '₺' : '$';

  const zoomArtir = () => setZoom(z => Math.min(z * 2, 16));
  const zoomAzalt = () => setZoom(z => Math.max(z / 2, 1));

  const Grafik = ({ w, h }: { w: number; h: number }) =>
    tip === 'cizgi'
      ? <CizgiGrafik veriler={cizgiVeri} genislik={w} yukseklik={h} pozitif={poz} />
      : <MumGrafik   veriler={mumVeri}   genislik={w} yukseklik={h} />;

  const ZoomKontrol = () => (
    <View style={st.zoomSatir}>
      <TouchableOpacity style={st.zoomBtn} onPress={zoomAzalt} disabled={zoom <= 1}>
        <Text style={[st.zoomMetin, zoom <= 1 && { opacity: 0.3 }]}>－</Text>
      </TouchableOpacity>
      <Text style={st.zoomSeviye}>{zoom > 1 ? `${zoom}× Zoom` : 'Normal'}</Text>
      <TouchableOpacity style={st.zoomBtn} onPress={zoomArtir} disabled={zoom >= 16}>
        <Text style={[st.zoomMetin, zoom >= 16 && { opacity: 0.3 }]}>＋</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={st.kont}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.arkaplan} />

      {/* Başlık */}
      <View style={st.baslik}>
        <Text style={st.baslikMetin}>Piyasa</Text>
        <View style={st.aramaKutu}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke={RENKLER.metinUcuncul} strokeWidth={2} strokeLinecap="round"/>
          </Svg>
          <TextInput style={st.aramaInput} value={arama} onChangeText={setArama}
            placeholder="Sembol veya şirket ara..." placeholderTextColor={RENKLER.metinUcuncul} />
          {arama.length > 0 && <TouchableOpacity onPress={() => setArama('')}><Text style={{ color: RENKLER.metinIkincil }}>✕</Text></TouchableOpacity>}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 140 : 120 }}>

        {/* Yatay hisse listesi — içerikle birlikte kayar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: RENKLER.arkaplan }}
          contentContainerStyle={{ paddingHorizontal: YATAY_PAD, paddingVertical: 10, gap: 8 }}>
          {liste.map(h => {
            const p = h.degisimYuzde >= 0;
            const s = sec.sembol === h.sembol;
            return (
              <TouchableOpacity key={h.sembol} style={[st.chip, s && st.chipSec]} onPress={() => { setSec(h); setZoom(1); }} activeOpacity={0.75}>
                <Text style={[st.chipSembol, s && { color: RENKLER.arkaplan }]}>{h.sembol}</Text>
                <Text style={[st.chipPara, { color: p ? RENKLER.yukselis : RENKLER.dusus }]}>
                  {p ? '+' : ''}{h.degisimYuzde.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ padding: YATAY_PAD, gap: 8 }}>

        {/* Fiyat kartı */}
        <View style={st.fiyatKart}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={st.sembol}>{sec.sembol}</Text>
              <Text style={st.sirket}>{sec.sirketAdi}</Text>
            </View>
            <View style={[st.degRozet, { backgroundColor: poz ? RENKLER.yukselisArka : RENKLER.dususArka }]}>
              <Text style={[st.degMetin, { color: dRenk }]}>{poz ? '▲' : '▼'} {Math.abs(sec.degisimYuzde).toFixed(2)}%</Text>
            </View>
          </View>
          <Text style={st.buyukFiyat}>{sembol}{sec.fiyat.toFixed(2)}</Text>
          <Text style={[{ fontSize: 13, fontWeight: '600', marginTop: 2 }, { color: dRenk }]}>
            {poz ? '+' : ''}{sembol}{Math.abs(sec.degisim).toFixed(2)} bugün
          </Text>
        </View>

        {/* Grafik kartı */}
        <View style={st.grafikKart}>
          <View style={st.kontrolSatir}>
            <View style={st.tipSecici}>
              {(['cizgi', 'mum'] as GrafikTipi[]).map(t => (
                <TouchableOpacity key={t} style={[st.tipBtn, tip === t && st.tipBtnSec]} onPress={() => setTip(t)}>
                  <Text style={[st.tipMetin, tip === t && { color: RENKLER.beyaz }]}>{t === 'cizgi' ? 'Çizgi' : 'Mum'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={st.expandBtn} onPress={() => setModal(true)}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                  stroke={RENKLER.metinIkincil} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Dilim seçici */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
            {DILIMLER.map(d => (
              <TouchableOpacity key={d} style={[st.dilimBtn, dilim === d && st.dilimBtnSec]}
                onPress={() => { setDilim(d); setZoom(1); }}>
                <Text style={[st.dilimMetin, dilim === d && { color: RENKLER.birincilAcik, fontWeight: '700' }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ZoomKontrol />
          <Grafik w={ICERIK_W - 16} h={200} />
        </View>

        {/* İstatistik grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatKutu etiket="Günlük Yüksek" deger={`${sembol}${sec.gunlukYuksek.toFixed(2)}`} renk={RENKLER.yukselis} />
          <StatKutu etiket="Günlük Düşük"  deger={`${sembol}${sec.gunlukDusuk.toFixed(2)}`}  renk={RENKLER.dusus} />
          <StatKutu etiket="52H Yüksek"    deger={`${sembol}${sec.haftaBirYuksek.toFixed(2)}`} />
          <StatKutu etiket="52H Düşük"     deger={`${sembol}${sec.haftaBirDusuk.toFixed(2)}`} />
          <StatKutu etiket="Hacim"         deger={hF(sec.hacim)} />
          <StatKutu etiket="Piyasa Değeri" deger={pF(sec.piyasaDegeri, sec.para)} />
        </View>

        {/* Temel göstergeler */}
        <View style={st.kart}>
          <Text style={st.kartBaslik}>Temel Göstergeler</Text>
          <View style={{ height: 1, backgroundColor: RENKLER.sinir, marginVertical: 10 }} />
          {([
            ['F/K Oranı',        (sec.fiyat / (sec.fiyat * 0.065)).toFixed(2)],
            ['EPS',              `${sembol}${(sec.fiyat * 0.065).toFixed(2)}`],
            ['Beta',             (0.8 + (sec.sembol.length % 5) * 0.18).toFixed(2)],
            ['Temettü',          `${(0.5 + (sec.sembol.length % 4) * 0.5).toFixed(2)}%`],
            ['İşlem Hacmi (Ort.)', hF(Math.floor(sec.hacim * 0.9))],
            ['Hisse Adedi',      hF(Math.floor(sec.piyasaDegeri / sec.fiyat))],
          ] as [string, string][]).map(([e, d]) => <SatirItem key={e} etiket={e} deger={d} />)}
        </View>

        {/* 5 günlük OHLC tablosu */}
        <View style={st.kart}>
          <Text style={st.kartBaslik}>Son 5 Günlük OHLC</Text>
          <View style={{ height: 1, backgroundColor: RENKLER.sinir, marginVertical: 10 }} />
          <View style={{ flexDirection: 'row' }}>
            {['Tarih', 'Açılış', 'Kapanış', 'Yüksek', 'Düşük'].map(b => (
              <Text key={b} style={st.tabloBaslik}>{b}</Text>
            ))}
          </View>
          {sec.mum.slice(-5).reverse().map((m, i) => {
            const y = m.kapanis >= m.acilis;
            return (
              <View key={i} style={[st.tabloSatir, i % 2 === 0 && { backgroundColor: RENKLER.sinirAcik }]}>
                <Text style={st.tabloH}>{m.tarih.slice(5)}</Text>
                <Text style={st.tabloH}>{m.acilis.toFixed(1)}</Text>
                <Text style={[st.tabloH, { color: y ? RENKLER.yukselis : RENKLER.dusus, fontWeight: '700' }]}>{m.kapanis.toFixed(1)}</Text>
                <Text style={st.tabloH}>{m.yuksek.toFixed(1)}</Text>
                <Text style={st.tabloH}>{m.dusuk.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>

        {/* Son Gelişmeler & Haberler */}
        <View style={st.kart}>
          <Text style={st.kartBaslik}>Son Gelişmeler & Haberler</Text>
          <View style={{ height: 1, backgroundColor: RENKLER.sinir, marginVertical: 10 }} />
          {haberYukleniyorMu ? (
            <Text style={{ color: RENKLER.metinIkincil, textAlign: 'center', marginVertical: 20 }}>
              Haber kaynağı yükleniyor...
            </Text>
          ) : guncelHaberListesi.length > 0 ? (
            <View style={{ gap: 10 }}>
              {guncelHaberListesi.map(h => <HaberKartıBileşeni key={h.id} haber={h} onPress={() => setSeciliHaber(h)} />)}
            </View>
          ) : (
            <Text style={{ color: RENKLER.metinIkincil, textAlign: 'center', marginVertical: 20 }}>
              Bu hisse hakkında güncel haber bulunamadı.
            </Text>
          )}
        </View>

        </View>
      </ScrollView>

      {/* Büyütülmüş Grafik Modal */}
      <Modal visible={modalAcik} animationType="slide" transparent>
        <View style={st.modalArka}>
          <View style={st.modalKart}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: RENKLER.metin, fontWeight: '700', fontSize: 15 }}>{sec.sembol} — Detaylı Grafik</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={st.kapatBtn}>
                <Text style={{ color: RENKLER.metin, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
              {DILIMLER.map(d => (
                <TouchableOpacity key={d} style={[st.dilimBtn, dilim === d && st.dilimBtnSec]}
                  onPress={() => { setDilim(d); setZoom(1); }}>
                  <Text style={[st.dilimMetin, dilim === d && { color: RENKLER.birincilAcik, fontWeight: '700' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ZoomKontrol />
            <Grafik w={SW - 32} h={SH * 0.45} />
          </View>
        </View>
      </Modal>

      {/* Haber Detay Modalı */}
      <Modal visible={seciliHaber !== null} animationType="slide" transparent>
        <View style={st.modalArka}>
          <View style={[st.modalKart, { flex: 1, marginTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: RENKLER.metinIkincil, fontWeight: '600', fontSize: 13, flex: 1, marginRight: 10 }} numberOfLines={1}>
                {seciliHaber?.kaynak} • {seciliHaber?.tarih}
              </Text>
              <TouchableOpacity onPress={() => setSeciliHaber(null)} style={st.kapatBtn}>
                <Text style={{ color: RENKLER.metin, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden', backgroundColor: RENKLER.arkaplan }}>
              {seciliHaber?.link ? (
                <WebView 
                  source={{ uri: seciliHaber.link }} 
                  style={{ flex: 1, backgroundColor: 'transparent' }} 
                  showsVerticalScrollIndicator={false}
                  startInLoadingState={true}
                  injectedJavaScript={`
                    (function() {
                      if (document.getElementById('karanlik-tema-enjekt')) return;
                      var css = 'html { filter: invert(100%) hue-rotate(180deg) !important; background: #121212 !important; } ' +
                                'body { background: #121212 !important; } ' +
                                'img, video, iframe, svg, canvas, picture, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }';
                      var style = document.createElement('style');
                      style.id = 'karanlik-tema-enjekt';
                      style.appendChild(document.createTextNode(css));
                      document.head.appendChild(style);
                    })();
                    true;
                  `}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const st = StyleSheet.create({
  kont:        { flex: 1, backgroundColor: RENKLER.arkaplan },
  baslik:      { backgroundColor: RENKLER.arkaplan, paddingTop: 52, paddingBottom: 10, paddingHorizontal: YATAY_PAD, flexDirection: 'row', alignItems: 'center', gap: 10 },
  baslikMetin: { fontSize: 22, fontWeight: '800', color: RENKLER.metin },
  aramaKutu:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: RENKLER.kartBir, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: RENKLER.sinir },
  aramaInput:  { flex: 1, color: RENKLER.metin, fontSize: 13, padding: 0 },
  chip:        { backgroundColor: RENKLER.kartIki, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' },
  chipSec:     { backgroundColor: RENKLER.metin },
  chipSembol:  { color: RENKLER.metinIkincil, fontWeight: '700', fontSize: 13 },
  chipPara:    { fontSize: 12, fontWeight: '600' },
  fiyatKart:   { backgroundColor: RENKLER.kartBir, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: RENKLER.sinir },
  sembol:      { fontSize: 26, fontWeight: '800', color: RENKLER.metin },
  sirket:      { fontSize: 12, color: RENKLER.metinIkincil, marginTop: 2 },
  degRozet:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  degMetin:    { fontSize: 13, fontWeight: '700' },
  buyukFiyat:  { fontSize: 36, fontWeight: '800', color: RENKLER.metin, marginTop: 8 },
  grafikKart:  { backgroundColor: RENKLER.kartBir, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: RENKLER.sinir },
  kontrolSatir:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipSecici:   { flexDirection: 'row', backgroundColor: RENKLER.kartIki, borderRadius: 8, padding: 2 },
  tipBtn:      { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 7 },
  tipBtnSec:   { backgroundColor: RENKLER.birincil },
  tipMetin:    { fontSize: 12, color: RENKLER.metinIkincil, fontWeight: '600' },
  expandBtn:   { padding: 8, backgroundColor: RENKLER.kartIki, borderRadius: 8 },
  dilimBtn:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7, backgroundColor: RENKLER.kartIki },
  dilimBtnSec: { backgroundColor: RENKLER.birincil + '22', borderWidth: 1, borderColor: RENKLER.birincil + '55' },
  dilimMetin:  { fontSize: 11, color: RENKLER.metinIkincil, fontWeight: '600' },
  zoomSatir:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 },
  zoomBtn:     { width: 28, height: 28, borderRadius: 7, backgroundColor: RENKLER.kartIki, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: RENKLER.sinir },
  zoomMetin:   { color: RENKLER.metin, fontSize: 16, lineHeight: 22 },
  zoomSeviye:  { fontSize: 11, color: RENKLER.metinIkincil, fontWeight: '600', minWidth: 60, textAlign: 'center' },
  statKutu:    { backgroundColor: RENKLER.kartBir, borderRadius: 12, padding: 10, width: STAT_W, borderWidth: 1, borderColor: RENKLER.sinir },
  statEtiket:  { fontSize: 9, color: RENKLER.metinUcuncul, fontWeight: '500', flex: 1 },
  statDeger:   { fontSize: 13, color: RENKLER.metin, fontWeight: '700', marginTop: 5 },
  kart:        { backgroundColor: RENKLER.kartBir, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: RENKLER.sinir },
  kartBaslik:  { fontSize: 14, fontWeight: '700', color: RENKLER.metin },
  satirSatir:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: RENKLER.sinirAcik },
  satirEtiket: { fontSize: 13, color: RENKLER.metinIkincil },
  satirDeger:  { fontSize: 13, color: RENKLER.metin, fontWeight: '600' },
  tabloBaslik: { flex: 1, fontSize: 10, color: RENKLER.birincilAcik, fontWeight: '700', textAlign: 'center', paddingBottom: 6 },
  tabloSatir:  { flexDirection: 'row', paddingVertical: 7, borderRadius: 6 },
  tabloH:      { flex: 1, fontSize: 11, color: RENKLER.metin, textAlign: 'center' },
  modalArka:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalKart:   { backgroundColor: RENKLER.kartBir, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderTopWidth: 1, borderColor: RENKLER.sinir },
  kapatBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: RENKLER.kartIki, alignItems: 'center', justifyContent: 'center' },
  haberKart:   { backgroundColor: RENKLER.kartIki, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: RENKLER.sinir, overflow: 'hidden' },
  haberKaynakVeTarih: { fontSize: 11, color: RENKLER.metinUcuncul, marginBottom: 4, fontWeight: '600' },
  haberBaslik: { fontSize: 14, fontWeight: '700', color: RENKLER.metin, marginBottom: 4 },
  haberOzet:   { fontSize: 12, color: RENKLER.metinIkincil, lineHeight: 18 },
});

export default FinansEkrani;
