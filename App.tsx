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

/* ─── SVG ikonlar ─────────────────────────────────────── */
const EvIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"
      stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul} strokeWidth={2}
      fill={aktif ? RENKLER.birincil + '33' : 'none'} strokeLinejoin="round" />
    <Path d="M9 21V12h6v9" stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul}
      strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const GrafikIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20V13M8 20V7M12 20V10M16 20V4M20 20V8"
      stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul} strokeWidth={2.2} strokeLinecap="round" />
    <Path d="M3 20h18" stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul}
      strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const ZekaIkon = ({ aktif }: { aktif: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9}
      stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul} strokeWidth={2}
      fill={aktif ? RENKLER.birincil + '33' : 'none'} />
    <Circle cx={9}  cy={10.5} r={1.2} fill={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul} />
    <Circle cx={15} cy={10.5} r={1.2} fill={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul} />
    <Path d="M8.5 14.5c1 1 5 1 7 0"
      stroke={aktif ? RENKLER.birincilAcik : RENKLER.metinUcuncul}
      strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

/* ─── Özel Alt Navigasyon Çubuğu ─────────────────────── */
function OzelAltCubuk({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.tabCubuk, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

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

        const gorunenIsim = route.name === 'AnaSayfa' ? 'Ana Sayfa' : route.name === 'Finans' ? 'Piyasa' : 'Yapay Zeka';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={st.sekmeKont}
            activeOpacity={0.8}
          >
            {isFocused ? (
              <View style={st.pillAktif}>
                <Ikon aktif={true} />
                <Text style={st.pillEtiket}>{gorunenIsim}</Text>
              </View>
            ) : (
              <View style={st.ikonKont}>
                <Ikon aktif={false} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
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

const TAB_H   = 62;
const MARGIN  = 16;

const st = StyleSheet.create({
  tabCubuk: {
    backgroundColor: RENKLER.kartBir,
    borderTopWidth: 1,
    borderTopColor: RENKLER.sinir,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 16,
    // align items inside
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sekmeKont: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RENKLER.birincil + '22', // Dark red background
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillEtiket: {
    color: RENKLER.birincilAcik, // Red text
    fontSize: 13,
    fontWeight: '700',
  },
  ikonKont: {
    padding: 12,
  },
});
