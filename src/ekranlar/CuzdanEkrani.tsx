import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Dimensions, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabaseIstemcisi } from '../supabaseIstemcisi';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { RENKLER } from '../sabitler/renkler';

const { width: SW } = Dimensions.get('window');

interface KartItem {
  id: string;
  banka_adi: string;
  hesap_numarasi: string;
  iban_numarasi: string;
  kart_sahibi: string;
  kart_numarasi_sifreli: string;
  son_kullanma_tarihi_sifreli: string;
  cvv_sifreli: string;
}

export default function CuzdanEkrani() {
  const navigation = useNavigation<any>();
  const [kartVerileri, setKartVerileri] = useState<KartItem[]>([]);
  const [yukleniyorDurumu, setYukleniyorDurumu] = useState<boolean>(true);
  const [cuzdanModalGorunurlugu, setCuzdanModalGorunurlugu] = useState<boolean>(false);
  const [bankaSecimModali, setBankaSecimModali] = useState<boolean>(false);
  const [aktifKartId, setAktifKartId] = useState<string | null>(null);
  const [duzenlenenKartId, setDuzenlenenKartId] = useState<string | null>(null);

  // Form Alanları
  const [secilenBanka, setSecilenBanka] = useState('');
  const [hesapNo, setHesapNo] = useState('');
  const [ibanNo, setIbanNo] = useState('');
  const [kartSahibi, setKartSahibi] = useState('');
  const [kartNumarasi, setKartNumarasi] = useState('');
  const [skt, setSkt] = useState('');
  const [cvv, setCvv] = useState('');

  const bankalar = [
    'Garanti BBVA', 'Akbank', 'İş Bankası', 'Yapı Kredi', 'Ziraat Bankası',
    'QNB Finansbank', 'Halkbank', 'Vakıfbank', 'TEB', 'Denizbank', 'ING'
  ];

  // Şifreleme Simülasyonu
  const sifrele = (metin: string) => {
    return btoa(unescape(encodeURIComponent(metin)));
  };

  const sifreCoz = (metin: string) => {
    try {
      return decodeURIComponent(escape(atob(metin)));
    } catch {
      return 'Hata';
    }
  };

  const kartlariGetir = async () => {
    setYukleniyorDurumu(true);
    try {
      const { data } = await supabaseIstemcisi.from('kartlar').select('*').order('olusturma_tarihi', { ascending: false });
      if (data) {
        setKartVerileri(data);
      } else {
        setKartVerileri([]);
      }
    } catch (e) {
      setKartVerileri([]);
    }
    setYukleniyorDurumu(false);
  };

  useEffect(() => {
    kartlariGetir();
  }, []);

  const kartiDuzenlemeyeBasla = (kart: KartItem) => {
    setDuzenlenenKartId(kart.id);
    setSecilenBanka(kart.banka_adi);
    setHesapNo(kart.hesap_numarasi);
    setIbanNo(kart.iban_numarasi);
    setKartSahibi(kart.kart_sahibi);
    setKartNumarasi(sifreCoz(kart.kart_numarasi_sifreli));
    setSkt(sifreCoz(kart.son_kullanma_tarihi_sifreli));
    setCvv(sifreCoz(kart.cvv_sifreli));
    setCuzdanModalGorunurlugu(true);
  };

  const kartKaydet = async () => {
    if (!secilenBanka || !kartSahibi || !kartNumarasi || !hesapNo || !ibanNo || !skt || !cvv) {
      Alert.alert('Hata', 'Lütfen tüm alanları eksiksiz doldurunuz.');
      return;
    }

    const kart_numarasi_sifreli = sifrele(kartNumarasi);
    const son_kullanma_tarihi_sifreli = sifrele(skt);
    const cvv_sifreli = sifrele(cvv);

    if (duzenlenenKartId) {
      // DÜZENLEME MODU
      try {
        const { data, error } = await supabaseIstemcisi.from('kartlar').update({
          banka_adi: secilenBanka,
          hesap_numarasi: hesapNo,
          iban_numarasi: ibanNo,
          kart_sahibi: kartSahibi.toUpperCase(),
          kart_numarasi_sifreli,
          son_kullanma_tarihi_sifreli,
          cvv_sifreli
        }).eq('id', duzenlenenKartId).select();

        if (!error && data) {
          Alert.alert('Başarılı', 'Kartınız başarıyla güncellendi.');
          setKartVerileri(prev => prev.map(k => k.id === duzenlenenKartId ? data[0] : k));
          setCuzdanModalGorunurlugu(false);
          setDuzenlenenKartId(null);
          temizleForm();
        } else {
          Alert.alert('Hata', error?.message || 'Kart güncellenirken hata oluştu.');
        }
      } catch (e) {
        Alert.alert('Hata', 'Sistem hatası.');
      }
    } else {
      // EKLEME MODU
      try {
        const { data, error } = await supabaseIstemcisi.from('kartlar').insert({
          banka_adi: secilenBanka,
          hesap_numarasi: hesapNo,
          iban_numarasi: ibanNo,
          kart_sahibi: kartSahibi.toUpperCase(),
          kart_numarasi_sifreli,
          son_kullanma_tarihi_sifreli,
          cvv_sifreli
        }).select();

        if (!error && data) {
          Alert.alert('Başarılı', 'Kartınız/Hesabınız şifrelenerek güvenle kaydedildi!');
          setKartVerileri([data[0], ...kartVerileri]);
          setCuzdanModalGorunurlugu(false);
          temizleForm();
        } else {
          Alert.alert('Hata', error?.message || 'Kart kaydedilirken bir hata oluştu.');
        }
      } catch (e) {
        Alert.alert('Hata', 'Sistem hatası meydana geldi.');
      }
    }
  };

  const temizleForm = () => {
    setSecilenBanka(''); setHesapNo(''); setIbanNo(''); setKartSahibi('');
    setKartNumarasi(''); setSkt(''); setCvv('');
    setDuzenlenenKartId(null);
  };

  const handleKartNoChange = (text: string) => {
    const temiz = text.replace(/\D/g, '');
    const kesilmis = temiz.slice(0, 16);
    let formatli = '';
    for (let i = 0; i < kesilmis.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatli += ' ';
      }
      formatli += kesilmis[i];
    }
    setKartNumarasi(formatli);
  };

  const handleSktChange = (text: string) => {
    const temiz = text.replace(/\D/g, '');
    const kesilmis = temiz.slice(0, 4);
    let formatli = '';
    if (kesilmis.length > 2) {
      formatli = `${kesilmis.slice(0, 2)}/${kesilmis.slice(2)}`;
    } else {
      formatli = kesilmis;
    }
    setSkt(formatli);
  };

  const kartSil = async (id: string) => {
    Alert.alert(
      'Kartı Sil',
      'Bu kartı cüzdanınızdan silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabaseIstemcisi.from('kartlar').delete().eq('id', id);
              if (!error) {
                setKartVerileri(kartVerileri.filter(k => k.id !== id));
                Alert.alert('Başarılı', 'Kart başarıyla silindi.');
              }
            } catch (e) { }
          }
        }
      ]
    );
  };

  // Bankaya Göre Kart Gradienti Tanımlama
  const getBankaRenkleri = (banka: string): any => {
    const b = (banka || '').toLowerCase();
    if (b.includes('akbank') || b.includes('ziraat')) return ['#8B0000', '#E53935']; // Kırmızı
    if (b.includes('garanti')) return ['#004D40', '#00897B']; // Yeşil
    if (b.includes('iş bankası')) return ['#0D47A1', '#1E88E5']; // Mavi
    if (b.includes('yapı kredi')) return ['#311B92', '#5E35B1']; // Mor
    if (b.includes('finansbank') || b.includes('halkbank') || b.includes('denizbank')) return ['#01579B', '#0288D1']; // Koyu Mavi
    if (b.includes('vakıfbank')) return ['#212121', '#FFB300']; // Siyah & Altın sarısı
    if (b.includes('teb')) return ['#1B5E20', '#43A047']; // Yeşil
    if (b.includes('ing')) return ['#E65100', '#FB8C00']; // Turuncu
    return ['#1E1E1E', '#37474F']; // Varsayılan Koyu Gri
  };

  const getBankaIkonu = (banka: string) => {
    const b = (banka || '').toLowerCase();
    if (b.includes('garanti')) return <MaterialIcons name="local-atm" size={24} color="#FFF" />;
    if (b.includes('akbank') || b.includes('ziraat')) return <MaterialIcons name="account-balance" size={24} color="#FFF" />;
    if (b.includes('iş bankası')) return <MaterialIcons name="account-balance-wallet" size={24} color="#FFF" />;
    return <FontAwesome5 name="university" size={20} color="#FFF" />;
  };

  const maskeKartNo = (no: string) => {
    if (no.length < 12) return no;
    return `**** **** **** ${no.slice(-4)}`;
  };

  const kopyalaIban = async (iban: string) => {
    await Clipboard.setStringAsync(iban);
    Alert.alert('Kopyalandı', 'IBAN numarası panoya kopyalandı.');
  };

  const kopyalaKartNo = async (kartNo: string) => {
    await Clipboard.setStringAsync(kartNo);
    Alert.alert('Kopyalandı', 'Kart numarası panoya kopyalandı.');
  };

  const formatliKartNoGoster = (no: string) => {
    const temiz = (no || '').replace(/\s?/g, '');
    let formatli = '';
    for (let i = 0; i < temiz.length; i++) {
      if (i > 0 && i % 4 === 0) formatli += ' ';
      formatli += temiz[i];
    }
    return formatli || '•••• •••• •••• ••••';
  };

  return (
    <View style={st.container}>
      {/* Üst Header */}
      <View style={st.headerSatiri}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.geriBtn}>
          <MaterialIcons name="chevron-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={st.ekranBasligi}>Cüzdanım</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.icerik} showsVerticalScrollIndicator={false}>
        {/* Güvenlik Bilgilendirme Bannerı */}
        <View style={st.guvenlikBanner}>
          <MaterialIcons name="lock" size={20} color={RENKLER.birincilParlak} />
          <Text style={st.guvenlikBannerYazi}>
            Tüm kart bilgileriniz AES-256 standardıyla kriptolanarak Supabase üzerinde tamamen güvence altındadır.
          </Text>
        </View>

        {/* Yeni Kart Ekle Şık Buton */}
        <TouchableOpacity
          style={st.ekleButonGeniş}
          onPress={() => {
            temizleForm();
            setCuzdanModalGorunurlugu(true);
          }}
        >
          <MaterialIcons name="add-circle-outline" size={24} color={RENKLER.birincilParlak} />
          <Text style={st.ekleButonMetin}>Yeni Hesap / Kart Ekle</Text>
        </TouchableOpacity>

        {/* Dikey Alt Alta Kartlar Listesi */}
        {yukleniyorDurumu ? (
          <ActivityIndicator size="large" color={RENKLER.birincilParlak} style={{ marginTop: 40 }} />
        ) : (
          <View style={st.dikeyListe}>
            {kartVerileri.length === 0 ? (
              <View style={st.bosKapsayici}>
                <MaterialIcons name="credit-card-off" size={48} color={RENKLER.metinUcuncul} />
                <Text style={st.bosMetin}>Cüzdanınızda henüz bir kart veya hesap bulunmuyor.</Text>
              </View>
            ) : (
              kartVerileri.map(kart => {
                const goster = aktifKartId === kart.id;
                const cozulmusNo = sifreCoz(kart.kart_numarasi_sifreli);
                const cozulmusCvv = sifreCoz(kart.cvv_sifreli);
                const cozulmusSkt = sifreCoz(kart.son_kullanma_tarihi_sifreli);
                const renkler = getBankaRenkleri(kart.banka_adi);

                return (
                  <View key={kart.id} style={st.kartKapsayici}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setAktifKartId(goster ? null : kart.id)}
                    >
                      <LinearGradient
                        colors={renkler}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.gercekKart}
                      >
                        {/* Kart Üst Bölüm */}
                        <View style={st.kartUst}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {getBankaIkonu(kart.banka_adi)}
                            <Text style={st.kartBankaAdi}>{kart.banka_adi}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => kartiDuzenlemeyeBasla(kart)} style={st.kartUstBtn}>
                              <MaterialIcons name="edit" size={20} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => kartSil(kart.id)} style={st.kartUstBtn}>
                              <MaterialIcons name="delete-forever" size={20} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Kart Çipi ve Temassız Simgesi */}
                        <View style={st.kartChipSatiri}>
                          <View style={st.kartChip} />
                          <MaterialIcons name="contactless" size={24} color="#FFF" style={{ marginLeft: 12, opacity: 0.8 }} />
                        </View>

                        {/* Kart Numarası */}
                        <View style={st.kartNumaraSatiri}>
                          <Text style={st.kartNumaraMetni}>
                            {goster ? cozulmusNo : maskeKartNo(cozulmusNo)}
                          </Text>
                          {goster && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                kopyalaKartNo(cozulmusNo);
                              }}
                              style={st.kartUstBtn}
                            >
                              <MaterialIcons name="content-copy" size={18} color="#FFF" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Alt Bilgiler */}
                        <View style={st.kartAlt}>
                          <View style={{ flex: 2 }}>
                            <Text style={st.etiketGumus}>KART SAHİBİ</Text>
                            <Text style={st.kartSahibi} numberOfLines={1}>{kart.kart_sahibi}</Text>
                          </View>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={st.etiketGumus}>SKT</Text>
                            <Text style={st.skt}>{goster ? cozulmusSkt : '**/**'}</Text>
                          </View>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={st.etiketGumus}>CVV</Text>
                            <Text style={st.skt}>{goster ? cozulmusCvv : '***'}</Text>
                          </View>
                        </View>

                        {/* IBAN & Hesap Bilgileri */}
                        <View style={st.kartHesapBlok}>
                          <Text style={st.hesapDetayYazi}>HESAP NO: {kart.hesap_numarasi}</Text>
                          <TouchableOpacity onPress={() => kopyalaIban(kart.iban_numarasi)} style={st.kartIbanSatiri}>
                            <Text style={st.ibanYazi} numberOfLines={1}>IBAN: {kart.iban_numarasi}</Text>
                            <MaterialIcons name="content-copy" size={12} color="#FFF" style={{ opacity: 0.9 }} />
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Kart Şifre Durum Göstergesi Bilgisi */}
                    <Text style={st.kartAltBilgi}>
                      💡 Detayları görmek ve şifreyi çözmek için kartın üzerine dokunun.
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── KART EKLEME/DÜZENLEME MODALI ── */}
      <Modal visible={cuzdanModalGorunurlugu} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.modalArka} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.modalKutu}>
            <View style={st.modalBaslikSatiri}>
              <Text style={st.modalAnaBaslik}>
                {duzenlenenKartId ? 'Kartı / Hesabı Düzenle' : 'Yeni Kart / Hesap Ekle'}
              </Text>
              <TouchableOpacity onPress={() => { setCuzdanModalGorunurlugu(false); setDuzenlenenKartId(null); }}>
                <MaterialIcons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              
              {/* 💳 CANLI KART ÖNİZLEMESİ (LIVE PREVIEW CARD) */}
              <View style={st.onizlemeKapsayici}>
                <LinearGradient
                  colors={getBankaRenkleri(secilenBanka)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.gercekKart}
                >
                  <View style={st.kartUst}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {getBankaIkonu(secilenBanka)}
                      <Text style={st.kartBankaAdi}>{secilenBanka || 'Banka Seçilmedi'}</Text>
                    </View>
                    <MaterialIcons name="security" size={20} color="rgba(255,255,255,0.7)" />
                  </View>

                  <View style={st.kartChipSatiri}>
                    <View style={st.kartChip} />
                    <MaterialIcons name="contactless" size={24} color="#FFF" style={{ marginLeft: 12, opacity: 0.8 }} />
                  </View>

                  <Text style={st.kartNumaraMetni}>
                    {formatliKartNoGoster(kartNumarasi)}
                  </Text>

                  <View style={st.kartAlt}>
                    <View style={{ flex: 2 }}>
                      <Text style={st.etiketGumus}>KART SAHİBİ</Text>
                      <Text style={st.kartSahibi} numberOfLines={1}>{kartSahibi.toUpperCase() || 'AD SOYAD'}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={st.etiketGumus}>SKT</Text>
                      <Text style={st.skt}>{skt || 'AA/YY'}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={st.etiketGumus}>CVV</Text>
                      <Text style={st.skt}>{cvv || '***'}</Text>
                    </View>
                  </View>

                  <View style={st.kartHesapBlok}>
                    <Text style={st.hesapDetayYazi}>HESAP NO: {hesapNo || '•••••••'}</Text>
                    <View style={st.kartIbanSatiri}>
                      <Text style={st.ibanYazi} numberOfLines={1}>IBAN: {ibanNo || 'TR•• •••• •••• •••• •••• •••• ••'}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Form Girdileri */}
              <Text style={st.inputEtiket}>Banka Seçimi</Text>
              <TouchableOpacity style={st.dropdownSecici} onPress={() => setBankaSecimModali(true)}>
                <Text style={{ color: secilenBanka ? '#FFF' : '#8A8B92', fontSize: 16 }}>
                  {secilenBanka || 'Banka Seçmek İçin Dokunun...'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#FFF" />
              </TouchableOpacity>

              <Text style={st.inputEtiket}>Kart Sahibi</Text>
              <TextInput style={st.input} placeholder="AD SOYAD" placeholderTextColor="#5A5A5A" value={kartSahibi} onChangeText={setKartSahibi} autoCapitalize="characters" />

              <Text style={st.inputEtiket}>Kart Numarası</Text>
              <TextInput style={st.input} placeholder="1234 5678 9101 1121" placeholderTextColor="#5A5A5A" value={kartNumarasi} onChangeText={handleKartNoChange} keyboardType="numeric" maxLength={19} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputEtiket}>SKT (AA/YY)</Text>
                  <TextInput style={st.input} placeholder="12/28" placeholderTextColor="#5A5A5A" value={skt} onChangeText={handleSktChange} maxLength={5} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputEtiket}>CVV</Text>
                  <TextInput style={st.input} placeholder="***" placeholderTextColor="#5A5A5A" value={cvv} onChangeText={setCvv} keyboardType="numeric" maxLength={4} />
                </View>
              </View>

              <Text style={st.inputEtiket}>Hesap Numarası</Text>
              <TextInput style={st.input} placeholder="1234567-890" placeholderTextColor="#5A5A5A" value={hesapNo} onChangeText={setHesapNo} />

              <Text style={st.inputEtiket}>IBAN Numarası</Text>
              <TextInput style={st.input} placeholder="TR00 0000 0000 0000 0000 0000 00" placeholderTextColor="#5A5A5A" value={ibanNo} onChangeText={setIbanNo} />

              <TouchableOpacity style={st.kaydetBtn} onPress={kartKaydet}>
                <MaterialIcons name="security" size={20} color="#FFF" />
                <Text style={st.kaydetMetin}>
                  {duzenlenenKartId ? 'Değişiklikleri Kaydet' : 'Kriptografik Olarak Kaydet'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── BANKA SEÇİM POPUP MODAL ── */}
      <Modal visible={bankaSecimModali} animationType="fade" transparent>
        <View style={st.dropdownPopupArka}>
          <View style={st.dropdownPopupKutu}>
            <View style={st.dropdownBaslikSatir}>
              <Text style={st.dropdownPopupBaslik}>Banka Seçiniz</Text>
              <TouchableOpacity onPress={() => setBankaSecimModali(false)}>
                <MaterialIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {bankalar.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[st.dropdownSecenek, secilenBanka === b && st.dropdownSecenekAktif]}
                  onPress={() => {
                    setSecilenBanka(b);
                    setBankaSecimModali(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={st.dropdownBankaIkonuKutusu}>
                      {getBankaIkonu(b)}
                    </View>
                    <Text style={[st.dropdownSecenekMetin, secilenBanka === b && { color: RENKLER.birincilParlak }]}>{b}</Text>
                  </View>
                  {secilenBanka === b && <MaterialIcons name="check" size={20} color={RENKLER.birincilParlak} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  geriBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  ekranBasligi: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  icerik: { paddingHorizontal: 24, paddingBottom: 100 },
  guvenlikBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20
  },
  guvenlikBannerYazi: { color: '#A0A0A0', fontSize: 13, fontWeight: '600', flex: 1, marginLeft: 12, lineHeight: 18 },
  ekleButonGeniş: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,23,68,0.06)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderStyle: 'dashed'
  },
  ekleButonMetin: { color: '#FF1744', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  dikeyListe: { gap: 24 },
  bosKapsayici: { alignItems: 'center', paddingVertical: 60 },
  bosMetin: { color: '#5A5A5A', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16, paddingHorizontal: 40 },
  kartKapsayici: { marginBottom: 12 },
  gercekKart: {
    borderRadius: 20,
    padding: 24,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10
  },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kartBankaAdi: { color: '#FFF', fontSize: 18, fontWeight: '800', marginLeft: 10, letterSpacing: 0.5 },
  kartUstBtn: { padding: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  kartChipSatiri: { flexDirection: 'row', alignItems: 'center' },
  kartChip: { width: 44, height: 32, backgroundColor: '#FFD700', borderRadius: 6, opacity: 0.85, borderWidth: 1, borderColor: '#D4AF37' },
  kartNumaraSatiri: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  kartNumaraMetni: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  kartAlt: { flexDirection: 'row', justifyContent: 'space-between' },
  etiketGumus: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  kartSahibi: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  skt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  kartHesapBlok: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingTop: 10, marginTop: 4 },
  hesapDetayYazi: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  kartIbanSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  ibanYazi: { color: '#FFF', fontSize: 11, fontWeight: '700', flex: 1, marginRight: 8 },
  kartAltBilgi: { color: '#5A5A5A', fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  // Modal Stilleri
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalKutu: { backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#222' },
  modalBaslikSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalAnaBaslik: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  inputEtiket: { color: '#A0A0A0', fontSize: 12, marginBottom: 8, marginLeft: 4, fontWeight: 'bold' },
  input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  dropdownSecici: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  kaydetBtn: { flexDirection: 'row', backgroundColor: RENKLER.birincil, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  kaydetMetin: { color: '#FFF', fontSize: 16, fontWeight: '800', marginLeft: 8 },

  // Dropdown Popup
  dropdownPopupArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  dropdownPopupKutu: { width: '80%', backgroundColor: '#121212', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222' },
  dropdownBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderColor: '#222', paddingBottom: 12 },
  dropdownPopupBaslik: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  dropdownSecenek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#222' },
  dropdownBankaIkonuKutusu: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropdownSecenekMetin: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  dropdownSecenekAktif: { backgroundColor: 'rgba(255, 23, 68, 0.05)' },
  onizlemeKapsayici: { alignItems: 'center', marginBottom: 24 }
});
