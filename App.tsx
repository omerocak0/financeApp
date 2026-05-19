import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import AnaSayfa from './src/ekranlar/AnaSayfa';
import FinansEkrani from './src/ekranlar/FinansEkrani';
import HesaplayiciEkrani from './src/ekranlar/HesaplayiciEkrani';
import YapayZekaEkrani from './src/ekranlar/YapayZekaEkrani';
import GirisKayitEkrani from './src/ekranlar/GirisKayitEkrani';
import ProfilEkrani from './src/ekranlar/ProfilEkrani';
import CuzdanEkrani from './src/ekranlar/CuzdanEkrani';
import { RENKLER } from './src/sabitler/renkler';
import { supabaseIstemcisi } from './src/supabaseIstemcisi';

// Splash ekranı otomatik kapanmasın, biz kontrol edeceğiz
SplashScreen.preventAutoHideAsync().catch(() => { });

const AltGezintiCubugu = createBottomTabNavigator();



/* ─── Özel Alt Navigasyon Çubuğu (Sabit Alt Bar) ──── */
function OzelAltCubuk({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const routeName = state.routes[state.index].name;
  if (routeName === 'Profil' || routeName === 'Cuzdan') return null;

  return (
    <View style={[st.barKapsayici, { paddingBottom: insets.bottom || 8 }]}>
      <View style={st.tabCubuk}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === 'Profil' || route.name === 'Cuzdan') return null;
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: any = isFocused ? 'wallet' : 'wallet-outline';
          if (route.name === 'Finans') iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';

          const etiket = route.name === 'AnaSayfa' ? 'Portfolyo' : route.name === 'Finans' ? 'Piyasalar' : route.name === 'Hesaplayici' ? 'Hesapla' : 'FinAI';
          const ikonRengi = isFocused ? RENKLER.birincilParlak : RENKLER.metinUcuncul;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={st.sekmeKont}
              activeOpacity={0.7}
            >
              <View style={[st.ikonKutu, isFocused && st.ikonKutuAktif]}>
                {route.name === 'YapayZeka' ? (
                  <Ionicons name="sparkles" size={26} color={ikonRengi} />
                ) : route.name === 'Hesaplayici' ? (
                  <FontAwesome5 name="calculator" size={20} color={ikonRengi} />
                ) : (
                  <Ionicons name={iconName} size={24} color={ikonRengi} />
                )}
              </View>
              <Text style={[st.etiket, isFocused && st.etiketAktif]}>
                {etiket}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Uygulama kökü ───────────────────────────────────── */
export default function UygulamaKoku() {
  const [oturum, setOturum] = useState<any>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    // Mevcut oturumu al (arka planda)
    supabaseIstemcisi.auth.getSession().then(({ data: { session } }) => {
      setOturum(session);
      setHazir(true);
      SplashScreen.hideAsync().catch(() => { });
    }).catch(() => {
      setHazir(true);
      SplashScreen.hideAsync().catch(() => { });
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabaseIstemcisi.auth.onAuthStateChange((_event, session) => {
      setOturum(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!hazir) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!oturum ? (
          <GirisKayitEkrani />
        ) : (
          <NavigationContainer>
            <AltGezintiCubugu.Navigator
              tabBar={props => <OzelAltCubuk {...props} />}
              screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
            >
              <AltGezintiCubugu.Screen name="AnaSayfa" component={AnaSayfa} />
              <AltGezintiCubugu.Screen name="Finans" component={FinansEkrani} />
              <AltGezintiCubugu.Screen name="Hesaplayici" component={HesaplayiciEkrani} />
              <AltGezintiCubugu.Screen name="YapayZeka" component={YapayZekaEkrani} />
              <AltGezintiCubugu.Screen name="Profil" component={ProfilEkrani} />
              <AltGezintiCubugu.Screen name="Cuzdan" component={CuzdanEkrani} />
            </AltGezintiCubugu.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </View>
  );
}

const st = StyleSheet.create({
  barKapsayici: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tabCubuk: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sekmeKont: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikonKutu: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  ikonKutuAktif: {
    // Hafif parıltı veya ölçekleme gerekirse eklenebilir
  },
  etiket: {
    fontSize: 10,
    color: RENKLER.metinUcuncul,
    fontWeight: '700',
    marginTop: 2,
  },
  etiketAktif: {
    color: RENKLER.birincilParlak,
  },
});
