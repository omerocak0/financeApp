import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { RENKLER } from '../sabitler/renkler';
import { API_URL } from '../sabitler/api';
import { supabaseIstemcisi } from '../supabaseIstemcisi';

const markdownStyles: any = {
  body: { color: RENKLER.metin, fontSize: 15, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#FFF' },
  em: { fontStyle: 'italic', color: '#CCC' },
  heading1: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginVertical: 8 },
  heading2: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginVertical: 6 },
  heading3: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginVertical: 4 },
  list_item: { marginVertical: 4 },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  table: { borderColor: '#444', borderWidth: 1, borderRadius: 4, marginVertical: 8 },
  tr: { borderBottomWidth: 1, borderColor: '#444', flexDirection: 'row' },
  th: { padding: 6, backgroundColor: '#222', fontWeight: 'bold', color: '#FFF' },
  td: { padding: 6, color: '#DDD' },
  blockquote: { borderLeftWidth: 4, borderLeftColor: RENKLER.birincil, paddingLeft: 10, fontStyle: 'italic', color: '#AAA', marginVertical: 8 },
  code_inline: { backgroundColor: '#222', paddingHorizontal: 4, borderRadius: 4, fontFamily: 'monospace', color: '#FFD700' },
  code_block: { backgroundColor: '#111', padding: 8, borderRadius: 8, fontFamily: 'monospace', color: '#00FF00', marginVertical: 8 }
};


interface Mesaj {
  id: string;
  rol: 'user' | 'model';
  icerik: string;
}

interface SohbetOturumu {
  id: string;
  baslik: string;
  olusturma_tarihi: string;
}

const VARSAYILAN_MESAJ: Mesaj = { 
  id: 'welcome', 
  rol: 'model', 
  icerik: 'Merhaba! Ben senin finansal koruma asistanınım. Piyasa haberleri, hisseler veya riskler hakkında bana her şeyi sorabilirsin. 🛡️' 
};

const YapayZekaEkrani: React.FC = () => {
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [sohbetListesi, setSohbetListesi] = useState<SohbetOturumu[]>([]);
  const [aktifSohbetId, setAktifSohbetId] = useState<string | null>(null);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([VARSAYILAN_MESAJ]);
  
  const [girdi, setGirdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [listeYukleniyor, setListeYukleniyor] = useState(false);
  const [mesajlarYukleniyor, setMesajlarYukleniyor] = useState(false);
  const [drawerGorunur, setDrawerGorunur] = useState(false);
  
  const scrollRef = useRef<ScrollView>(null);

  // 1. Kullanıcı oturumunu al (Supabase hatası veya oturum yoksa local modda başla)
  useEffect(() => {
    const oturumVeVeriYukle = async () => {
      try {
        const { data: { session } } = await supabaseIstemcisi.auth.getSession();
        if (session?.user) {
          setKullaniciId(session.user.id);
          await sohbetleriYukle(session.user.id);
        } else {
          // Oturum yoksa local modda çalıştır
          setAktifSohbetId('local-session');
          setSohbetListesi([{ id: 'local-session', baslik: 'Lokal Sohbet', olusturma_tarihi: new Date().toISOString() }]);
        }
      } catch (e) {
        console.warn('Supabase oturum hatası, local moda geçiliyor:', e);
        setAktifSohbetId('local-session');
        setSohbetListesi([{ id: 'local-session', baslik: 'Lokal Sohbet', olusturma_tarihi: new Date().toISOString() }]);
      }
    };
    oturumVeVeriYukle();
  }, []);

  // 2. Sohbet oturumlarını veritabanından çek (Hata durumunda local mod)
  const sohbetleriYukle = async (userId: string, secilecekSohbetId?: string) => {
    setListeYukleniyor(true);
    try {
      const { data, error } = await supabaseIstemcisi
        .from('sohbetler')
        .select('*')
        .eq('kullanici_id', userId)
        .order('olusturma_tarihi', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSohbetListesi(data);
        const hedefId = secilecekSohbetId || data[0].id;
        setAktifSohbetId(hedefId);
        await mesajlariYukle(hedefId);
      } else {
        await yeniSohbetOlustur(userId);
      }
    } catch (e) {
      console.warn('Sohbetler yüklenemedi, local sohbet başlatılıyor:', e);
      setAktifSohbetId('local-session');
      setSohbetListesi([{ id: 'local-session', baslik: 'Lokal Sohbet', olusturma_tarihi: new Date().toISOString() }]);
    } finally {
      setListeYukleniyor(false);
    }
  };

  // 3. Belirli bir sohbetin mesajlarını çek
  const mesajlariYukle = async (sohbetId: string) => {
    if (sohbetId === 'local-session' || sohbetId.startsWith('local-')) {
      setMesajlar([VARSAYILAN_MESAJ]);
      return;
    }
    setMesajlarYukleniyor(true);
    try {
      const { data, error } = await supabaseIstemcisi
        .from('sohbet_mesajlari')
        .select('*')
        .eq('sohbet_id', sohbetId)
        .order('olusturma_tarihi', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMesajlar(data.map(m => ({
          id: m.id,
          rol: m.rol,
          icerik: m.icerik
        })));
      } else {
        setMesajlar([VARSAYILAN_MESAJ]);
      }
    } catch (e) {
      console.warn('Mesajlar yüklenemedi:', e);
      setMesajlar([VARSAYILAN_MESAJ]);
    } finally {
      setMesajlarYukleniyor(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  };

  // 4. Yeni sohbet oturumu oluştur
  const yeniSohbetOlustur = async (userId: string) => {
    try {
      const { data, error } = await supabaseIstemcisi
        .from('sohbetler')
        .insert({
          kullanici_id: userId,
          baslik: 'Yeni Sohbet'
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setSohbetListesi(prev => [data[0], ...prev]);
        setAktifSohbetId(data[0].id);
        setMesajlar([VARSAYILAN_MESAJ]);
      }
    } catch (e) {
      console.warn('Supabase yeni sohbet oluşturamadı, local oturum kuruluyor:', e);
      const localId = 'local-' + Date.now();
      const localSohbet = { id: localId, baslik: 'Yeni Sohbet', olusturma_tarihi: new Date().toISOString() };
      setSohbetListesi(prev => [localSohbet, ...prev]);
      setAktifSohbetId(localId);
      setMesajlar([VARSAYILAN_MESAJ]);
    }
  };

  // 5. Bir sohbet oturumunu sil
  const sohbetSil = async (sohbetId: string) => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbet geçmişini silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (sohbetId !== 'local-session' && !sohbetId.startsWith('local-')) {
                const { error } = await supabaseIstemcisi
                  .from('sohbetler')
                  .delete()
                  .eq('id', sohbetId);
                if (error) throw error;
              }

              const guncelListe = sohbetListesi.filter(s => s.id !== sohbetId);
              setSohbetListesi(guncelListe);

              if (aktifSohbetId === sohbetId) {
                if (guncelListe.length > 0) {
                  setAktifSohbetId(guncelListe[0].id);
                  await mesajlariYukle(guncelListe[0].id);
                } else if (kullaniciId) {
                  await yeniSohbetOlustur(kullaniciId);
                } else {
                  setAktifSohbetId('local-session');
                  setSohbetListesi([{ id: 'local-session', baslik: 'Lokal Sohbet', olusturma_tarihi: new Date().toISOString() }]);
                  setMesajlar([VARSAYILAN_MESAJ]);
                }
              }
            } catch (e) {
              Alert.alert('Hata', 'Sohbet silinemedi.');
            }
          }
        }
      ]
    );
  };

  // 6. Sohbet seçimi
  const sohbetSec = async (sohbetId: string) => {
    setAktifSohbetId(sohbetId);
    setDrawerGorunur(false);
    await mesajlariYukle(sohbetId);
  };

  // 7. Mesaj gönder (Tüm Supabase işlemleri try/catch ile izole, çalışmayı engellemez)
  const gonder = async () => {
    if (!girdi.trim() || yukleniyor || !aktifSohbetId) return;

    const mesajIcerik = girdi.trim();
    const yeniMesaj: Mesaj = { id: Date.now().toString(), rol: 'user', icerik: mesajIcerik };
    
    setMesajlar(prev => [...prev, yeniMesaj]);
    setGirdi('');
    setYukleniyor(true);

    try {
      const isLokal = aktifSohbetId === 'local-session' || aktifSohbetId.startsWith('local-');

      // 7.a. Kullanıcı mesajını Supabase'e kaydet (Hata alırsa sessizce geç)
      if (!isLokal) {
        try {
          await supabaseIstemcisi
            .from('sohbet_mesajlari')
            .insert({
              sohbet_id: aktifSohbetId,
              rol: 'user',
              icerik: mesajIcerik
            });
        } catch (dbErr) {
          console.warn('Mesaj DB ye yazılamadı:', dbErr);
        }

        // 7.b. Başlığı ilk mesajla güncelle (Hata alırsa sessizce geç)
        const aktifSohbet = sohbetListesi.find(s => s.id === aktifSohbetId);
        if (aktifSohbet && aktifSohbet.baslik === 'Yeni Sohbet') {
          const yeniBaslik = mesajIcerik.slice(0, 24) + (mesajIcerik.length > 24 ? '...' : '');
          try {
            await supabaseIstemcisi
              .from('sohbetler')
              .update({ baslik: yeniBaslik })
              .eq('id', aktifSohbetId);
          } catch (dbErr) {
            console.warn('Başlık DB de güncellenemedi:', dbErr);
          }
          setSohbetListesi(prev => prev.map(s => s.id === aktifSohbetId ? { ...s, baslik: yeniBaslik } : s));
        }
      } else {
        // Lokal sohbet başlığı güncelleme
        const aktifSohbet = sohbetListesi.find(s => s.id === aktifSohbetId);
        if (aktifSohbet && aktifSohbet.baslik === 'Yeni Sohbet') {
          const yeniBaslik = mesajIcerik.slice(0, 24) + (mesajIcerik.length > 24 ? '...' : '');
          setSohbetListesi(prev => prev.map(s => s.id === aktifSohbetId ? { ...s, baslik: yeniBaslik } : s));
        }
      }

      // 7.c. Yapay zeka API'sine gönder
      let res;
      try {
        res = await fetch(`${API_URL}/sohbet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mesajlar: [...mesajlar.filter(m => m.id !== 'welcome'), yeniMesaj].map(m => ({ rol: m.rol, icerik: m.icerik })),
          })
        });
      } catch (netErr) {
        // Ağ hatası - sunucu kapalı veya ulaşılamıyor
        setMesajlar(prev => [...prev, {
          id: (Date.now() + 1).toString(), rol: 'model',
          icerik: '❌ **Sunucuya bağlanılamadı.**\n\nLütfen backend sunucusunun çalıştığından emin olun.'
        }]);
        return;
      }

      // Sunucu hata döndürdü (503, 429 vb.)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMesaj = errData.detail || `Sunucu hatası (${res.status})`;
        setMesajlar(prev => [...prev, {
          id: (Date.now() + 1).toString(), rol: 'model',
          icerik: `❌ **Yapay Zeka Servisi Kullanılamıyor**\n\n${errMesaj}\n\n*Yeni bir Gemini API Key alarak \`backend/.env\` dosyasını güncelleyin.*`
        }]);
        return;
      }

      const data = await res.json();
      const responseBodyText = data.yanit || '';

      if (responseBodyText) {
        // 7.d. Yapay zeka yanıtını Supabase'e kaydet (Hata alırsa sessizce geç)
        if (!isLokal) {
          try {
            await supabaseIstemcisi
              .from('sohbet_mesajlari')
              .insert({
                sohbet_id: aktifSohbetId,
                rol: 'model',
                icerik: responseBodyText
              });
          } catch (dbErr) {
            console.warn('Yanıt DB ye yazılamadı:', dbErr);
          }
        }

        setMesajlar(prev => [...prev, { id: (Date.now() + 1).toString(), rol: 'model', icerik: responseBodyText }]);
      }
    } catch (error) {
      console.warn(error);
      setMesajlar(prev => [...prev, {
        id: (Date.now() + 1).toString(), rol: 'model',
        icerik: '❌ **Beklenmeyen bir hata oluştu.**\n\nSunucunun çalıştığından emin olun.'
      }]);
    } finally {
      setYukleniyor(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Markdown Kalın Yazıları (**test** gibi) JSX formatında yorumlayan yardımcı fonksiyon
  return (
    <View style={st.kont}>
      {/* ── ÜST BAR & HAMBURGER İKONU ── */}
      <View style={st.ustPanel}>
        <View>
          <Text style={st.ustBaslik}>Finans Asistanı</Text>
        </View>
        
        <TouchableOpacity style={st.menuBtn} onPress={() => setDrawerGorunur(true)}>
          <MaterialIcons name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── MESAJ HÜCRELERİ ── */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {mesajlarYukleniyor ? (
          <View style={st.ortala}>
            <ActivityIndicator color={RENKLER.birincilParlak} size="large" />
            <Text style={st.yukleniyorEkranMetin}>Mesajlar yükleniyor...</Text>
          </View>
        ) : (
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
                  {m.rol === 'user' ? (
                    <Text style={[st.mesajMetin, { color: '#FFF' }]}>{m.icerik}</Text>
                  ) : (
                    <Markdown style={markdownStyles}>
                      {m.icerik}
                    </Markdown>
                  )}
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
        )}

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
              <MaterialIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── SAĞ SÜRÜKLENEBİLİR / GEÇİŞLİ SOOHBET DRAWER MODAL ── */}
      <Modal visible={drawerGorunur} animationType="none" transparent>
        <View style={st.drawerArka}>
          {/* Backdrop - Tıklayınca kapatır */}
          <TouchableOpacity style={st.drawerBackdrop} activeOpacity={1} onPress={() => setDrawerGorunur(false)} />
          
          {/* Drawer Panel */}
          <SafeAreaView style={st.drawerPanel}>
            <View style={st.drawerHeader}>
              <Text style={st.drawerBaslik}>Sohbet Geçmişi</Text>
              <TouchableOpacity onPress={() => setDrawerGorunur(false)} style={st.kapatButon}>
                <MaterialIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Yeni Sohbet Başlat Butonu */}
            <TouchableOpacity 
              style={st.yeniSohbetBtn} 
              onPress={() => {
                const targetUserId = kullaniciId || 'anonymous';
                yeniSohbetOlustur(targetUserId);
                setDrawerGorunur(false);
              }}
            >
              <MaterialIcons name="add" size={22} color="#000" />
              <Text style={st.yeniSohbetMetin}>Yeni Sohbet Başlat</Text>
            </TouchableOpacity>

            {/* Sohbet Listesi */}
            {listeYukleniyor ? (
              <ActivityIndicator color={RENKLER.birincilParlak} style={{ marginTop: 20 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={st.sohbetListeScroll}>
                {sohbetListesi.map(s => {
                  const secili = s.id === aktifSohbetId;
                  return (
                    <TouchableOpacity 
                      key={s.id} 
                      style={[st.sohbetKart, secili && st.sohbetKartSecili]} 
                      onPress={() => sohbetSec(s.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <MaterialIcons 
                          name="chat-bubble-outline" 
                          size={18} 
                          color={secili ? RENKLER.birincilParlak : '#8A8B92'} 
                        />
                        <Text 
                          style={[st.sohbetBaslikText, secili && { color: '#FFF', fontWeight: '700' }]} 
                          numberOfLines={1}
                        >
                          {s.baslik}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={st.silBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          sohbetSil(s.id);
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#8A8B92" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const st = StyleSheet.create({
  kont: { flex: 1, backgroundColor: RENKLER.arkaplan },
  ustPanel: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    backgroundColor: RENKLER.kartBir,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.sinir,
    zIndex: 10
  },
  ustBaslik: { fontSize: 20, fontWeight: '900', color: RENKLER.metin, letterSpacing: 0.5 },
  ustDurum: { fontSize: 11, color: RENKLER.yukselis, fontWeight: '600', marginTop: 4 },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222'
  },
  ortala: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yukleniyorEkranMetin: { color: '#8A8B92', marginTop: 12, fontSize: 14, fontWeight: '600' },
  
  mesajListesi: { flex: 1 },
  listeIcerik: { padding: 16, paddingBottom: 20 },
  mesajSira: { marginBottom: 16 },
  mesajKutusu: {
    padding: 14,
    borderRadius: 20,
    maxWidth: '85%',
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
  mesajKalin: { fontWeight: 'bold', color: '#FFF' },
  zamanEtiket: { fontSize: 9, color: RENKLER.metinUcuncul, marginTop: 4, fontWeight: '600', marginHorizontal: 4 },
  yukleniyorKutu: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  yukleniyorMetin: { fontSize: 12, color: RENKLER.metinIkincil, fontStyle: 'italic' },
  
  inputKapsayici: {
    padding: 12,
    paddingBottom: 12,
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

  // Drawer Stilleri
  drawerArka: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.75)'
  },
  drawerBackdrop: {
    flex: 1
  },
  drawerPanel: {
    width: '75%',
    height: '100%',
    backgroundColor: '#0A0A0A',
    borderLeftWidth: 1,
    borderLeftColor: '#222',
    padding: 18,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 0
  },
  drawerBaslik: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  kapatButon: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#111'
  },
  yeniSohbetBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20
  },
  yeniSohbetMetin: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800'
  },
  sohbetListeScroll: {
    flex: 1
  },
  sohbetKart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#111',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222'
  },
  sohbetKartSecili: {
    borderColor: RENKLER.birincil,
    backgroundColor: RENKLER.birincil + '15'
  },
  sohbetBaslikText: {
    color: '#8A8B92',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1
  },
  silBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.02)'
  }
});


export default YapayZekaEkrani;
