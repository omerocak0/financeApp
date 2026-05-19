import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
  Modal, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabaseIstemcisi } from '../supabaseIstemcisi';

export default function ProfilEkrani() {
  const navigation = useNavigation();

  const [adSoyad, setAdSoyad] = useState('');
  const [email, setEmail] = useState('');
  
  const [yeniAdSoyad, setYeniAdSoyad] = useState('');

  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');

  const [hesapSilSifre, setHesapSilSifre] = useState('');

  const [islemDurumu, setIslemDurumu] = useState<'bekliyor' | 'sifre_degistir' | 'hesap_sil' | 'ad_degistir'>('bekliyor');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Özel Uyarı Modalı
  const [uyariModalGorunur, setUyariModalGorunur] = useState(false);
  const [uyariBaslik, setUyariBaslik] = useState('');
  const [uyariMesaj, setUyariMesaj] = useState('');
  const [uyariTip, setUyariTip] = useState<'basari' | 'hata' | 'bilgi'>('bilgi');
  const [uyariOnayEylemi, setUyariOnayEylemi] = useState<(() => void) | null>(null);
  const [uyariIptalGoster, setUyariIptalGoster] = useState(false);

  useEffect(() => {
    kullaniciBilgileriniGetir();
  }, []);

  const kullaniciBilgileriniGetir = async () => {
    const { data: { user } } = await supabaseIstemcisi.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      const mevAd = user.user_metadata?.ad_soyad || 'Kullanıcı';
      setAdSoyad(mevAd);
      setYeniAdSoyad(mevAd);
    }
  };

  const uyariGoster = (baslik: string, mesaj: string, tip: 'basari' | 'hata' | 'bilgi', onayEylemi?: () => void, iptalGoster = false) => {
    setUyariBaslik(baslik);
    setUyariMesaj(mesaj);
    setUyariTip(tip);
    setUyariOnayEylemi(() => onayEylemi || null);
    setUyariIptalGoster(iptalGoster);
    setUyariModalGorunur(true);
  };

  const cikisYapOnay = () => {
    uyariGoster(
      "Oturumu Kapat",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      "bilgi",
      async () => {
        setUyariModalGorunur(false);
        setYukleniyor(true);
        await supabaseIstemcisi.auth.signOut();
        setYukleniyor(false);
      },
      true
    );
  };

  const adSoyadDegistir = async () => {
    if (!yeniAdSoyad.trim()) {
      uyariGoster("Hata", "Ad ve soyad boş bırakılamaz.", "hata");
      return;
    }
    setYukleniyor(true);
    const { error } = await supabaseIstemcisi.auth.updateUser({
      data: { ad_soyad: yeniAdSoyad }
    });
    setYukleniyor(false);

    if (error) {
      uyariGoster("Hata", error.message, "hata");
    } else {
      setAdSoyad(yeniAdSoyad);
      uyariGoster("Başarılı", "Ad soyad bilgileriniz güncellendi.", "basari", () => {
        setIslemDurumu('bekliyor');
        setUyariModalGorunur(false);
      });
    }
  };

  const sifreDegistir = async () => {
    if (!yeniSifre || !yeniSifreTekrar || !mevcutSifre) {
      uyariGoster("Hata", "Lütfen şifre alanlarını eksiksiz doldurun.", "hata");
      return;
    }
    if (yeniSifre !== yeniSifreTekrar) {
      uyariGoster("Hata", "Yeni şifreler eşleşmiyor.", "hata");
      return;
    }

    setYukleniyor(true);
    
    const { error: signInError } = await supabaseIstemcisi.auth.signInWithPassword({
      email: email,
      password: mevcutSifre
    });

    if (signInError) {
      setYukleniyor(false);
      uyariGoster("Hata", "Mevcut şifrenizi yanlış girdiniz.", "hata");
      return;
    }

    const { error: updateError } = await supabaseIstemcisi.auth.updateUser({
      password: yeniSifre
    });

    setYukleniyor(false);

    if (updateError) {
      uyariGoster("Hata", updateError.message, "hata");
    } else {
      uyariGoster("Başarılı", "Şifreniz başarıyla güncellendi.", "basari", () => {
        setMevcutSifre(''); setYeniSifre(''); setYeniSifreTekrar('');
        setIslemDurumu('bekliyor');
        setUyariModalGorunur(false);
      });
    }
  };

  const hesapSil = async () => {
    if (!hesapSilSifre) {
      uyariGoster("Hata", "Hesabınızı silmek için şifrenizi girmelisiniz.", "hata");
      return;
    }

    uyariGoster(
      "Hesabı Sil",
      "Hesabınızı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      "hata",
      async () => {
        setUyariModalGorunur(false);
        setYukleniyor(true);

        const { error: signInError } = await supabaseIstemcisi.auth.signInWithPassword({
          email: email,
          password: hesapSilSifre
        });

        if (signInError) {
          setYukleniyor(false);
          uyariGoster("Hata", "Şifrenizi yanlış girdiniz.", "hata");
          return;
        }

        const { error: deleteError } = await supabaseIstemcisi.rpc('delete_user_account');
        setYukleniyor(false);
        
        if (deleteError) {
          uyariGoster("Bilgi", "Hesap silme işlemi yönetici onayına gönderildi. Sistemden çıkış yapılıyor.", "bilgi", async () => {
            await supabaseIstemcisi.auth.signOut();
          });
        } else {
          await supabaseIstemcisi.auth.signOut();
        }
      },
      true
    );
  };

  const renderAdDegistirModal = () => (
    <Modal visible={islemDurumu === 'ad_degistir'} animationType="slide" transparent>
      <View style={st.modalArka}>
        <View style={st.modalKutu}>
          <TouchableOpacity style={st.modalKapatBtn} onPress={() => setIslemDurumu('bekliyor')}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.altBaslik}>Bilgilerimi Düzenle</Text>
          
          <Text style={st.inputEtiket}>Ad Soyad</Text>
          <TextInput style={st.input} value={yeniAdSoyad} onChangeText={setYeniAdSoyad} placeholder="Ad Soyad" placeholderTextColor="#555" />

          <TouchableOpacity style={st.kaydetBtn} onPress={adSoyadDegistir} disabled={yukleniyor}>
            {yukleniyor ? <ActivityIndicator color="#000" /> : <Text style={st.kaydetBtnMetin}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSifreDegistirModal = () => (
    <Modal visible={islemDurumu === 'sifre_degistir'} animationType="slide" transparent>
      <View style={st.modalArka}>
        <View style={st.modalKutu}>
          <TouchableOpacity style={st.modalKapatBtn} onPress={() => setIslemDurumu('bekliyor')}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.altBaslik}>Şifre Sıfırlama</Text>
          <Text style={st.inputEtiket}>Mevcut Şifre</Text>
          <TextInput style={st.input} secureTextEntry value={mevcutSifre} onChangeText={setMevcutSifre} placeholder="••••••" placeholderTextColor="#555" />
          
          <Text style={st.inputEtiket}>Yeni Şifre</Text>
          <TextInput style={st.input} secureTextEntry value={yeniSifre} onChangeText={setYeniSifre} placeholder="••••••" placeholderTextColor="#555" />

          <Text style={st.inputEtiket}>Yeni Şifre (Tekrar)</Text>
          <TextInput style={st.input} secureTextEntry value={yeniSifreTekrar} onChangeText={setYeniSifreTekrar} placeholder="••••••" placeholderTextColor="#555" />

          <TouchableOpacity style={st.kaydetBtn} onPress={sifreDegistir} disabled={yukleniyor}>
            {yukleniyor ? <ActivityIndicator color="#000" /> : <Text style={st.kaydetBtnMetin}>Şifreyi Güncelle</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHesapSilModal = () => (
    <Modal visible={islemDurumu === 'hesap_sil'} animationType="slide" transparent>
      <View style={st.modalArka}>
        <View style={st.modalKutu}>
          <TouchableOpacity style={st.modalKapatBtn} onPress={() => setIslemDurumu('bekliyor')}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={[st.altBaslik, { color: '#EF4444' }]}>Hesabı Kalıcı Olarak Sil</Text>
          <Text style={st.bilgiMetni}>Hesabınızı tamamen silmek istiyorsanız güvenliğiniz için şifrenizi girin. Tüm verileriniz kalıcı olarak silinecektir.</Text>
          
          <Text style={st.inputEtiket}>Şifreniz</Text>
          <TextInput style={st.input} secureTextEntry value={hesapSilSifre} onChangeText={setHesapSilSifre} placeholder="••••••" placeholderTextColor="#555" />
          
          <TouchableOpacity style={[st.kaydetBtn, { backgroundColor: '#EF4444' }]} onPress={hesapSil} disabled={yukleniyor}>
            {yukleniyor ? <ActivityIndicator color="#FFF" /> : <Text style={[st.kaydetBtnMetin, { color: '#FFF' }]}>Hesabımı Sil</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity style={st.geriBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={st.headerBaslik}>Hesap Ayarları</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={st.anaIcerik} showsVerticalScrollIndicator={false}>
        
        <View style={st.profilKart}>
          <View style={st.avatar}>
            <Text style={st.avatarHarf}>{adSoyad.charAt(0).toUpperCase()}</Text>
            <View style={st.avatarIkon}>
              <MaterialIcons name="camera-alt" size={14} color="#FFF" />
            </View>
          </View>
          <Text style={st.adSoyad}>{adSoyad}</Text>
          <Text style={st.email}>{email}</Text>
        </View>

        <Text style={st.bolumBasligi}>HESAP AYARLARI</Text>
        <View style={st.menuKart}>
          <TouchableOpacity style={st.menuEleman} onPress={() => setIslemDurumu('ad_degistir')}>
            <View style={[st.menuIkonKutu, { backgroundColor: '#1C1C1C' }]}>
              <MaterialIcons name="person-outline" size={20} color="#EF4444" />
            </View>
            <Text style={st.menuMetin}>Bilgilerimi Düzenle</Text>
            <MaterialIcons name="chevron-right" size={24} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={[st.menuEleman, { borderBottomWidth: 0 }]} onPress={() => setIslemDurumu('sifre_degistir')}>
            <View style={[st.menuIkonKutu, { backgroundColor: '#1C1C1C' }]}>
              <MaterialIcons name="lock-outline" size={20} color="#EF4444" />
            </View>
            <Text style={st.menuMetin}>Şifremi Sıfırla</Text>
            <MaterialIcons name="chevron-right" size={24} color="#555" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={st.cikisButonu} onPress={cikisYapOnay}>
          <Text style={st.cikisButonuMetni}>Oturumu Kapat</Text>
          <MaterialIcons name="logout" size={20} color="#EF4444" />
        </TouchableOpacity>

        <TouchableOpacity style={st.hesabiSilBtn} onPress={() => setIslemDurumu('hesap_sil')}>
          <Text style={st.hesabiSilMetin}>Hesabı Kalıcı Olarak Sil</Text>
        </TouchableOpacity>

      </ScrollView>

      {renderAdDegistirModal()}
      {renderSifreDegistirModal()}
      {renderHesapSilModal()}

      <Modal visible={uyariModalGorunur} animationType="fade" transparent>
        <View style={st.uyariArka}>
          <View style={st.uyariKutu}>
            <View style={[st.uyariIkonKutu, { backgroundColor: uyariTip === 'basari' ? '#111' : '#111', borderColor: uyariTip === 'basari' ? '#FFF' : '#EF4444', borderWidth: 2 }]}>
              <MaterialIcons 
                name={uyariTip === 'basari' ? 'check' : uyariTip === 'hata' ? 'close' : 'info-outline'} 
                size={32} 
                color={uyariTip === 'basari' ? '#FFF' : '#EF4444'} 
              />
            </View>
            <Text style={st.uyariBaslik}>{uyariBaslik}</Text>
            <Text style={st.uyariMesaj}>{uyariMesaj}</Text>
            <View style={st.uyariButonSatir}>
              {uyariIptalGoster && (
                <TouchableOpacity style={st.uyariIptalBtn} onPress={() => setUyariModalGorunur(false)}>
                  <Text style={st.uyariIptalMetin}>İptal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[st.uyariOnayBtn, { backgroundColor: uyariTip === 'basari' ? '#FFF' : '#EF4444' }]} onPress={() => {
                if (uyariOnayEylemi) uyariOnayEylemi();
                else setUyariModalGorunur(false);
              }}>
                <Text style={[st.uyariOnayMetin, { color: uyariTip === 'basari' ? '#000' : '#FFF' }]}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 
  },
  geriBtn: { 
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#111', 
    alignItems: 'center', justifyContent: 'center' 
  },
  headerBaslik: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  
  anaIcerik: { paddingHorizontal: 24, paddingBottom: 60 },
  
  profilKart: { 
    backgroundColor: '#111', borderRadius: 24, paddingVertical: 32, 
    alignItems: 'center', marginBottom: 32 
  },
  avatar: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#222', 
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative' 
  },
  avatarHarf: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  avatarIkon: { 
    position: 'absolute', bottom: -4, right: -4, backgroundColor: '#EF4444', 
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#111'
  },
  adSoyad: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  email: { fontSize: 14, color: '#777', fontWeight: '500' },
  
  bolumBasligi: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 1.5, marginBottom: 12, marginLeft: 8 },
  
  menuKart: { 
    backgroundColor: '#111', borderRadius: 24, paddingHorizontal: 20, marginBottom: 32 
  },
  menuEleman: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 20, 
    borderBottomWidth: 1, borderBottomColor: '#222' 
  },
  menuIkonKutu: { 
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' 
  },
  menuMetin: { 
    flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '700', color: '#FFF' 
  },
  
  cikisButonu: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#1A0A0A', borderRadius: 24, paddingVertical: 20,
    borderWidth: 1, borderColor: '#EF444430'
  },
  cikisButonuMetni: { fontSize: 16, fontWeight: '700', color: '#EF4444', marginRight: 12 },

  hesabiSilBtn: { 
    marginTop: 32, alignItems: 'center', padding: 16 
  },
  hesabiSilMetin: { 
    fontSize: 14, fontWeight: '600', color: '#555' 
  },

  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalKutu: { 
    backgroundColor: '#111', borderTopLeftRadius: 32, borderTopRightRadius: 32, 
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#222' 
  },
  modalKapatBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#222', borderRadius: 12, marginBottom: 12 },

  altBaslik: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 32 },
  inputEtiket: { fontSize: 12, color: '#777', marginBottom: 8, fontWeight: '800', textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#050505', color: '#FFF', paddingHorizontal: 16, height: 56, 
    borderRadius: 16, marginBottom: 24, fontSize: 16, fontWeight: '600',
    borderWidth: 1, borderColor: '#222'
  },
  kaydetBtn: { 
    backgroundColor: '#FFF', borderRadius: 16, height: 56, alignItems: 'center', 
    justifyContent: 'center', marginTop: 12 
  },
  kaydetBtnMetin: { color: '#000', fontSize: 16, fontWeight: '800' },
  bilgiMetni: { color: '#777', fontSize: 14, lineHeight: 22, marginBottom: 24 },

  uyariArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  uyariKutu: { width: '100%', backgroundColor: '#111', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  uyariIkonKutu: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  uyariBaslik: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 12, textAlign: 'center' },
  uyariMesaj: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  uyariButonSatir: { flexDirection: 'row', gap: 12, width: '100%' },
  uyariIptalBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  uyariIptalMetin: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  uyariOnayBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  uyariOnayMetin: { fontSize: 15, fontWeight: '800' },
});
