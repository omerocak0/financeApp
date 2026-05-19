import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabaseIstemcisi } from '../supabaseIstemcisi';
import { VARSAYILAN_HISSELER } from '../veriler/hisseVerileri';

const { width: SW } = Dimensions.get('window');

// ── Tip Tanımları ─────────────────────────────────────────────────────────────
interface PortfoyItem {
  id: string;
  varlik_kodu: string;
  varlik_miktari: number;
  alis_fiyati: number;
  alis_tarihi: string;
}

interface AlarmItem {
  id: string;
  varlik_kodu: string;
  alarm_tipi: string;
  yon_isareti: string;
  hedef_deger: number;
}

interface TakipItem {
  id: string;
  varlik_kodu: string;
}

export default function AnaSayfa() {
  // ── State (Kullanıcının Talep Ettiği İsimler) ──────────────────────────────
  const [portfoyVerileri, setPortfoyVerileri] = useState<PortfoyItem[]>([]);
  const [alarmVerileri, setAlarmVerileri] = useState<AlarmItem[]>([]);
  const [takipListesiVerileri, setTakipListesiVerileri] = useState<TakipItem[]>([]);
  
  const [toplamBakiye, setToplamBakiye] = useState<number>(0);
  const [karZararYuzdesi, setKarZararYuzdesi] = useState<number>(0);
  
  const [aktifSekme, setAktifSekme] = useState<'Varlıklarım' | 'Takip Listesi'>('Varlıklarım');
  const [yukleniyorDurumu, setYukleniyorDurumu] = useState<boolean>(true);
  const [modalGorunurlugu, setModalGorunurlugu] = useState<boolean>(false);
  const [ekleModalGorunurlugu, setEkleModalGorunurlugu] = useState<boolean>(false);

  // Canlı fiyatlar mock/fetch
  const [anlikFiyatlar, setAnlikFiyatlar] = useState<Record<string, number>>({});
  
  // Ekleme formu state
  const [yeniKod, setYeniKod] = useState('');
  const [yeniMiktar, setYeniMiktar] = useState('');
  const [yeniFiyat, setYeniFiyat] = useState('');

  // Alarm formu state
  const [alarmKod, setAlarmKod] = useState('');
  const [alarmTip, setAlarmTip] = useState('Hedef Fiyat');
  const [alarmYon, setAlarmYon] = useState('+');
  const [alarmDeger, setAlarmDeger] = useState('');

  // ── Supabase İşlemleri ───────────────────────────────────────────────────────
  const verileriGetir = async () => {
    setYukleniyorDurumu(true);
    try {
      const [resPortfoy, resAlarmlar, resTakip] = await Promise.all([
        supabaseIstemcisi.from('portfoy').select('*').order('olusturma_tarihi', { ascending: false }),
        supabaseIstemcisi.from('alarmlar').select('*').order('olusturma_tarihi', { ascending: false }),
        supabaseIstemcisi.from('takip_listesi').select('*').order('olusturma_tarihi', { ascending: false })
      ]);
      
      if (resPortfoy.data) setPortfoyVerileri(resPortfoy.data);
      if (resAlarmlar.data) setAlarmVerileri(resAlarmlar.data);
      if (resTakip.data) setTakipListesiVerileri(resTakip.data);
    } catch (e) {
      console.warn("Veri getirme hatasi", e);
    }
    setYukleniyorDurumu(false);
  };

  const varlikEkle = async (kod: string, miktar: number, fiyat: number) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('portfoy').insert({
        varlik_kodu: kod,
        varlik_miktari: miktar,
        alis_fiyati: fiyat
      }).select();
      if (!error && data) {
         setPortfoyVerileri([data[0], ...portfoyVerileri]);
      }
    } catch(e) { console.warn(e); }
  };

  const varlikSil = async (id: string) => {
    try {
      await supabaseIstemcisi.from('portfoy').delete().eq('id', id);
      setPortfoyVerileri(portfoyVerileri.filter(p => p.id !== id));
    } catch(e) {}
  };

  const alarmKur = async (kod: string, tip: string, yon: string, deger: number) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('alarmlar').insert({
        varlik_kodu: kod,
        alarm_tipi: tip,
        yon_isareti: yon,
        hedef_deger: deger
      }).select();
      if (!error && data) {
         setAlarmVerileri([data[0], ...alarmVerileri]);
      }
    } catch(e) {}
  };

  const takipListesineEkle = async (kod: string) => {
    try {
      const { data, error } = await supabaseIstemcisi.from('takip_listesi').insert({
        varlik_kodu: kod
      }).select();
      if (!error && data) {
         setTakipListesiVerileri([data[0], ...takipListesiVerileri]);
      }
    } catch(e) {}
  };

  const takipListesindenCikar = async (id: string) => {
    try {
      await supabaseIstemcisi.from('takip_listesi').delete().eq('id', id);
      setTakipListesiVerileri(takipListesiVerileri.filter(t => t.id !== id));
    } catch(e) {}
  };

  // ── Yaşam Döngüsü ve Fiyatlar ────────────────────────────────────────────────
  useEffect(() => {
    verileriGetir();
  }, []);

  useEffect(() => {
    // Portföy güncellendiğinde toplam bakiye ve k/z hesapla
    let toplam = 0;
    let maliyet = 0;
    
    portfoyVerileri.forEach(p => {
      // API'den canlı fiyat olmadığı durumda alış fiyatını baz al, yoksa sahte bir piyasa simülasyonu yap (+%5)
      const fiyat = anlikFiyatlar[p.varlik_kodu] || (p.alis_fiyati * 1.05); 
      toplam += (p.varlik_miktari * fiyat);
      maliyet += (p.varlik_miktari * p.alis_fiyati);
    });

    setToplamBakiye(toplam);
    if (maliyet > 0) {
      setKarZararYuzdesi(((toplam - maliyet) / maliyet) * 100);
    } else {
      setKarZararYuzdesi(0);
    }
  }, [portfoyVerileri, anlikFiyatlar]);

  // ── Render Helpers ───────────────────────────────────────────────────────────
  const renderPortfoy = () => (
    <View style={st.listeKonteyner}>
      <TouchableOpacity 
        style={st.ekleButonGeniş} 
        onPress={() => setEkleModalGorunurlugu(true)}
      >
        <MaterialIcons name="add-circle-outline" size={24} color="#10B981" />
        <Text style={st.ekleButonMetin}>Yeni Varlık Ekle</Text>
      </TouchableOpacity>
      
      {portfoyVerileri.map(item => {
        const fiyat = anlikFiyatlar[item.varlik_kodu] || (item.alis_fiyati * 1.05);
        const deger = item.varlik_miktari * fiyat;
        const kar = fiyat > item.alis_fiyati;
        
        return (
          <View key={item.id} style={st.kart}>
            <View style={st.kartSol}>
              <View style={st.ikonKutu}>
                <Text style={st.ikonHarf}>{item.varlik_kodu.substring(0, 1)}</Text>
              </View>
              <View>
                <Text style={st.kartBaslik}>{item.varlik_kodu}</Text>
                <Text style={st.kartAlt}>Miktar: {item.varlik_miktari}</Text>
              </View>
            </View>
            
            <View style={st.kartSag}>
              <Text style={st.kartDeger}>₺{deger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={[st.kartFiyat, { color: kar ? '#10B981' : '#EF4444' }]}>
                {kar ? '▲' : '▼'} ₺{fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>

            <TouchableOpacity style={st.silButon} onPress={() => varlikSil(item.id)}>
              <MaterialIcons name="delete" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  const renderTakipListesi = () => (
    <View style={st.listeKonteyner}>
      <TouchableOpacity 
        style={st.ekleButonGeniş} 
        onPress={() => takipListesineEkle('ASELS')} // Mock Ekleme
      >
        <MaterialIcons name="add-alert" size={24} color="#EAB308" />
        <Text style={[st.ekleButonMetin, { color: '#EAB308' }]}>Alarm Kur / Ekle</Text>
      </TouchableOpacity>

      {takipListesiVerileri.map(item => {
        const fiyat = anlikFiyatlar[item.varlik_kodu] || Math.random() * 100;
        const trend = Math.random() > 0.5;
        
        return (
          <View key={item.id} style={st.kart}>
            <View style={st.kartSol}>
              <View style={[st.ikonKutu, { backgroundColor: '#2C2D35' }]}>
                <MaterialIcons name="show-chart" size={20} color="#FFF" />
              </View>
              <View>
                <Text style={st.kartBaslik}>{item.varlik_kodu}</Text>
                <Text style={st.kartAlt}>Canlı Piyasa</Text>
              </View>
            </View>
            
            <View style={[st.fiyatBalon, { backgroundColor: trend ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
              <Text style={[st.balonMetin, { color: trend ? '#10B981' : '#EF4444' }]}>
                ₺{fiyat.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity style={st.silButon} onPress={() => takipListesindenCikar(item.id)}>
              <MaterialIcons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={st.anaGövde}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Üst Bakiye Alanı (Header) ── */}
      <View style={st.header}>
        <Text style={st.headerAltBaslik}>Toplam Portföy Değeri</Text>
        <Text style={st.headerBakiye}>₺{toplamBakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <View style={[st.yuzdeRozet, { backgroundColor: karZararYuzdesi >= 0 ? '#10B98120' : '#EF444420' }]}>
          <MaterialIcons name={karZararYuzdesi >= 0 ? 'trending-up' : 'trending-down'} size={16} color={karZararYuzdesi >= 0 ? '#10B981' : '#EF4444'} />
          <Text style={[st.yuzdeMetin, { color: karZararYuzdesi >= 0 ? '#10B981' : '#EF4444' }]}>
             {karZararYuzdesi >= 0 ? '+' : ''}{karZararYuzdesi.toFixed(2)}% Tüm Zamanlar
          </Text>
        </View>
      </View>

      {/* ── Sekmeler ── */}
      <View style={st.sekmeKonteyner}>
        <TouchableOpacity 
          style={[st.sekme, aktifSekme === 'Varlıklarım' && st.sekmeAktif]} 
          onPress={() => setAktifSekme('Varlıklarım')}
        >
          <Text style={[st.sekmeMetni, aktifSekme === 'Varlıklarım' && st.sekmeMetniAktif]}>Varlıklarım</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[st.sekme, aktifSekme === 'Takip Listesi' && st.sekmeAktif]} 
          onPress={() => setAktifSekme('Takip Listesi')}
        >
          <Text style={[st.sekmeMetni, aktifSekme === 'Takip Listesi' && st.sekmeMetniAktif]}>Takip Listesi</Text>
        </TouchableOpacity>
      </View>

      {/* ── İçerik Listesi ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollIcerik}>
        {yukleniyorDurumu ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
        ) : (
          aktifSekme === 'Varlıklarım' ? renderPortfoy() : renderTakipListesi()
        )}
      </ScrollView>

      {/* ── Yüzen Alarm Butonu ── */}
      <TouchableOpacity style={st.fab} onPress={() => setModalGorunurlugu(true)}>
        <MaterialIcons name="notifications-active" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* ── Ekleme Modalı ── */}
      <Modal visible={ekleModalGorunurlugu} transparent animationType="slide">
        <View style={st.modalArka}>
          <View style={st.modalKutu}>
            <Text style={st.modalBaslik}>Varlık Ekle</Text>
            
            <TextInput style={st.input} placeholder="Varlık Kodu (Örn: AAPL)" placeholderTextColor="#6B7280" value={yeniKod} onChangeText={setYeniKod} />
            <TextInput style={st.input} placeholder="Miktar" placeholderTextColor="#6B7280" keyboardType="numeric" value={yeniMiktar} onChangeText={setYeniMiktar} />
            <TextInput style={st.input} placeholder="Alış Fiyatı" placeholderTextColor="#6B7280" keyboardType="numeric" value={yeniFiyat} onChangeText={setYeniFiyat} />
            
            <View style={st.modalButonSatir}>
              <TouchableOpacity style={st.modalKapatBtn} onPress={() => setEkleModalGorunurlugu(false)}>
                <Text style={st.modalKapatMetin}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalOnayBtn} onPress={() => {
                if(yeniKod && yeniMiktar && yeniFiyat) {
                  varlikEkle(yeniKod.toUpperCase(), parseFloat(yeniMiktar), parseFloat(yeniFiyat));
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

      {/* ── Alarm Kur Modalı (1.jpeg Referanslı) ── */}
      <Modal visible={modalGorunurlugu} transparent animationType="slide">
        <View style={st.modalArka}>
          <View style={st.modalKutu}>
            <View style={st.alarmBadge}>
              <MaterialIcons name="timer" size={16} color="#EAB308" />
              <Text style={st.alarmBadgeMetin}>Yeni Fiyat Alarmı</Text>
            </View>

            <Text style={st.modalBaslik}>Alarm Kur</Text>
            
            <TextInput style={st.input} placeholder="Varlık Kodu (Örn: ASELS)" placeholderTextColor="#6B7280" value={alarmKod} onChangeText={setAlarmKod} />
            
            <View style={st.yonSecici}>
              {['+', '-', '+/-'].map(y => (
                <TouchableOpacity 
                  key={y} 
                  style={[st.yonBtn, alarmYon === y && st.yonBtnAktif]}
                  onPress={() => setAlarmYon(y)}
                >
                  <Text style={[st.yonBtnMetin, alarmYon === y && st.yonBtnMetinAktif]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={st.input} placeholder="Hedef Değer (Örn: 45.50)" placeholderTextColor="#6B7280" keyboardType="numeric" value={alarmDeger} onChangeText={setAlarmDeger} />

            <TouchableOpacity style={st.altinButon} onPress={() => {
              if (alarmKod && alarmDeger) {
                alarmKur(alarmKod.toUpperCase(), alarmTip, alarmYon, parseFloat(alarmDeger));
                setModalGorunurlugu(false);
                setAlarmKod(''); setAlarmDeger('');
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

    </View>
  );
}

const st = StyleSheet.create({
  anaGövde: { flex: 1, backgroundColor: '#0F1014' },
  
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  headerAltBaslik: { color: '#8A8B92', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  headerBakiye: { color: '#FFF', fontSize: 42, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  yuzdeRozet: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  yuzdeMetin: { fontSize: 14, fontWeight: '700', marginLeft: 4 },

  sekmeKonteyner: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#1A1B22', borderRadius: 12, padding: 4, marginBottom: 16 },
  sekme: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  sekmeAktif: { backgroundColor: '#2C2D35' },
  sekmeMetni: { color: '#8A8B92', fontSize: 14, fontWeight: '600' },
  sekmeMetniAktif: { color: '#FFF' },

  scrollIcerik: { paddingHorizontal: 24, paddingBottom: 100 },
  listeKonteyner: { marginTop: 8 },

  ekleButonGeniş: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B98115', padding: 14, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#10B98130', borderStyle: 'dashed' },
  ekleButonMetin: { color: '#10B981', fontSize: 15, fontWeight: '700', marginLeft: 8 },

  kart: { backgroundColor: '#1A1B22', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  kartSol: { flexDirection: 'row', alignItems: 'center' },
  ikonKutu: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  ikonHarf: { color: '#3B82F6', fontSize: 18, fontWeight: '700' },
  kartBaslik: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  kartAlt: { color: '#8A8B92', fontSize: 13, fontWeight: '500' },
  
  kartSag: { alignItems: 'flex-end', marginRight: 32 },
  kartDeger: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  kartFiyat: { fontSize: 13, fontWeight: '600' },
  
  fiyatBalon: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 32 },
  balonMetin: { fontSize: 14, fontWeight: '700' },

  silButon: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', shadowColor: '#EAB308', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalKutu: { backgroundColor: '#1A1B22', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalBaslik: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  
  input: { backgroundColor: '#0F1014', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2C2D35' },
  
  modalButonSatir: { flexDirection: 'row', gap: 12 },
  modalKapatBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#2C2D35', alignItems: 'center' },
  modalKapatMetin: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOnayBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  modalOnayMetin: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  alarmBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAB30820', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  alarmBadgeMetin: { color: '#EAB308', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  yonSecici: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  yonBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#0F1014', borderWidth: 1, borderColor: '#2C2D35', alignItems: 'center' },
  yonBtnAktif: { backgroundColor: '#EAB30820', borderColor: '#EAB308' },
  yonBtnMetin: { color: '#8A8B92', fontSize: 16, fontWeight: '700' },
  yonBtnMetinAktif: { color: '#EAB308' },
  
  altinButon: { backgroundColor: '#EAB308', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  altinButonMetin: { color: '#0F1014', fontSize: 16, fontWeight: '800' },
  iptalButon: { padding: 16, alignItems: 'center', marginTop: 8 },
  iptalButonMetin: { color: '#8A8B92', fontSize: 15, fontWeight: '600' }
});
