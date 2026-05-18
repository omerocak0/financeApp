import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, ActivityIndicator, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../sabitler/api';

const { width: SW } = Dimensions.get('window');

// ── Tip Tanımları ─────────────────────────────────────────────────────────────

type RiskDurumu = 'DUSUK' | 'ORTA' | 'YUKSEK';

interface OnerilenHisse {
  hisse_kodu: string;
  oneri_nedeni: string;
  guven_skoru: number;
  risk_durumu: RiskDurumu;
}

interface StratejiSonucu {
  kullanici_profili: string;
  strateji_ozeti: string;
  onerilen_hisseler: OnerilenHisse[];
}

interface AnketCevaplari {
  amac: string;
  psikoloji: string;
  deneyim: string;
  vade: string;
  butce_orani: string;
  sektor_tercihi: string;
}

// ── Anket Soruları (6 Adım) ───────────────────────────────────────────────────

const SORULAR = [
  {
    id: 'amac',
    baslik: 'Bu yatırımla birincil amacınız nedir?',
    alt: 'Finansal hedefinizi belirleyelim.',
    ikon: 'track-changes' as const,
    secenekler: [
      { deger: 'Enflasyona karsi parayi korumak', etiket: 'Enflasyona Karşı Korumak', alt: 'Sermayemi güvene almak', ikon: 'shield' as const },
      { deger: 'Duzenli temettu geliri elde etmek', etiket: 'Düzenli Temettü Geliri', alt: 'Pasif gelir yaratmak', ikon: 'payments' as const },
      { deger: 'Agresif buyume ve sermaye artisi', etiket: 'Agresif Büyüme', alt: 'Yüksek sermaye artışı', ikon: 'rocket-launch' as const },
    ],
  },
  {
    id: 'psikoloji',
    baslik: 'Yatırımınız bir ayda %20 değer kaybetse ne yaparsınız?',
    alt: 'Piyasa dalgalanmalarına karşı tepkiniz nedir?',
    ikon: 'psychology' as const,
    secenekler: [
      { deger: 'Panik yapip hemen satarim', etiket: 'Panik Yapıp Satarım', alt: 'Zararı kesmek isterim', ikon: 'mood-bad' as const },
      { deger: 'Sakin kalip piyasayi beklerim', etiket: 'Sakin Kalıp Beklerim', alt: 'Uzun vadeye odaklanırım', ikon: 'self-improvement' as const },
      { deger: 'Firsat bilip ekstra alim yaparim', etiket: 'Ekstra Alım Yaparım', alt: 'Ortalama düşürürüm', ikon: 'trending-up' as const },
    ],
  },
  {
    id: 'deneyim',
    baslik: 'Borsa konusundaki deneyiminiz nedir?',
    alt: 'Finansal okuryazarlık seviyeniz.',
    ikon: 'school' as const,
    secenekler: [
      { deger: 'Tamamen yeniyim', etiket: 'Tamamen Yeniyim', alt: 'Henüz öğreniyorum', ikon: 'child-care' as const },
      { deger: 'Orta duzeydeyim (Temel kavramlar)', etiket: 'Orta Düzeydeyim', alt: 'Temel kavramlara hakimim', ikon: 'book' as const },
      { deger: 'Deneyimli (Bilanco okuyabilirim)', etiket: 'Deneyimliyim', alt: 'Bilanço ve grafik okurum', ikon: 'menu-book' as const },
    ],
  },
  {
    id: 'vade',
    baslik: 'Yatırdığınız paraya ne kadar dokunmayacaksınız?',
    alt: 'Yatırım ufkunuzu seçin.',
    ikon: 'schedule' as const,
    secenekler: [
      { deger: 'Kisa Vade (1-3 Ay)', etiket: 'Kısa Vade', alt: '1 - 3 Ay', ikon: 'flash-on' as const },
      { deger: 'Orta Vade (3-12 Ay)', etiket: 'Orta Vade', alt: '3 - 12 Ay', ikon: 'calendar-today' as const },
      { deger: 'Uzun Vade (1 Yil ve uzeri)', etiket: 'Uzun Vade', alt: '1 Yıl ve üzeri', ikon: 'landscape' as const },
    ],
  },
  {
    id: 'butce_orani',
    baslik: 'Net gelirinizin ne kadarını yatırıyorsunuz?',
    alt: 'Aylık birikim kapasiteniz.',
    ikon: 'account-balance-wallet' as const,
    secenekler: [
      { deger: '%10 dan daha az', etiket: '%10\'dan Daha Az', alt: 'Küçük bir miktar', ikon: 'pie-chart-outline' as const },
      { deger: '%10 ile %30 arasi', etiket: '%10 ile %30 Arası', alt: 'Makul bir miktar', ikon: 'pie-chart' as const },
      { deger: '%30 dan daha fazla', etiket: '%30\'dan Daha Fazla', alt: 'Büyük bir miktar', ikon: 'donut-large' as const },
    ],
  },
  {
    id: 'sektor_tercihi',
    baslik: 'Hangi sektörlere yoğunlaşalım?',
    alt: 'AI algoritmamızın tarayacağı alanlar.',
    ikon: 'category' as const,
    secenekler: [
      { deger: 'Geleneksel Sektorler (Sanayi/Holding)', etiket: 'Geleneksel Sektörler', alt: 'Sanayi, Holding, Banka', ikon: 'factory' as const },
      { deger: 'Yenilikci Sektorler (Teknoloji/Savunma)', etiket: 'Yenilikçi Sektörler', alt: 'Teknoloji, Bilişim, Savunma', ikon: 'memory' as const },
      { deger: 'Fark etmez (Gemini Secsin)', etiket: 'Fark Etmez', alt: 'Yapay zekaya bırakıyorum', ikon: 'auto-awesome' as const },
    ],
  },
];

// ── Fallback Mock Verisi ──────────────────────────────────────────────────────

const fallbackOlustur = (cevaplar: AnketCevaplari): StratejiSonucu => {
  const agresifMi = cevaplar.amac.includes('Agresif') || cevaplar.psikoloji.includes('Firsat');

  if (agresifMi) {
    return {
      kullanici_profili: 'Cesur ve Büyüme Odaklı Yatırımcı',
      strateji_ozeti:
        'Yüksek risk toleransınız ve agresif büyüme hedefiniz doğrultusunda, kısa vadeli volatilitesi yüksek ancak uzun vadeli getirisi güçlü olabilecek teknoloji ve sanayi hisseleri önerilmektedir. Piyasa düşüşlerini alım fırsatı olarak değerlendirme psikolojiniz, bu stratejinin başarı şansını artırıyor.',
      onerilen_hisseler: [
        { hisse_kodu: 'PGSUS', oneri_nedeni: 'Sektörel toparlanma ve agresif operasyonel büyüme hedefleri, yüksek getiri potansiyeli barındırıyor.', guven_skoru: 62, risk_durumu: 'YUKSEK' },
        { hisse_kodu: 'MIATK', oneri_nedeni: 'Teknoloji ve bilişim sektöründeki yenilikçi adımları, portföyünüzün büyüme ivmesini hızlandırabilir.', guven_skoru: 58, risk_durumu: 'YUKSEK' },
        { hisse_kodu: 'ASELS', oneri_nedeni: 'Savunma sanayiinin öncüsü olarak, güvenli liman olmakla birlikte ihracat potansiyeliyle büyüme sunar.', guven_skoru: 75, risk_durumu: 'ORTA' },
      ],
    };
  } else {
    return {
      kullanici_profili: 'Temkinli ve Defansif Yatırımcı',
      strateji_ozeti:
        'Sermayenizi koruma ve stabil büyüme hedefiniz doğrultusunda, endeks ağırlığı yüksek, düzenli temettü ödeyen ve ekonomik dalgalanmalara dayanıklı holding/gıda hisselerinden oluşan bir defansif portföy önerilmektedir.',
      onerilen_hisseler: [
        { hisse_kodu: 'BIMAS', oneri_nedeni: 'Gıda perakende sektöründeki liderliği ve defansif yapısı, enflasyonist ortamlarda anaparayı korur.', guven_skoru: 88, risk_durumu: 'DUSUK' },
        { hisse_kodu: 'KCHOL', oneri_nedeni: 'Çeşitlendirilmiş holding yapısı ve güçlü nakit akışı sayesinde uzun vadeli güvenli büyüme sağlar.', guven_skoru: 85, risk_durumu: 'DUSUK' },
        { hisse_kodu: 'DOAS', oneri_nedeni: 'Düzenli ve yüksek temettü verimi, pasif gelir beklentinizi destekleyen önemli bir unsurdur.', guven_skoru: 78, risk_durumu: 'ORTA' },
      ],
    };
  }
};

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

const riskRengi = (risk: RiskDurumu) => {
  if (risk === 'DUSUK') return '#4CAF50';
  if (risk === 'ORTA') return '#FF9800';
  return '#D32F2F';
};

const guvenRengi = (skor: number) => {
  if (skor >= 70) return '#4CAF50';
  if (skor >= 50) return '#FF9800';
  return '#D32F2F';
};

// ── Alt Bileşenler ────────────────────────────────────────────────────────────

const HisseKarti: React.FC<{ hisse: OnerilenHisse; indeks: number }> = ({ hisse, indeks }) => {
  const rRenk = riskRengi(hisse.risk_durumu);
  const gRenk = guvenRengi(hisse.guven_skoru);
  return (
    <View style={az.hisseKarti}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={az.hisseKod}>{hisse.hisse_kodu}</Text>
        <View style={[az.riskBadge, { backgroundColor: rRenk + '15', borderColor: rRenk + '40' }]}>
          <Text style={[az.riskBadgeMetin, { color: rRenk }]}>{hisse.risk_durumu} RİSK</Text>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 11, color: '#888', fontWeight: '500' }}>AI Güven Skoru</Text>
          <Text style={[{ fontSize: 11, fontWeight: '800' }, { color: gRenk }]}>{hisse.guven_skoru}%</Text>
        </View>
        <View style={az.cubukArka}>
          <View style={[az.cubukOn, { width: `${hisse.guven_skoru}%` as any, backgroundColor: gRenk }]} />
        </View>
      </View>

      <View style={az.oneriKutu}>
        <Text style={az.oneriNedeni}>{hisse.oneri_nedeni}</Text>
      </View>
    </View>
  );
};

const YukleniyorEkrani: React.FC = () => (
  <View style={az.yukleniyorKont}>
    <View style={az.yukleniyorIkonDaire}>
      <MaterialIcons name="insights" size={32} color="#D32F2F" />
    </View>
    <ActivityIndicator size="large" color="#D32F2F" style={{ marginTop: 24, marginBottom: 16 }} />
    <Text style={az.yukleniyorBaslik}>AI Portföyünüz Hazırlanıyor</Text>
    <Text style={az.yukleniyorAlt}>
      BIST verileri taranıyor, risk profiliniz hesaplanıyor ve size en uygun hisseler seçiliyor...
    </Text>
  </View>
);

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

const AnaSayfa: React.FC = () => {
  const [aktifAdim, setAktifAdim] = useState(0);
  const [anketCevaplari, setAnketCevaplari] = useState<AnketCevaplari>({
    amac: '', psikoloji: '', deneyim: '', vade: '', butce_orani: '', sektor_tercihi: ''
  });
  const [yukleniyorDurumu, setYukleniyorDurumu] = useState(false);
  const [stratejiSonucu, setStratejiSonucu] = useState<StratejiSonucu | null>(null);

  // Animasyon state'leri
  const [fadeAnim] = useState(new Animated.Value(1));

  const animateAdimGecisi = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
    ]).start();

    setTimeout(callback, 150);
  };

  const canliStratejiGetir = async (cevaplar: AnketCevaplari) => {
    setYukleniyorDurumu(true);
    try {
      const res = await fetch(`${API_URL}/strateji`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cevaplar),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StratejiSonucu = await res.json();
      setStratejiSonucu(data);
    } catch (e) {
      console.warn('[Strateji] API hatasi, fallback kullaniliyor:', e);
      setStratejiSonucu(fallbackOlustur(cevaplar));
    } finally {
      setYukleniyorDurumu(false);
    }
  };

  const secenekSec = (anahtarAdi: keyof AnketCevaplari, deger: string) => {
    const yeniCevaplar = { ...anketCevaplari, [anahtarAdi]: deger };
    setAnketCevaplari(yeniCevaplar);

    if (aktifAdim < SORULAR.length - 1) {
      animateAdimGecisi(() => setAktifAdim(aktifAdim + 1));
    } else {
      canliStratejiGetir(yeniCevaplar);
    }
  };

  const anketiSifirla = () => {
    setAktifAdim(0);
    setAnketCevaplari({ amac: '', psikoloji: '', deneyim: '', vade: '', butce_orani: '', sektor_tercihi: '' });
    setStratejiSonucu(null);
    setYukleniyorDurumu(false);
  };

  const mevcutSoru = SORULAR[aktifAdim];
  const ilerlemeYuzdesi = ((aktifAdim) / SORULAR.length) * 100;

  return (
    <View style={az.kont}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={az.scrollIcerik}>

        {/* ── Sayfa Başlığı ── */}
        <View style={az.sayfaBaslikKont}>
          <View>
            <Text style={az.sayfaBaslik}>Ana Sayfa</Text>
          </View>
        </View>

        {/* ── Ana Kart ── */}
        <View style={az.anaKart}>
          {/* Neon Üst Çizgi */}
          <LinearGradient colors={['#D32F2F', '#8E0000']} style={az.ustCizgi} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />

          {/* Kart İçeriği */}
          <View style={az.kartIcerik}>

            {yukleniyorDurumu ? (
              <YukleniyorEkrani />
            ) : stratejiSonucu ? (
              /* ── SONUÇ EKRANI ── */
              <View style={az.sonucKont}>
                <View style={az.sonucHeader}>
                  <MaterialIcons name="check-circle" size={24} color="#D32F2F" />
                  <Text style={az.profilBaslik}>Analiz Tamamlandı</Text>
                </View>

                <Text style={az.kullaniciProfili}>"{stratejiSonucu.kullanici_profili}"</Text>

                <View style={az.ozetKutu}>
                  <Text style={az.ozetMetin}>{stratejiSonucu.strateji_ozeti}</Text>
                </View>

                <View style={az.ayirici} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <MaterialIcons name="radar" size={20} color="#D32F2F" />
                  <Text style={az.hisseBaslik}>AI Seçimi Hisseler</Text>
                </View>

                <View style={az.hisseListesiKont}>
                  {stratejiSonucu.onerilen_hisseler.map((h, i) => (
                    <HisseKarti key={h.hisse_kodu} hisse={h} indeks={i} />
                  ))}
                </View>

                <TouchableOpacity style={az.sifirlaBtn} onPress={anketiSifirla} activeOpacity={0.8}>
                  <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={az.sifirlaMetin}>Yeni Bir Strateji Oluştur</Text>
                </TouchableOpacity>
              </View>

            ) : (
              /* ── ANKET EKRANI ── */
              <View style={az.anketKont}>
                {/* İlerleme Çubuğu */}
                <View style={az.ilerlemeKont}>
                  <View style={az.ilerlemeArka}>
                    <View style={[az.ilerlemeOn, { width: `${ilerlemeYuzdesi}%` }]} />
                  </View>
                  <Text style={az.adimMetin}>Adım {aktifAdim + 1} / {SORULAR.length}</Text>
                </View>

                <Animated.View style={{ opacity: fadeAnim }}>
                  <View style={az.soruKont}>
                    <View style={az.soruIkonKutu}>
                      <MaterialIcons name={mevcutSoru.ikon} size={24} color="#D32F2F" />
                    </View>
                    <Text style={az.soruBaslik}>{mevcutSoru.baslik}</Text>
                    <Text style={az.soruAlt}>{mevcutSoru.alt}</Text>
                  </View>

                  <View style={az.seceneklerGrid}>
                    {mevcutSoru.secenekler.map((s) => (
                      <TouchableOpacity
                        key={s.deger}
                        style={az.secenekKutu}
                        onPress={() => secenekSec(mevcutSoru.id as keyof AnketCevaplari, s.deger)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name={s.ikon} size={28} color="#555" style={az.secenekIkon} />
                        <View>
                          <Text style={az.secenekEtiket}>{s.etiket}</Text>
                          <Text style={az.secenekAlt}>{s.alt}</Text>
                        </View>
                        <View style={az.secenekOk}>
                          <MaterialIcons name="arrow-forward-ios" size={14} color="#333" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

// ── Stiller ───────────────────────────────────────────────────────────────────

const az = StyleSheet.create({
  kont: { flex: 1, backgroundColor: '#0A0A0A' }, // Deepest Black
  scrollIcerik: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 100 },

  // Header
  sayfaBaslikKont: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sayfaBaslik: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  sayfaAltBaslik: { fontSize: 13, color: '#888', marginTop: 4, fontWeight: '500' },
  avatarDaire: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },

  // Ana Kart
  anaKart: { backgroundColor: '#141414', borderRadius: 20, borderWidth: 1, borderColor: '#222', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  ustCizgi: { height: 4, width: '100%' },
  kartIcerik: { padding: 20 },

  // Anket Bölümü
  anketKont: { paddingBottom: 10 },
  ilerlemeKont: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  ilerlemeArka: { flex: 1, height: 4, backgroundColor: '#222', borderRadius: 2, marginRight: 16, overflow: 'hidden' },
  ilerlemeOn: { height: 4, backgroundColor: '#D32F2F', borderRadius: 2 },
  adimMetin: { fontSize: 12, color: '#666', fontWeight: '700', letterSpacing: 1 },

  soruKont: { marginBottom: 28, alignItems: 'center' },
  soruIkonKutu: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#200A0A', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#3A1010' },
  soruBaslik: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, lineHeight: 30 },
  soruAlt: { fontSize: 14, color: '#888', textAlign: 'center' },

  seceneklerGrid: { gap: 12 },
  secenekKutu: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  secenekIkon: { marginRight: 16 },
  secenekEtiket: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  secenekAlt: { fontSize: 12, color: '#888' },
  secenekOk: { marginLeft: 'auto', width: 28, height: 28, borderRadius: 14, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },

  // Yükleniyor
  yukleniyorKont: { alignItems: 'center', paddingVertical: 40 },
  yukleniyorIkonDaire: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#200A0A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A1010' },
  yukleniyorBaslik: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  yukleniyorAlt: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginTop: 12, paddingHorizontal: 20 },

  // Sonuç Bölümü
  sonucKont: { paddingTop: 10 },
  sonucHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' },
  profilBaslik: { fontSize: 14, fontWeight: '700', color: '#D32F2F', textTransform: 'uppercase', letterSpacing: 1 },
  kullaniciProfili: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 20, lineHeight: 32 },

  ozetKutu: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, borderWidth: 1, borderLeftWidth: 4, borderColor: '#2A2A2A', borderLeftColor: '#D32F2F', marginBottom: 24 },
  ozetMetin: { fontSize: 14, color: '#CCC', lineHeight: 22 },

  ayirici: { height: 1, backgroundColor: '#222', marginBottom: 24 },

  hisseBaslik: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  hisseListesiKont: { gap: 16, marginBottom: 28 },
  hisseKarti: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  hisseKod: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },

  riskBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  riskBadgeMetin: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  cubukArka: { height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  cubukOn: { height: 6, borderRadius: 3 },

  oneriKutu: { backgroundColor: '#141414', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#222' },
  oneriNedeni: { fontSize: 13, color: '#AAA', lineHeight: 20 },

  sifirlaBtn: { backgroundColor: '#D32F2F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  sifirlaMetin: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});

export default AnaSayfa;
