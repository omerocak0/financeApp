import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RENKLER } from '../sabitler/renkler';
import { API_URL } from '../sabitler/api';

interface Mesaj {
  id: string;
  rol: 'user' | 'model';
  icerik: string;
}

const YapayZekaEkrani: React.FC = () => {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([
    { id: '1', rol: 'model', icerik: 'Merhaba! Ben senin finansal koruma asistanınım. Piyasa haberleri, hisseler veya riskler hakkında bana her şeyi sorabilirsin. 🛡️' }
  ]);
  const [girdi, setGirdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const gonder = async () => {
    if (!girdi.trim() || yukleniyor) return;

    const yeniMesaj: Mesaj = { id: Date.now().toString(), rol: 'user', icerik: girdi.trim() };
    setMesajlar(prev => [...prev, yeniMesaj]);
    setGirdi('');
    setYukleniyor(true);

    try {
      const res = await fetch(`${API_URL}/sohbet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesajlar: [...mesajlar, yeniMesaj].map(m => ({ rol: m.rol, icerik: m.icerik })),
        })
      });

      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      if (data.yanit) {
        setMesajlar(prev => [...prev, { id: (Date.now() + 1).toString(), rol: 'model', icerik: data.yanit }]);
      }
    } catch (error) {
      setMesajlar(prev => [...prev, { id: (Date.now() + 1).toString(), rol: 'model', icerik: 'Üzgünüm, şu an bağlantı kuramıyorum. Lütfen sunucunun çalıştığından emin ol.' }]);
    } finally {
      setYukleniyor(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={st.kont}>
      <View style={st.ustPanel}>
        <View style={st.aiSimge}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        <View>
          <Text style={st.ustBaslik}>Finansal Asistan</Text>
          <Text style={st.ustDurum}>Çevrimiçi | Gemini AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollRef}
          style={st.mesajListesi}
          contentContainerStyle={st.listeIcerik}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {mesajlar.map(m => (
            <View key={m.id} style={[st.mesajSira, m.rol === 'user' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              <View style={[st.mesajKutusu, m.rol === 'user' ? st.userMesaj : st.modelMesaj]}>
                <Text style={[st.mesajMetin, m.rol === 'user' && { color: '#FFF' }]}>{m.icerik}</Text>
              </View>
              <Text style={st.zamanEtiket}>{m.rol === 'user' ? 'Sen' : 'Asistan'}</Text>
            </View>
          ))}
          {yukleniyor && (
            <View style={st.yukleniyorKutu}>
              <ActivityIndicator color={RENKLER.birincilParlak} size="small" />
              <Text style={st.yukleniyorMetin}>Analiz ediliyor...</Text>
            </View>
          )}
        </ScrollView>

        <View style={st.inputKapsayici}>
          <View style={st.inputKutu}>
            <TextInput
              style={st.input}
              placeholder="Sorunu buraya yaz..."
              placeholderTextColor={RENKLER.metinUcuncul}
              value={girdi}
              onChangeText={setGirdi}
              multiline
            />
            <TouchableOpacity 
              style={[st.gonderBtn, !girdi.trim() && { opacity: 0.5 }]} 
              onPress={gonder} 
              disabled={!girdi.trim() || yukleniyor}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" 
                  stroke={RENKLER.beyaz} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const st = StyleSheet.create({
  kont: { flex: 1, backgroundColor: RENKLER.arkaplan },
  ustPanel: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    backgroundColor: RENKLER.kartBir,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.sinir,
    zIndex: 10
  },
  aiSimge: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: RENKLER.birincil + '22',
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: RENKLER.birincil + '44'
  },
  ustBaslik: { fontSize: 18, fontWeight: '800', color: RENKLER.metin },
  ustDurum: { fontSize: 11, color: RENKLER.yukselis, fontWeight: '600', marginTop: 2 },
  mesajListesi: { flex: 1 },
  listeIcerik: { padding: 16, paddingBottom: 20 },
  mesajSira: { marginBottom: 16 },
  mesajKutusu: {
    padding: 14,
    borderRadius: 20,
    maxWidth: '85%',
    elevation: 2,
  },
  userMesaj: {
    backgroundColor: RENKLER.birincil,
    borderBottomRightRadius: 4,
  },
  modelMesaj: {
    backgroundColor: RENKLER.kartIki,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: RENKLER.sinir,
  },
  mesajMetin: { color: RENKLER.metin, fontSize: 15, lineHeight: 22 },
  zamanEtiket: { fontSize: 9, color: RENKLER.metinUcuncul, marginTop: 4, fontWeight: '600' },
  yukleniyorKutu: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  yukleniyorMetin: { fontSize: 12, color: RENKLER.metinIkincil, fontStyle: 'italic' },
  inputKapsayici: {
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 105 : 85, // Navbar üzerinde sabit durması için
    backgroundColor: RENKLER.arkaplan,
    borderTopWidth: 1,
    borderTopColor: RENKLER.sinir,
  },
  inputKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.kartBir,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: RENKLER.sinir,
  },
  input: {
    flex: 1,
    color: RENKLER.metin,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  gonderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RENKLER.birincil,
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default YapayZekaEkrani;
