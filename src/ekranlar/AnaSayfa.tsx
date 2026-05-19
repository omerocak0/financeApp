import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  StatusBar, Dimensions, ActivityIndicator, TextInput, Modal, Alert, Platform
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Path, G, Rect, Line } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabaseIstemcisi } from '../supabaseIstemcisi';
import { VARSAYILAN_HISSELER } from '../veriler/hisseVerileri';
import Logo from '../bilesenler/Logo';
import { useNavigation } from '@react-navigation/native';

const { width: SW } = Dimensions.get('window');

interface PortfoyItem { id: string; varlik_kodu: string; varlik_miktari: number; alis_fiyati: number; alis_tarihi: string; }
interface AlarmItem { id: string; varlik_kodu: string; alarm_tipi: string; yon_isareti: string; hedef_deger: number; tekrar_etsin_mi?: boolean; eposta_gonderilsin_mi?: boolean; tetiklendi_mi?: boolean; }

// ── Native SVG Özel Grafik (Çizgi ve Mum) ──────────────────────────────────────
const AnaSayfaGrafik = ({ veriler, genislik, yukseklik, pozitif, alisFiyati, tip }: any) => {
  if (!veriler || veriler.length === 0) return <View style={{ width: genislik, height: yukseklik, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111111', borderRadius: 16 }}><Text style={{ color: '#8A8B92' }}>Grafik verisi bulunamadı.</Text></View>;

  const minF = Math.min(...veriler.flatMap((d: any) => [d.low, d.close]));
  const maxF = Math.max(...veriler.flatMap((d: any) => [d.high, d.close]));
  const fark = (maxF - minF) || 1;
  const padding = fark * 0.15;
  const gosterimMin = minF - padding;
  const gosterimMax = maxF + padding;
  const gercekFark = gosterimMax - gosterimMin;

  const grafikGenislik = genislik - 45;
  const grafikYukseklik = yukseklik - 25;

  let gosterAlis = false;
  let alisY = 0;
  if (alisFiyati) {
    alisY = grafikYukseklik - ((alisFiyati - gosterimMin) / gercekFark) * grafikYukseklik;
    if (alisY >= 0 && alisY <= grafikYukseklik) gosterAlis = true;
  }

  const ilkTarih = veriler[0]?.dateStr || '';
  const ortaTarih = veriler[Math.floor(veriler.length / 2)]?.dateStr || '';
  const sonTarih = veriler[veriler.length - 1]?.dateStr || '';

  return (
    <View style={{
      width: genislik, height: yukseklik, backgroundColor: '#111111',
      borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#222222',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8
    }}>
      <Svg width={grafikGenislik} height={grafikYukseklik} style={{ position: 'absolute', top: 0, left: 0 }}>
        {tip === 'cizgi' ? (
          <Path
            d={`M ${veriler.map((d: any, i: number) => `${(i / Math.max(veriler.length - 1, 1)) * grafikGenislik},${grafikYukseklik - ((d.close - gosterimMin) / gercekFark) * grafikYukseklik}`).join(' L ')}`}
            stroke={pozitif ? '#10B981' : '#EF4444'} strokeWidth={2.5} fill="none"
          />
        ) : null}

        {tip === 'mum' ? veriler.map((d: any, i: number) => {
          const x = (i / Math.max(veriler.length - 1, 1)) * grafikGenislik;
          const openY = grafikYukseklik - ((d.open - gosterimMin) / gercekFark) * grafikYukseklik;
          const closeY = grafikYukseklik - ((d.close - gosterimMin) / gercekFark) * grafikYukseklik;
          const highY = grafikYukseklik - ((d.high - gosterimMin) / gercekFark) * grafikYukseklik;
          const lowY = grafikYukseklik - ((d.low - gosterimMin) / gercekFark) * grafikYukseklik;

          const isUp = d.close >= d.open;
          const color = isUp ? '#10B981' : '#EF4444';
          const yTop = Math.min(openY, closeY);
          const height = Math.max(Math.abs(openY - closeY), 1);

          return (
            <G key={i}>
              <Line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1} />
              <Rect x={x - 2} y={yTop} width={4} height={height} fill={color} />
            </G>
          );
        }) : null}

        {gosterAlis ? <Path d={`M 0,${alisY} L ${grafikGenislik},${alisY}`} stroke="#3B82F6" strokeWidth={2} strokeDasharray="5,5" fill="none" /> : null}
      </Svg>

      <View style={{ position: 'absolute', right: 4, top: 0, height: grafikYukseklik, justifyContent: 'space-between', paddingVertical: 5 }}>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>₺{gosterimMax.toFixed(2)}</Text>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>₺{((gosterimMax + gosterimMin) / 2).toFixed(2)}</Text>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>₺{gosterimMin.toFixed(2)}</Text>
      </View>

      <View style={{ position: 'absolute', bottom: 4, left: 0, width: grafikGenislik, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>{ilkTarih}</Text>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>{ortaTarih}</Text>
        <Text style={{ color: '#8A8B92', fontSize: 10 }}>{sonTarih}</Text>
      </View>

      {gosterAlis && <Text style={{ position: 'absolute', left: 8, top: alisY - 18, color: '#3B82F6', fontSize: 11, fontWeight: 'bold' }}>Maliyet (₺{alisFiyati})</Text>}
    </View>
  );
};

// ── Basit Logo Bileşeni ───────────────────────────────────────────────────────
const LogoResim = ({ sembol, sirketAdi, kategori, boyut = 36 }: any) => {
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

export default function AnaSayfa() {
  const navigation = useNavigation<any>();
  const [portfoyVerileri, setPortfoyVerileri] = useState<PortfoyItem[]>([]);
  const [alarmVerileri, setAlarmVerileri] = useState<AlarmItem[]>([]);
  const [aktifSekme, setAktifSekme] = useState<'Varlıklarım' | 'Alarmlarım'>('Varlıklarım');
  const [toplamBakiye, setToplamBakiye] = useState<number>(0);
  const [karZararYuzdesi, setKarZararYuzdesi] = useState<number>(0);
  const [yukleniyorDurumu, setYukleniyorDurumu] = useState<boolean>(true);

  // Modallar
  const [modalGorunurlugu, setModalGorunurlugu] = useState<boolean>(false);
  const [ekleModalGorunurlugu, setEkleModalGorunurlugu] = useState<boolean>(false);
  const [varlikSecimModali, setVarlikSecimModali] = useState<'ekle' | 'alarm' | 'takip' | null>(null);
  const [detayModali, setDetayModali] = useState<PortfoyItem | null>(null);
  const [duzenleModali, setDuzenleModali] = useState<PortfoyItem | null>(null);

  // Grafik Modeli
  const [grafikTipi, setGrafikTipi] = useState<'cizgi' | 'mum'>('cizgi');
  const [detayGrafikVerisi, setDetayGrafikVerisi] = useState<any[]>([]);
  const [detayGrafikYukleniyor, setDetayGrafikYukleniyor] = useState(false);
  const [detayEkstra, setDetayEkstra] = useState<any>(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [kategoriLimit, setKategoriLimit] = useState<Record<string, number>>({});
  const [anlikFiyatlar, setAnlikFiyatlar] = useState<Record<string, number>>({});
  const [bildirimGidenler, setBildirimGidenler] = useState<Set<string>>(new Set());

  const [secilenTarihObj, setSecilenTarihObj] = useState(new Date());
  const [tarihSeciciGoster, setTarihSeciciGoster] = useState(false);
  const [saatSeciciGoster, setSaatSeciciGoster] = useState(false);

  // Formlar
  const [yeniKod, setYeniKod] = useState('');
  const [yeniMiktar, setYeniMiktar] = useState('');
  const [yeniFiyat, setYeniFiyat] = useState('');
  const [yeniTarih, setYeniTarih] = useState(new Date().toISOString().split('T')[0]);

  const [alarmKod, setAlarmKod] = useState('');
  const [alarmTip, setAlarmTip] = useState('Hedef Fiyat');
  const [alarmYon, setAlarmYon] = useState('+');
  const [alarmDeger, setAlarmDeger] = useState('');
  const [alarmTekrar, setAlarmTekrar] = useState(false);
  const [alarmEposta, setAlarmEposta] = useState(false);

  // ── Supabase İşlemleri ───────────────────────────────────────────────────────
  const verileriGetir = async () => {
    setYukleniyorDurumu(true);
    try {
      const [resPortfoy, resAlarmlar] = await Promise.all([
        supabaseIstemcisi.from('portfoy').select('*').order('olusturma_tarihi', { ascending: false }),
        supabaseIstemcisi.from('alarmlar').select('*').order('olusturma_tarihi', { ascending: false })
      ]);
      if (resPortfoy.data) setPortfoyVerileri(resPortfoy.data);
      if (resAlarmlar.data) setAlarmVerileri(resAlarmlar.data);
    } catch (e) { }
    setYukleniyorDurumu(false);
  };

  const varlikEkle = async (kod: string, miktar: number, fiyat: number, tarih: string) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('portfoy').insert({
        varlik_kodu: kod, varlik_miktari: miktar, alis_fiyati: fiyat, alis_tarihi: tarih
      }).select();
      if (!error && data) setPortfoyVerileri([data[0], ...portfoyVerileri]);
    } catch (e) { }
  };

  const varlikGuncelle = async (id: string, miktar: number, fiyat: number, tarih: string) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('portfoy').update({
        varlik_miktari: miktar, alis_fiyati: fiyat, alis_tarihi: tarih
      }).eq('id', id).select();
      if (!error && data) {
        setPortfoyVerileri(prev => prev.map(p => p.id === id ? data[0] : p));
        Alert.alert("Başarılı", "Varlık başarıyla güncellendi.");
      }
    } catch (e) { }
  };

  const varlikSil = async (id: string) => {
    try {
      await supabaseIstemcisi.from('portfoy').delete().eq('id', id);
      setPortfoyVerileri(portfoyVerileri.filter(p => p.id !== id));
      setDetayModali(null);
    } catch (e) { }
  };

  const alarmKur = async (kod: string, tip: string, yon: string, deger: number, tekrar: boolean, eposta: boolean) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('alarmlar').insert({
        varlik_kodu: kod, alarm_tipi: tip, yon_isareti: yon, hedef_deger: deger,
        tekrar_etsin_mi: tekrar, eposta_gonderilsin_mi: eposta
      }).select();
      if (!error && data) setAlarmVerileri([data[0], ...alarmVerileri]);
    } catch (e) { }
  };

  const alarmSil = async (id: string) => {
    try {
      await supabaseIstemcisi.from('alarmlar').delete().eq('id', id);
      setAlarmVerileri(alarmVerileri.filter(a => a.id !== id));
    } catch (e) { }
  };

  // ── Tarih/Saat Seçici & Geçmiş Fiyat Getirici ───────────────────────────────
  const onChangeTarih = (event: any, selectedDate?: Date) => {
    setTarihSeciciGoster(false);
    if (selectedDate) {
      const kopya = new Date(secilenTarihObj);
      kopya.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setSecilenTarihObj(kopya);
      setSaatSeciciGoster(true);
    }
  };

  const onChangeSaat = (event: any, selectedTime?: Date) => {
    setSaatSeciciGoster(false);
    if (selectedTime) {
      const kopya = new Date(secilenTarihObj);
      kopya.setHours(selectedTime.getHours());
      kopya.setMinutes(0);
      setSecilenTarihObj(kopya);
      const str = kopya.toISOString();
      if (ekleModalGorunurlugu || varlikSecimModali === 'ekle') setYeniTarih(str);
      if (duzenleModali) setDuzenleModali({ ...duzenleModali, alis_tarihi: str });
    }
  };

  const gecmisFiyatiAl = async (kod: string, tarihObj: Date, setFiyatFnc: any) => {
    try {
      const v = VARSAYILAN_HISSELER.find(x => x.sembol === kod);
      const sStr = v && v.kategori === 'BIST' ? `${v.sembol}.IS` : kod;

      const p1 = Math.floor(tarihObj.getTime() / 1000) - (86400 * 3);
      const p2 = Math.floor(tarihObj.getTime() / 1000) + (86400 * 3);

      const diffDays = (Date.now() - tarihObj.getTime()) / (1000 * 60 * 60 * 24);
      const interval = diffDays > 700 ? '1d' : '1h';

      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sStr}?period1=${p1}&period2=${p2}&interval=${interval}`);
      const data = await res.json();
      if (data.chart?.result) {
        const t = data.chart.result[0].timestamp;
        const q = data.chart.result[0].indicators.quote[0];

        const targetTS = Math.floor(tarihObj.getTime() / 1000);
        let bestDiff = Infinity;
        let bestPrice = null;

        if (t && q && q.close) {
          for (let i = 0; i < t.length; i++) {
            if (q.close[i] !== null) {
              const d = Math.abs(t[i] - targetTS);
              if (d < bestDiff) {
                bestDiff = d;
                bestPrice = q.close[i];
              }
            }
          }
        }

        if (bestPrice !== null) {
          setFiyatFnc(bestPrice.toFixed(4).toString());
          Alert.alert("Başarılı!", `Seçtiğiniz saate (veya ona en yakın açık piyasa saatine) ait fiyat: ₺${bestPrice.toFixed(2)}`);
          return;
        }
      }
      Alert.alert("Bulunamadı", "Belirttiğiniz tarih/saatte veri bulunamadı.");
    } catch (e) { Alert.alert("Hata", "Fiyat çekilemedi."); }
  };

  const fiyatlariGetir = async () => {
    const raw: Record<string, number> = {};
    const chunkSize = 5;
    for (let i = 0; i < VARSAYILAN_HISSELER.length; i += chunkSize) {
      const chunk = VARSAYILAN_HISSELER.slice(i, i + chunkSize);
      const promises = chunk.map(h => {
        const sStr = h.kategori === 'BIST' ? `${h.sembol}.IS` : h.sembol;
        return fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sStr}?range=1d&interval=1d`)
          .then(res => res.json())
          .then(data => {
            if (!data.chart?.result) return;
            const anlik = data.chart.result[0].meta.regularMarketPrice;
            if (anlik) raw[h.sembol] = anlik;
          }).catch(() => { });
      });
      await Promise.all(promises);
      // JS Thread'i rahatlat ve rate-limit'e takılmayı engelle
      await new Promise(res => setTimeout(res, 300));
    }

    setAnlikFiyatlar(prev => {
      const guncel = { ...prev, ...raw };
      alarmKontrol(guncel);
      return guncel;
    });
  };

  const alarmKontrol = (fiyatlar: Record<string, number>) => {
    alarmVerileri.forEach(alarm => {
      const f = fiyatlar[alarm.varlik_kodu];
      if (!f) return;
      let tetik = false;
      if (alarm.yon_isareti === '+' && f >= alarm.hedef_deger) tetik = true;
      if (alarm.yon_isareti === '-' && f <= alarm.hedef_deger) tetik = true;
      if (alarm.yon_isareti === '+/-' && (f >= alarm.hedef_deger || f <= alarm.hedef_deger)) tetik = true;

      if (tetik && !bildirimGidenler.has(alarm.id)) {
        Alert.alert("🚨 PİYASA ALARMI!", `${alarm.varlik_kodu} hedefi (${alarm.hedef_deger}) aşıldı!\nAnlık Fiyat: ₺${f.toFixed(2)}`);
        setBildirimGidenler(prev => new Set(prev).add(alarm.id));
      }
    });
  };

  useEffect(() => {
    verileriGetir();
    fiyatlariGetir();
    const int = setInterval(fiyatlariGetir, 30000);
    return () => clearInterval(int);
  }, []);

  // ── Detay Grafiği Verisi ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!detayModali) return;
    setDetayGrafikYukleniyor(true);

    const v = VARSAYILAN_HISSELER.find(x => x.sembol === detayModali.varlik_kodu);
    const sStr = v && v.kategori === 'BIST' ? `${v.sembol}.IS` : detayModali.varlik_kodu;

    let alisDate = detayModali.alis_tarihi ? new Date(detayModali.alis_tarihi) : new Date();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);
    if (alisDate > minDate) alisDate = minDate;

    const p1 = Math.floor(alisDate.getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000);

    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sStr}?period1=${p1}&period2=${p2}&interval=1d`)
      .then(r => r.json())
      .then(d => {
        if (d.chart?.result) {
          const q = d.chart.result[0].indicators.quote[0];
          const t = d.chart.result[0].timestamp;
          const chartData = [];
          if (t && q && q.close) {
            for (let i = 0; i < q.close.length; i++) {
              if (q.close[i] !== null) {
                const dateObj = new Date(t[i] * 1000);
                const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
                chartData.push({
                  close: q.close[i],
                  open: q.open[i] ?? q.close[i],
                  high: q.high[i] ?? q.close[i],
                  low: q.low[i] ?? q.close[i],
                  dateStr
                });
              }
            }
          }
          setDetayGrafikVerisi(chartData);

          const lastIdx = q.close.length - 1;
          setDetayEkstra({
            hacim: q.volume[lastIdx] || 0,
            yuksek: q.high[lastIdx] || 0,
            dusuk: q.low[lastIdx] || 0,
          });
        }
      })
      .catch(() => { })
      .finally(() => setDetayGrafikYukleniyor(false));
  }, [detayModali]);

  useEffect(() => {
    let toplam = 0, maliyet = 0;
    portfoyVerileri.forEach(p => {
      const fiyat = anlikFiyatlar[p.varlik_kodu] || p.alis_fiyati;
      toplam += (p.varlik_miktari * fiyat);
      maliyet += (p.varlik_miktari * p.alis_fiyati);
    });
    setToplamBakiye(toplam);
    setKarZararYuzdesi(maliyet > 0 ? ((toplam - maliyet) / maliyet) * 100 : 0);
  }, [portfoyVerileri, anlikFiyatlar]);

  const kategorizeEdilmis = useMemo(() => {
    const gruplar: Record<string, typeof VARSAYILAN_HISSELER> = {};
    const liste = aramaMetni
      ? VARSAYILAN_HISSELER.filter(v => v.sembol.toLowerCase().includes(aramaMetni.toLowerCase()) || v.sirketAdi.toLowerCase().includes(aramaMetni.toLowerCase()))
      : VARSAYILAN_HISSELER;

    liste.forEach(v => {
      const k = v.kategori || 'Diğer';
      if (!gruplar[k]) gruplar[k] = [];
      gruplar[k].push(v);
    });
    return gruplar;
  }, [aramaMetni]);

  const varlikSecti = (sembol: string) => {
    const fiy = anlikFiyatlar[sembol] ? anlikFiyatlar[sembol].toFixed(4) : '';
    if (varlikSecimModali === 'ekle') {
      setYeniKod(sembol);
      setYeniFiyat(fiy);
      setVarlikSecimModali(null);
      setEkleModalGorunurlugu(true);
    } else if (varlikSecimModali === 'alarm') {
      setAlarmKod(sembol);
      setAlarmDeger(fiy);
      setVarlikSecimModali(null);
      setModalGorunurlugu(true);
    } else if (varlikSecimModali === 'takip') {
      setVarlikSecimModali(null);
    }
    setAramaMetni('');
  };

  return (
    <View style={st.anaGövde}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={st.header}>
        <View style={st.ustBar}>
          <View style={{ width: 100, height: 44, overflow: 'visible', justifyContent: 'center' }}>
            <Logo genislik={400} yukseklik={160} style={{ marginLeft: -130, marginTop: 5 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Cuzdan')} style={st.cuzdanBtn}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#EAB308" />
              <Text style={st.cuzdanBtnYazi}>Cüzdanım</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profil')}>
              <MaterialIcons name="account-circle" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={st.bakiyeWidget}>
          <Text style={st.headerAltBaslik}>Toplam Portföy Değeri</Text>
          <Text style={st.headerBakiye}>₺{toplamBakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={[st.yuzdeRozet, { backgroundColor: karZararYuzdesi >= 0 ? '#10B98115' : '#EF444415' }]}>
            <MaterialIcons name={karZararYuzdesi >= 0 ? 'trending-up' : 'trending-down'} size={18} color={karZararYuzdesi >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[st.yuzdeMetin, { color: karZararYuzdesi >= 0 ? '#10B981' : '#EF4444' }]}>
              {karZararYuzdesi >= 0 ? '+' : ''}{karZararYuzdesi.toFixed(2)}% Tüm Zamanlar
            </Text>
          </View>
        </View>
      </View>

      <View style={st.sekmeKonteyner}>
        <TouchableOpacity style={[st.sekme, aktifSekme === 'Varlıklarım' && st.sekmeAktif]} onPress={() => setAktifSekme('Varlıklarım')}>
          <Text style={[st.sekmeMetni, aktifSekme === 'Varlıklarım' && st.sekmeMetniAktif]}>Varlıklarım</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.sekme, aktifSekme === 'Alarmlarım' && st.sekmeAktif]} onPress={() => setAktifSekme('Alarmlarım')}>
          <Text style={[st.sekmeMetni, aktifSekme === 'Alarmlarım' && st.sekmeMetniAktif]}>Alarmlarım</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollIcerik}>
        {yukleniyorDurumu ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
        ) : (
          aktifSekme === 'Varlıklarım' ? (
            <View style={st.listeKonteyner}>
              <TouchableOpacity style={st.ekleButonGeniş} onPress={() => setVarlikSecimModali('ekle')}>
                <MaterialIcons name="add-circle-outline" size={24} color="#10B981" />
                <Text style={st.ekleButonMetin}>Yeni Varlık Ekle</Text>
              </TouchableOpacity>

              {portfoyVerileri.map(item => {
                const fiyat = anlikFiyatlar[item.varlik_kodu] || item.alis_fiyati;
                const deger = item.varlik_miktari * fiyat;
                const kar = fiyat >= item.alis_fiyati;
                const hisse = VARSAYILAN_HISSELER.find(h => h.sembol === item.varlik_kodu);

                return (
                  <TouchableOpacity key={item.id} style={st.kart} activeOpacity={0.8} onPress={() => setDetayModali(item)}>
                    <View style={st.kartSol}>
                      <View style={{ marginRight: 12 }}>
                        <LogoResim sembol={item.varlik_kodu} sirketAdi={hisse?.sirketAdi} kategori={hisse?.kategori} boyut={40} />
                      </View>
                      <View>
                        <Text style={st.kartBaslik}>{item.varlik_kodu}</Text>
                        <Text style={st.kartAlt}>{item.varlik_miktari} Adet • Maliyet: {item.alis_fiyati.toFixed(2)}</Text>
                      </View>
                    </View>

                    <View style={st.kartSag}>
                      <Text style={st.kartDeger}>₺{deger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      <Text style={[st.kartFiyat, { color: kar ? '#10B981' : '#EF4444' }]}>
                        {kar ? '▲' : '▼'} ₺{fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={st.listeKonteyner}>
              <TouchableOpacity style={st.ekleButonGeniş} onPress={() => setVarlikSecimModali('alarm')}>
                <MaterialIcons name="add-alert" size={24} color="#EAB308" />
                <Text style={[st.ekleButonMetin, { color: '#EAB308' }]}>Yeni Alarm Kur</Text>
              </TouchableOpacity>

              {alarmVerileri.map(item => {
                const f = anlikFiyatlar[item.varlik_kodu] || 0;
                let tetiklendi = false;
                if (item.yon_isareti === '+' && f >= item.hedef_deger) tetiklendi = true;
                if (item.yon_isareti === '-' && f <= item.hedef_deger) tetiklendi = true;
                if (item.yon_isareti === '+/-' && (f >= item.hedef_deger || f <= item.hedef_deger)) tetiklendi = true;

                const hisse = VARSAYILAN_HISSELER.find(h => h.sembol === item.varlik_kodu);

                return (
                  <View key={item.id} style={st.kart}>
                    <View style={st.kartSol}>
                      <View style={{ marginRight: 12 }}>
                        <LogoResim sembol={item.varlik_kodu} sirketAdi={hisse?.sirketAdi} kategori={hisse?.kategori} boyut={40} />
                      </View>
                      <View style={{ width: SW * 0.35 }}>
                        <Text style={st.kartBaslik}>{item.varlik_kodu}</Text>
                        <Text style={st.kartAlt}>{item.alarm_tipi}</Text>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end', paddingRight: 8 }}>
                      <Text style={[st.kartDeger, { fontSize: 14 }]}>
                        {item.yon_isareti} ₺{item.hedef_deger.toLocaleString('tr-TR')}
                      </Text>
                      <View style={[st.yuzdeRozet, { backgroundColor: tetiklendi ? '#10B98115' : '#8A8B9215', paddingVertical: 4, marginTop: 4 }]}>
                        <Text style={[st.yuzdeMetin, { fontSize: 10, color: tetiklendi ? '#10B981' : '#8A8B92' }]}>
                          {tetiklendi ? 'Tetiklendi' : 'Aktif Bekliyor'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity style={st.silButon} onPress={() => alarmSil(item.id)}>
                      <MaterialIcons name="delete" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* ── VARLIK SEÇİM MODALI ── */}
      <Modal visible={!!varlikSecimModali} animationType="slide" transparent>
        <View style={st.modalTamEkran}>
          <View style={st.modalBaslikSatiri}>
            <Text style={st.modalAnaBaslik}>Varlık Seçin</Text>
            <TouchableOpacity onPress={() => setVarlikSecimModali(null)}>
              <MaterialIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          <TextInput style={st.aramaInput} placeholder="Hisse veya Kripto Ara..." placeholderTextColor="#8A8B92" value={aramaMetni} onChangeText={setAramaMetni} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {Object.keys(kategorizeEdilmis).map(kat => {
              const items = kategorizeEdilmis[kat];
              const limit = kategoriLimit[kat] || 5;
              const gosterilenler = items.slice(0, limit);
              return (
                <View key={kat} style={{ marginBottom: 20 }}>
                  <Text style={st.kategoriBaslik}>{kat.toUpperCase()}</Text>
                  {gosterilenler.map(v => (
                    <TouchableOpacity key={v.sembol} style={st.secimKart} onPress={() => varlikSecti(v.sembol)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <LogoResim sembol={v.sembol} sirketAdi={v.sirketAdi} kategori={v.kategori} boyut={40} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={st.secimKod}>{v.sembol}</Text>
                          <Text style={st.secimSirket} numberOfLines={1}>{v.sirketAdi}</Text>
                        </View>
                      </View>
                      <Text style={st.secimFiyat}>{anlikFiyatlar[v.sembol] ? `₺${anlikFiyatlar[v.sembol].toFixed(2)}` : '...'}</Text>
                    </TouchableOpacity>
                  ))}
                  {items.length > limit && (
                    <TouchableOpacity style={st.dahaFazlaButon} onPress={() => setKategoriLimit(p => ({ ...p, [kat]: limit + 5 }))}>
                      <Text style={st.dahaFazlaMetin}>Daha Fazla Göster</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── YENİ VARLIK DETAY (GRAFİK + YATIRIM ÖZETİ) MODALI ── */}
      <Modal visible={!!detayModali} animationType="slide" transparent>
        {detayModali && (() => {
          const sirketAdi = VARSAYILAN_HISSELER.find(h => h.sembol === detayModali.varlik_kodu)?.sirketAdi || 'Piyasa Verisi';
          const kategori = VARSAYILAN_HISSELER.find(h => h.sembol === detayModali.varlik_kodu)?.kategori;

          const toplamMaliyet = detayModali.varlik_miktari * detayModali.alis_fiyati;
          const guncelFiyat = anlikFiyatlar[detayModali.varlik_kodu] || detayModali.alis_fiyati;
          const suAnkiDeger = detayModali.varlik_miktari * guncelFiyat;
          const netKar = suAnkiDeger - toplamMaliyet;
          const karYuzdesi = toplamMaliyet > 0 ? (netKar / toplamMaliyet) * 100 : 0;
          const pozitif = netKar >= 0;

          return (
            <View style={st.modalTamEkran}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

                {/* LOGO & ISIM */}
                <View style={st.modalBaslikSatiri}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: SW - 80 }}>
                    <LogoResim sembol={detayModali.varlik_kodu} sirketAdi={sirketAdi} kategori={kategori} boyut={52} />
                    <View style={{ marginLeft: 16 }}>
                      <Text style={st.modalAnaBaslik}>{detayModali.varlik_kodu}</Text>
                      <Text style={st.kartAlt} numberOfLines={1}>{sirketAdi}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetayModali(null)}>
                    <MaterialIcons name="close" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* GRAFİK TİPİ SEÇİCİ */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, marginBottom: 8, gap: 16 }}>
                  <TouchableOpacity style={[st.grafikTipBtn, grafikTipi === 'cizgi' && st.grafikTipBtnAktif]} onPress={() => setGrafikTipi('cizgi')}>
                    <MaterialIcons name="show-chart" size={20} color={grafikTipi === 'cizgi' ? '#10B981' : '#8A8B92'} />
                    <Text style={[st.grafikTipMetin, grafikTipi === 'cizgi' && { color: '#10B981' }]}>Çizgi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.grafikTipBtn, grafikTipi === 'mum' && st.grafikTipBtnAktif]} onPress={() => setGrafikTipi('mum')}>
                    <MaterialIcons name="candlestick-chart" size={20} color={grafikTipi === 'mum' ? '#10B981' : '#8A8B92'} />
                    <Text style={[st.grafikTipMetin, grafikTipi === 'mum' && { color: '#10B981' }]}>Mum</Text>
                  </TouchableOpacity>
                </View>

                {/* GRAFİK ALANI */}
                {detayGrafikYukleniyor ? (
                  <View style={{ height: 260, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={{ color: '#8A8B92', marginTop: 12 }}>Grafik yükleniyor...</Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    <AnaSayfaGrafik
                      veriler={detayGrafikVerisi}
                      genislik={SW - 40}
                      yukseklik={260}
                      pozitif={pozitif}
                      alisFiyati={detayModali.alis_fiyati}
                      tip={grafikTipi}
                    />
                  </View>
                )}

                {/* GÜNLÜK PİYASA BİLGİLERİ (Finans Ekranı Stili) */}
                {detayEkstra && !detayGrafikYukleniyor && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                    <View style={st.ekstraKutu}>
                      <Text style={st.ekstraBaslik}>G. Yüksek</Text>
                      <Text style={st.ekstraDeger}>₺{detayEkstra.yuksek.toFixed(2)}</Text>
                    </View>
                    <View style={st.ekstraKutu}>
                      <Text style={st.ekstraBaslik}>G. Düşük</Text>
                      <Text style={st.ekstraDeger}>₺{detayEkstra.dusuk.toFixed(2)}</Text>
                    </View>
                    <View style={st.ekstraKutu}>
                      <Text style={st.ekstraBaslik}>Hacim</Text>
                      <Text style={st.ekstraDeger}>{(detayEkstra.hacim / 1000000).toFixed(1)}M</Text>
                    </View>
                  </View>
                )}

                {/* DEĞERLER VE İŞLEMLER (YATIRIM ÖZETİ) */}
                <View style={st.ozetKutu}>
                  <Text style={st.ozetAnaBaslik}>YATIRIM ÖZETİNİZ</Text>

                  <View style={st.ozetSatiri}>
                    <Text style={st.ozetEtiket}>Alış Tarihi</Text>
                    <Text style={st.ozetDeger}>{new Date(detayModali.alis_tarihi).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</Text>
                  </View>

                  <View style={st.ozetSatiri}>
                    <Text style={st.ozetEtiket}>Adet (Miktar)</Text>
                    <Text style={st.ozetDeger}>{detayModali.varlik_miktari}</Text>
                  </View>

                  <View style={st.ozetSatiri}>
                    <Text style={st.ozetEtiket}>Birim Maliyet</Text>
                    <Text style={st.ozetDeger}>₺{detayModali.alis_fiyati.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                  </View>

                  <View style={st.ozetSatiri}>
                    <Text style={st.ozetEtiket}>Güncel Birim Fiyat</Text>
                    <Text style={st.ozetDeger}>₺{guncelFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                  </View>

                  <View style={[st.ozetSatiri, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#222222' }]}>
                    <Text style={st.ozetEtiket}>Toplam Harcanan Tutar</Text>
                    <Text style={st.ozetDeger}>₺{toplamMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                  </View>

                  <View style={st.ozetSatiri}>
                    <Text style={[st.ozetEtiket, { color: '#FFF' }]}>Güncel Toplam Değer</Text>
                    <Text style={[st.ozetDeger, { fontSize: 18, color: '#FFF' }]}>₺{suAnkiDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                  </View>

                  <View style={[st.ozetSatiri, { marginBottom: 0 }]}>
                    <Text style={[st.ozetEtiket, { color: pozitif ? '#10B981' : '#EF4444' }]}>Net Kar/Zarar</Text>
                    <Text style={[st.ozetDeger, { fontSize: 20, color: pozitif ? '#10B981' : '#EF4444' }]}>
                      {pozitif ? '+' : ''}₺{netKar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ({pozitif ? '+' : ''}{karYuzdesi.toFixed(2)}%)
                    </Text>
                  </View>
                </View>

                {/* İŞLEMLER / BUTONLAR */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity style={st.duzenleDevButon} onPress={() => {
                    setDuzenleModali(detayModali);
                    setDetayModali(null);
                  }}>
                    <MaterialIcons name="edit" size={20} color="#000" />
                    <Text style={{ color: '#000', fontWeight: 'bold', marginLeft: 8 }}>Düzenle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={st.silDevButon} onPress={() => varlikSil(detayModali.id)}>
                    <MaterialIcons name="delete" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          );
        })()}
      </Modal>

      {/* ── DÜZENLE MODALI ── */}
      <Modal visible={!!duzenleModali} transparent animationType="slide">
        {duzenleModali && (
          <View style={st.modalArka}>
            <View style={st.modalKutu}>
              <Text style={st.modalBaslik}>{duzenleModali.varlik_kodu} Düzenle</Text>

              <Text style={st.inputEtiket}>Alış Tarihi ve Saati</Text>
              <View style={st.inputSatiri}>
                <TouchableOpacity onPress={() => setTarihSeciciGoster(true)} style={[st.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFF' }}>{new Date(duzenleModali.alis_tarihi).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.fiyatCekButon} onPress={() => gecmisFiyatiAl(duzenleModali.varlik_kodu, new Date(duzenleModali.alis_tarihi), (fiy: any) => setDuzenleModali({ ...duzenleModali, alis_fiyati: parseFloat(fiy) }))}>
                  <MaterialIcons name="auto-graph" size={20} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>Geçmiş Fiyat</Text>
                </TouchableOpacity>
              </View>

              <Text style={[st.inputEtiket, { marginTop: 16 }]}>Miktar (Adet)</Text>
              <TextInput style={st.input} keyboardType="numeric" value={duzenleModali.varlik_miktari.toString()} onChangeText={m => setDuzenleModali({ ...duzenleModali, varlik_miktari: parseFloat(m) || 0 })} />

              <Text style={st.inputEtiket}>Alış Fiyatı (Maliyet)</Text>
              <TextInput style={st.input} keyboardType="numeric" value={duzenleModali.alis_fiyati.toString()} onChangeText={f => setDuzenleModali({ ...duzenleModali, alis_fiyati: parseFloat(f) || 0 })} />

              <View style={st.modalButonSatir}>
                <TouchableOpacity style={st.modalKapatBtn} onPress={() => setDuzenleModali(null)}>
                  <Text style={st.modalKapatMetin}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalOnayBtn} onPress={() => {
                  varlikGuncelle(duzenleModali.id, duzenleModali.varlik_miktari, duzenleModali.alis_fiyati, duzenleModali.alis_tarihi);
                  setDuzenleModali(null);
                }}>
                  <Text style={st.modalOnayMetin}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* ── EKLE VE ALARM MODALLARI ── */}
      <Modal visible={ekleModalGorunurlugu} transparent animationType="slide">
        <View style={st.modalArka}>
          <View style={st.modalKutu}>
            <Text style={st.modalBaslik}>{yeniKod} - Portföye Ekle</Text>

            <Text style={st.inputEtiket}>Alış Tarihi ve Saati</Text>
            <View style={st.inputSatiri}>
              <TouchableOpacity onPress={() => setTarihSeciciGoster(true)} style={[st.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}>
                <Text style={{ color: '#FFF' }}>{secilenTarihObj.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.fiyatCekButon} onPress={() => gecmisFiyatiAl(yeniKod, secilenTarihObj, setYeniFiyat)}>
                <MaterialIcons name="auto-graph" size={20} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>Geçmiş Fiyat</Text>
              </TouchableOpacity>
            </View>

            <Text style={[st.inputEtiket, { marginTop: 16 }]}>Miktar (Adet)</Text>
            <TextInput style={st.input} keyboardType="numeric" value={yeniMiktar} onChangeText={setYeniMiktar} />

            <Text style={st.inputEtiket}>Alış Fiyatı (Maliyet)</Text>
            <TextInput style={st.input} keyboardType="numeric" value={yeniFiyat} onChangeText={setYeniFiyat} />

            <View style={st.modalButonSatir}>
              <TouchableOpacity style={st.modalKapatBtn} onPress={() => setEkleModalGorunurlugu(false)}>
                <Text style={st.modalKapatMetin}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalOnayBtn} onPress={() => {
                if (yeniKod && yeniMiktar && yeniFiyat && yeniTarih) {
                  varlikEkle(yeniKod, parseFloat(yeniMiktar), parseFloat(yeniFiyat), yeniTarih);
                  setEkleModalGorunurlugu(false);
                  setYeniKod(''); setYeniMiktar(''); setYeniFiyat('');
                }
              }}>
                <Text style={st.modalOnayMetin}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalGorunurlugu} transparent animationType="slide">
        <View style={st.modalArka}>
          <View style={st.modalKutu}>
            <View style={st.alarmBadge}>
              <MaterialIcons name="timer" size={16} color="#EAB308" />
              <Text style={st.alarmBadgeMetin}>{alarmKod} Fiyat Alarmı</Text>
            </View>
            <Text style={st.modalBaslik}>Alarm Kur</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['Hedef Fiyat', 'Değişim Yüzdesi'].map(t => (
                <TouchableOpacity key={t} style={[st.yonBtn, alarmTip === t && st.yonBtnAktif]} onPress={() => setAlarmTip(t)}>
                  <Text style={[st.yonBtnMetin, alarmTip === t && st.yonBtnMetinAktif, { fontSize: 13 }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.yonSecici}>
              {['+', '-', '+/-'].map(y => (
                <TouchableOpacity key={y} style={[st.yonBtn, alarmYon === y && st.yonBtnAktif]} onPress={() => setAlarmYon(y)}>
                  <Text style={[st.yonBtnMetin, alarmYon === y && st.yonBtnMetinAktif]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.inputEtiket}>Hedef Değer (Anlık fiyat: ₺{anlikFiyatlar[alarmKod]?.toFixed(4)})</Text>
            <TextInput style={st.input} keyboardType="numeric" value={alarmDeger} onChangeText={setAlarmDeger} />
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity 
                style={[st.grafikTipBtn, { flex: 1 }, alarmTekrar && st.grafikTipBtnAktif]} 
                onPress={() => setAlarmTekrar(!alarmTekrar)}
              >
                <MaterialIcons name={alarmTekrar ? "check-box" : "check-box-outline-blank"} size={20} color={alarmTekrar ? "#10B981" : "#8A8B92"} />
                <Text style={[st.grafikTipMetin, alarmTekrar && { color: '#10B981' }]}>Tekrar Et</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[st.grafikTipBtn, { flex: 1 }, alarmEposta && st.grafikTipBtnAktif]} 
                onPress={() => setAlarmEposta(!alarmEposta)}
              >
                <MaterialIcons name={alarmEposta ? "email" : "mail-outline"} size={20} color={alarmEposta ? "#10B981" : "#8A8B92"} />
                <Text style={[st.grafikTipMetin, alarmEposta && { color: '#10B981' }]}>E-Posta</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={st.altinButon} onPress={() => {
              if (alarmKod && alarmDeger) { 
                alarmKur(alarmKod, alarmTip, alarmYon, parseFloat(alarmDeger), alarmTekrar, alarmEposta); 
                setModalGorunurlugu(false); 
                setAlarmKod(''); setAlarmDeger(''); setAlarmTekrar(false); setAlarmEposta(false); 
              }
            }}>
              <Text style={st.altinButonMetin}>Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.iptalButon} onPress={() => setModalGorunurlugu(false)}>
              <Text style={st.iptalButonMetin}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NATIVE PICKERS */}
      {tarihSeciciGoster && (
        // @ts-ignore
        <DateTimePicker value={secilenTarihObj} mode="date" display="default" onChange={onChangeTarih} />
      )}
      {saatSeciciGoster && (
        // @ts-ignore
        <DateTimePicker value={secilenTarihObj} mode="time" display="default" minuteInterval={60} onChange={onChangeSaat} />
      )}

    </View>
  );
}

const st = StyleSheet.create({
  anaGövde: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  ustBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  bakiyeWidget: { backgroundColor: '#111111', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222222', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  headerAltBaslik: { color: '#8A8B92', fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  headerBakiye: { color: '#FFF', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  cuzdanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAB30815', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EAB30830' },
  cuzdanBtnYazi: { color: '#EAB308', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  yuzdeRozet: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  yuzdeMetin: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  sekmeKonteyner: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#111111', borderRadius: 12, padding: 4, marginBottom: 16 },
  sekme: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  sekmeAktif: { backgroundColor: '#222222' },
  sekmeMetni: { color: '#8A8B92', fontSize: 14, fontWeight: '600' },
  sekmeMetniAktif: { color: '#FFF' },
  scrollIcerik: { paddingHorizontal: 24, paddingBottom: 100 },
  listeKonteyner: { marginTop: 8 },
  ekleButonGeniş: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B98115', padding: 14, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#10B98130', borderStyle: 'dashed' },
  ekleButonMetin: { color: '#10B981', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  kart: { backgroundColor: '#111111', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kartSol: { flexDirection: 'row', alignItems: 'center' },
  kartBaslik: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  kartAlt: { color: '#8A8B92', fontSize: 13, fontWeight: '500' },
  kartSag: { alignItems: 'flex-end' },
  kartDeger: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  kartFiyat: { fontSize: 13, fontWeight: '600' },
  fiyatBalon: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  balonMetin: { fontSize: 14, fontWeight: '700' },
  silButon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  silDevButon: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: 60 },
  duzenleDevButon: { flex: 1, flexDirection: 'row', backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', shadowColor: '#EAB308', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalKutu: { backgroundColor: '#111111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalBaslik: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  inputEtiket: { color: '#8A8B92', fontSize: 12, marginBottom: 4, marginLeft: 4, fontWeight: 'bold' },
  inputSatiri: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: { backgroundColor: '#000000', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222222' },
  fiyatCekButon: { padding: 12, backgroundColor: '#10B98115', borderRadius: 12, borderWidth: 1, borderColor: '#10B98130', alignItems: 'center', justifyContent: 'center', height: 56 },
  modalButonSatir: { flexDirection: 'row', gap: 12 },
  modalKapatBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#222222', alignItems: 'center' },
  modalKapatMetin: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOnayBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  modalOnayMetin: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  alarmBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAB30820', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  alarmBadgeMetin: { color: '#EAB308', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  yonSecici: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  yonBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#000000', borderWidth: 1, borderColor: '#222222', alignItems: 'center' },
  yonBtnAktif: { backgroundColor: '#EAB30820', borderColor: '#EAB308' },
  yonBtnMetin: { color: '#8A8B92', fontSize: 16, fontWeight: '700' },
  yonBtnMetinAktif: { color: '#EAB308' },
  altinButon: { backgroundColor: '#EAB308', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  altinButonMetin: { color: '#000000', fontSize: 16, fontWeight: '800' },
  iptalButon: { padding: 16, alignItems: 'center', marginTop: 8 },
  iptalButonMetin: { color: '#8A8B92', fontSize: 15, fontWeight: '600' },
  modalTamEkran: { flex: 1, backgroundColor: '#000000', paddingTop: 60, paddingHorizontal: 20 },
  modalBaslikSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalAnaBaslik: { color: '#FFF', fontSize: 24, fontWeight: '800' },

  // Detay Grafiği Butonları ve Kutu Düzeni
  grafikTipBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222' },
  grafikTipBtnAktif: { backgroundColor: '#10B98115', borderColor: '#10B98150' },
  grafikTipMetin: { color: '#8A8B92', marginLeft: 6, fontWeight: 'bold' },

  ekstraKutu: { backgroundColor: '#111111', padding: 12, borderRadius: 12, width: (SW - 60) / 3, alignItems: 'center' },
  ekstraBaslik: { color: '#8A8B92', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  ekstraDeger: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Yeni Yatırım Özeti
  ozetKutu: { backgroundColor: '#111111', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#222222' },
  ozetAnaBaslik: { color: '#8A8B92', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  ozetSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ozetEtiket: { color: '#8A8B92', fontSize: 14, fontWeight: '600' },
  ozetDeger: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  aramaInput: { backgroundColor: '#111111', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222222' },
  kategoriBaslik: { color: '#8A8B92', fontSize: 14, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  secimKart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#111111', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#222222' },
  secimKod: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secimSirket: { color: '#8A8B92', fontSize: 13, marginTop: 4, maxWidth: SW * 0.4 },
  secimFiyat: { color: '#10B981', fontSize: 16, fontWeight: '700' },
  dahaFazlaButon: { backgroundColor: '#111111', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#222222', borderStyle: 'dashed' },
  dahaFazlaMetin: { color: '#8A8B92', fontSize: 14, fontWeight: '700' }
});
