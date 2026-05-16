import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { RENKLER } from '../sabitler/renkler';

const { width: SW } = Dimensions.get('window');

interface HaberAnalizVerisi {
  ozet: string;
  manipulasyon_skoru: number;
  risk_seviyesi: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
  eylem_onerisi: string;
}

interface Props {
  baslik: string;
  analiz: HaberAnalizVerisi;
}

const HaberAnalizKarti: React.FC<Props> = ({ baslik, analiz }) => {
  const s = analiz.manipulasyon_skoru;

  // 0-50 arası yeşil, 50-100 arası kırmızı — ortaya göre renk değişir
  const scoreColor = s <= 50
    ? `rgb(${Math.round(s * 4.6)}, 200, 80)`   // yeşilden sarıya
    : `rgb(220, ${Math.round((100 - s) * 3.6)}, 50)`; // sarıdan kırmızıya

  const riskColor =
    analiz.risk_seviyesi === 'YÜKSEK' ? '#ff4d4d' :
    analiz.risk_seviyesi === 'ORTA' ? '#f39c12' : '#2ecc71';

  return (
    <View style={st.konteynir}>
      {/* Haber Başlığı Section */}
      <View style={st.baslikKutu}>
        <Text style={st.baslikMetin}>{baslik}</Text>
      </View>

      {/* Yapay Zeka Güvenlik Analizi Container */}
      <View style={st.analizKart}>
        <View style={st.analizBaslikSatir}>
          <View style={st.aiRozet}>
            <Text style={st.aiRozetMetin}>YAPAY ZEKA GÜVENLİK ANALİZİ</Text>
          </View>
          <View style={[st.riskBadge, { backgroundColor: riskColor }]}>
            <Text style={st.riskBadgeMetin}>{analiz.risk_seviyesi}</Text>
          </View>
        </View>

        {/* Özet Alanı */}
        <View style={st.bolum}>
          <Text style={st.bolumBaslik}>Analiz Özeti</Text>
          <Text style={st.ozetMetin}>{analiz.ozet}</Text>
        </View>

        {/* Manipülasyon Riski Gauge */}
        <View style={st.bolum}>
          <View style={st.etiketSatir}>
            <Text style={st.bolumBaslik}>Manipülasyon Riski</Text>
            <Text style={[st.skorMetin, { color: scoreColor }]}>%{analiz.manipulasyon_skoru}</Text>
          </View>
          <View style={st.gaugeArka}>
            <View style={[st.gaugeOn, { width: `${analiz.manipulasyon_skoru}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>

        {/* Eylem Önerisi Block */}
        <View style={st.eylemKutu}>
          <View style={st.eylemBaslikSatir}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 2v2m0 16v2m8-10h2M2 12h2m15.07-7.07l-1.41 1.41M5.34 18.66l-1.41 1.41M18.66 18.66l1.41-1.41M5.34 5.34l1.41-1.41M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                stroke="#f39c12" strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text style={st.eylemBaslik}>Eylem Önerisi</Text>
          </View>
          <Text style={st.eylemMetin}>{analiz.eylem_onerisi}</Text>
        </View>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  konteynir: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#7e57c2', // Mor vurgu (specs)
  },
  baslikKutu: {
    backgroundColor: '#1e1e1e',
    padding: 16,
  },
  baslikMetin: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  analizKart: {
    backgroundColor: '#121212',
    padding: 16,
    gap: 16,
  },
  analizBaslikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiRozet: {
    backgroundColor: '#7e57c222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#7e57c255',
  },
  aiRozetMetin: {
    color: '#7e57c2',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadgeMetin: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  bolum: {
    gap: 6,
  },
  bolumBaslik: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ozetMetin: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  etiketSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skorMetin: {
    fontSize: 16,
    fontWeight: '900',
  },
  gaugeArka: {
    height: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  gaugeOn: {
    height: '100%',
    borderRadius: 4,
  },
  eylemKutu: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  eylemBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eylemBaslik: {
    color: '#f39c12',
    fontSize: 13,
    fontWeight: '800',
  },
  eylemMetin: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});

export default HaberAnalizKarti;
