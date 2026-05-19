import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabaseIstemcisi } from '../supabaseIstemcisi';
import { RENKLER, GOLGE } from '../sabitler/renkler';
import Logo from '../bilesenler/Logo';

export default function GirisKayitEkrani() {
  const [aktifSekme, setAktifSekme] = useState<'giris' | 'kayit'>('giris');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const islemTamamla = async () => {
    if (!email || !sifre) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (aktifSekme === 'kayit' && !adSoyad) {
      Alert.alert('Eksik Bilgi', 'Lütfen adınızı ve soyadınızı yazın.');
      return;
    }

    setYukleniyor(true);

    try {
      if (aktifSekme === 'giris') {
        const { error } = await supabaseIstemcisi.auth.signInWithPassword({
          email,
          password: sifre,
        });

        if (error) {
          Alert.alert('Giriş Başarısız', error.message);
        }
      } else {
        const { error } = await supabaseIstemcisi.auth.signUp({
          email,
          password: sifre,
          options: {
            data: {
              ad_soyad: adSoyad,
            },
          },
        });

        if (error) {
          Alert.alert('Kayıt Başarısız', error.message);
        } else {
          Alert.alert(
            'Kayıt Başarılı',
            'Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.'
          );
          setAktifSekme('giris');
        }
      }
    } catch (e) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.anaGövde}
    >
      <ScrollView contentContainerStyle={styles.scrollIcerik} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo genislik={440} yukseklik={240} style={{ marginVertical: -20 }} />
          <Text style={styles.altBaslik}>Akıllı Varlık Yönetim Portalı</Text>
        </View>

        {/* Sekme Seçici */}
        <View style={styles.sekmeKapsayici}>
          <TouchableOpacity
            style={[styles.sekme, aktifSekme === 'giris' && styles.sekmeAktif]}
            onPress={() => setAktifSekme('giris')}
          >
            <Text style={[styles.sekmeMetin, aktifSekme === 'giris' && styles.sekmeMetinAktif]}>
              Giriş Yap
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sekme, aktifSekme === 'kayit' && styles.sekmeAktif]}
            onPress={() => setAktifSekme('kayit')}
          >
            <Text style={[styles.sekmeMetin, aktifSekme === 'kayit' && styles.sekmeMetinAktif]}>
              Kayıt Ol
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Alanı */}
        <View style={styles.formKapsayici}>
          {aktifSekme === 'kayit' && (
            <View style={styles.inputGrubu}>
              <Text style={styles.inputEtiket}>Ad Soyad</Text>
              <View style={styles.inputSatir}>
                <MaterialIcons name="person" size={20} color={RENKLER.metinUcuncul} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı ve soyadınızı girin"
                  placeholderTextColor={RENKLER.metinUcuncul}
                  value={adSoyad}
                  onChangeText={setAdSoyad}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGrubu}>
            <Text style={styles.inputEtiket}>E-Posta Adresi</Text>
            <View style={styles.inputSatir}>
              <MaterialIcons name="email" size={20} color={RENKLER.metinUcuncul} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ornek@email.com"
                placeholderTextColor={RENKLER.metinUcuncul}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGrubu}>
            <Text style={styles.inputEtiket}>Şifre</Text>
            <View style={styles.inputSatir}>
              <MaterialIcons name="lock" size={20} color={RENKLER.metinUcuncul} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••"
                placeholderTextColor={RENKLER.metinUcuncul}
                value={sifre}
                onChangeText={setSifre}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* İşlem Butonu */}
          <TouchableOpacity
            style={[styles.buton, GOLGE.kirmizi]}
            onPress={islemTamamla}
            disabled={yukleniyor}
            activeOpacity={0.8}
          >
            {yukleniyor ? (
              <ActivityIndicator color={RENKLER.beyaz} />
            ) : (
              <Text style={styles.butonMetin}>
                {aktifSekme === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  anaGövde: {
    flex: 1,
    backgroundColor: RENKLER.arkaplan,
  },
  scrollIcerik: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  baslik: {
    color: RENKLER.beyaz,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 16,
  },
  altBaslik: {
    color: RENKLER.metinIkincil,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 1,
  },
  sekmeKapsayici: {
    flexDirection: 'row',
    backgroundColor: RENKLER.kartBir,
    borderRadius: 14,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: RENKLER.sinirAcik,
  },
  sekme: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  sekmeAktif: {
    backgroundColor: RENKLER.kartUc,
  },
  sekmeMetin: {
    color: RENKLER.metinUcuncul,
    fontSize: 15,
    fontWeight: '700',
  },
  sekmeMetinAktif: {
    color: RENKLER.beyaz,
  },
  formKapsayici: {
    backgroundColor: RENKLER.kartBir,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: RENKLER.sinir,
    ...GOLGE.karti,
  },
  inputGrubu: {
    marginBottom: 20,
  },
  inputEtiket: {
    color: RENKLER.metinIkincil,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.siyah,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RENKLER.sinir,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: RENKLER.beyaz,
    fontSize: 15,
    fontWeight: '600',
    height: '100%',
  },
  buton: {
    backgroundColor: RENKLER.birincilParlak,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  butonMetin: {
    color: RENKLER.beyaz,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
