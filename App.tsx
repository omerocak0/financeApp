import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle } from 'react-native-svg';

import AnaSayfa        from './src/ekranlar/AnaSayfa';
import FinansEkrani    from './src/ekranlar/FinansEkrani';
import YapayZekaEkrani from './src/ekranlar/YapayZekaEkrani';
import { RENKLER }     from './src/sabitler/renkler';

const AltGezintiCubugu = createBottomTabNavigator();

/* ─── SVG ikonlar (Gelişmiş) ─────────────────────────── */
const EvIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"
      stroke={aktif ? RENKLER.birincilParlak : RENKLER.metinUcuncul} strokeWidth={2}
      fill={aktif ? RENKLER.birincilParlak + '15' : 'none'} strokeLinejoin="round" />
    <Path d="M9 21V12h6v9" stroke={aktif ? RENKLER.birincilParlak : RENKLER.metinUcuncul}
      strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const GrafikIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17h4v4H3v-4zM10 10h4v11h-4V10zM17 4h4v17h-4V4z"
      fill={aktif ? RENKLER.birincilParlak : RENKLER.metinUcuncul} />
  </Svg>
);

const ZekaIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3c.3 0 .6.2.8.5l1.2 3.5 3.5 1.2c.3.1.5.4.5.8s-.2.6-.5.8l-3.5 1.2-1.2 3.5c-.1.3-.4.5-.8.5s-.6-.2-.8-.5l-1.2-3.5-3.5-1.2c-.3-.1-.5-.4-.5-.8s.2-.6.5-.8l3.5-1.2 1.2-3.5c.1-.3.4-.5.8-.5z"
      fill={aktif ? RENKLER.birincilParlak : RENKLER.metinUcuncul} />
    <Path d="M19 15l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5zM6 4l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"
      fill={aktif ? RENKLER.birincilParlak : RENKLER.metinUcuncul} />
  </Svg>
);

/* ─── Özel Alt Navigasyon Çubuğu (Uniform Floating) ──── */
function OzelAltCubuk({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[st.floatingContainer, { bottom: Math.max(insets.bottom - 12, 8) }]}>
      <View style={st.tabCubuk}>
        {state.routes.map((route: any, index: number) => {
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

          let Ikon = EvIkon;
          if (route.name === 'Finans') Ikon = GrafikIkon;
          if (route.name === 'YapayZeka') Ikon = ZekaIkon;

          const etiket = route.name === 'AnaSayfa' ? 'Ana Sayfa' : route.name === 'Finans' ? 'Piyasa' : 'Yapay Zeka';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={st.sekmeKont}
              activeOpacity={0.7}
            >
              <View style={[st.ikonKutu, isFocused && st.ikonKutuAktif]}>
                <Ikon aktif={isFocused} />
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
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <AltGezintiCubugu.Navigator
          tabBar={props => <OzelAltCubuk {...props} />}
          screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
        >
          <AltGezintiCubugu.Screen name="AnaSayfa" component={AnaSayfa} />
          <AltGezintiCubugu.Screen name="Finans" component={FinansEkrani} />
          <AltGezintiCubugu.Screen name="YapayZeka" component={YapayZekaEkrani} />
        </AltGezintiCubugu.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  tabCubuk: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 1)',
    borderRadius: 24,
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
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
    // Hafif kırmızı parıltı veya ölçekleme gerekirse eklenebilir
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


