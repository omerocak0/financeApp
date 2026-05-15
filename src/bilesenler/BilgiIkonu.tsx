import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { RENKLER } from '../sabitler/renkler';

export const BILGI: Record<string, string> = {
  'Günlük Yüksek': 'O gün boyunca ulaşılan en yüksek işlem fiyatıdır.',
  'Günlük Düşük': 'O gün boyunca düşen en düşük işlem fiyatıdır.',
  '52H Yüksek': 'Son 52 haftada (1 yıl) görülen en yüksek kapanış fiyatıdır.',
  '52H Düşük': 'Son 52 haftada (1 yıl) görülen en düşük kapanış fiyatıdır.',
  'Hacim': 'O gün el değiştiren toplam hisse senedi adedidir.',
  'Piyasa Değeri': 'Dolaşımdaki tüm hisselerin toplam piyasa değeridir (Fiyat × Hisse Adedi).',
  'F/K Oranı': 'Fiyat/Kazanç oranı. Hissenin ne kadar yıllık kâr karşılığı satıldığını gösterir. Düşük F/K ucuzluğa işaret edebilir.',
  'EPS': 'Hisse Başına Kâr. Şirketin net kârının toplam hisse sayısına bölümüdür.',
  'Beta': 'Hissenin piyasaya göre volatilitesini gösterir. Beta > 1 ise piyasadan daha oynak demektir.',
  'Temettü': 'Şirketin hisse başına dağıttığı kâr payının yıllık yüzdesidir.',
  'İşlem Hacmi (Ort.)': 'Son 30 günün ortalama günlük işlem hacmidir.',
  'Hisse Adedi': 'Piyasada dolaşımda olan toplam hisse senedi sayısıdır.',
};

interface BilgiIkonuProps { baslik: string }

export const BilgiIkonu: React.FC<BilgiIkonuProps> = ({ baslik }) => {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setAcik(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={st.ikonDaire}>
          <Text style={st.ikonMetin}>i</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={acik} transparent animationType="fade">
        <TouchableOpacity style={st.modalArka} activeOpacity={1} onPress={() => setAcik(false)}>
          <View style={st.modalKutu}>
            <Text style={st.modalBaslik}>{baslik}</Text>
            <Text style={st.modalAciklama}>{BILGI[baslik] ?? '—'}</Text>
            <TouchableOpacity style={st.kapatBtn} onPress={() => setAcik(false)}>
              <Text style={st.kapatMetin}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const st = StyleSheet.create({
  ikonDaire: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: RENKLER.metinUcuncul, alignItems: 'center', justifyContent: 'center' },
  ikonMetin: { fontSize: 10, color: RENKLER.metinUcuncul, fontWeight: '700', lineHeight: 14 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalKutu: { backgroundColor: RENKLER.kartIki, borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: RENKLER.sinir },
  modalBaslik: { fontSize: 15, fontWeight: '700', color: RENKLER.metin, marginBottom: 10 },
  modalAciklama: { fontSize: 13, color: RENKLER.metinIkincil, lineHeight: 20 },
  kapatBtn: { marginTop: 16, backgroundColor: RENKLER.birincil, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  kapatMetin: { color: RENKLER.beyaz, fontWeight: '700', fontSize: 13 },
});
