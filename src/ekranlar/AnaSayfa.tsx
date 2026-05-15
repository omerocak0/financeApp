import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { RENKLER } from '../sabitler/renkler';

const AnaSayfa: React.FC = () => (
  <View style={s.kont}>
    <StatusBar barStyle="light-content" backgroundColor={RENKLER.arkaplan} />
    <Text style={s.baslik}>Ana Sayfa</Text>
  </View>
);

const s = StyleSheet.create({
  kont: { flex: 1, backgroundColor: RENKLER.arkaplan, alignItems: 'center', justifyContent: 'center' },
  baslik: { fontSize: 28, fontWeight: '700', color: RENKLER.metin, letterSpacing: 0.5 },
});

export default AnaSayfa;
