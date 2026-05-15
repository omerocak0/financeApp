import React from 'react';
import Svg, { G, Line, Path, Circle, Defs, LinearGradient, Stop, Text as ST } from 'react-native-svg';
import { RENKLER } from '../sabitler/renkler';
import { CizgiVerisi } from '../veriler/hisseVerileri';

interface Props {
  veriler: CizgiVerisi[];
  genislik: number;
  yukseklik: number;
  pozitif?: boolean;
}

const CizgiGrafik: React.FC<Props> = ({ veriler, genislik, yukseklik, pozitif = true }) => {
  const PL = 52, PR = 8, PT = 12, PB = 36;
  const GW = genislik - PL - PR;
  const GH = yukseklik - PT - PB;
  if (veriler.length < 2) return null;

  const fiyatlar = veriler.map(d => d.fiyat);
  const mn = Math.min(...fiyatlar) * 0.997;
  const mx = Math.max(...fiyatlar) * 1.003;
  const aralık = mx - mn;

  const nx = (i: number) => PL + (i / (veriler.length - 1)) * GW;
  const ny = (f: number) => PT + GH - ((f - mn) / aralık) * GH;

  const yol = veriler.map((d, i) => `${i === 0 ? 'M' : 'L'}${nx(i).toFixed(1)},${ny(d.fiyat).toFixed(1)}`).join(' ');
  const dolgu = yol + ` L${nx(veriler.length - 1).toFixed(1)},${(PT + GH).toFixed(1)} L${PL},${(PT + GH).toFixed(1)} Z`;

  const renk = pozitif ? RENKLER.yukselis : RENKLER.dusus;
  const etiketSayisi = 5;
  const adim = Math.ceil(veriler.length / 5);

  return (
    <Svg width={genislik} height={yukseklik}>
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={renk} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={renk} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {Array.from({ length: etiketSayisi }).map((_, i) => {
        const f = mn + (aralık / (etiketSayisi - 1)) * i;
        const y = ny(f);
        return (
          <G key={i}>
            <Line x1={PL} y1={y} x2={genislik - PR} y2={y} stroke="#2A2A2A" strokeWidth={1} strokeDasharray="3,3" />
            <ST x={PL - 4} y={y + 4} fontSize={9} fill={RENKLER.metinIkincil} textAnchor="end">{f.toFixed(0)}</ST>
          </G>
        );
      })}
      {veriler.map((d, i) => i % adim === 0 ? (
        <ST key={i} x={nx(i)} y={yukseklik - 4} fontSize={9} fill={RENKLER.metinUcuncul} textAnchor="middle">{d.tarih.slice(5)}</ST>
      ) : null)}
      <Path d={dolgu} fill="url(#lg)" />
      <Path d={yol} stroke={renk} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={nx(veriler.length - 1)} cy={ny(veriler[veriler.length - 1].fiyat)} r={4} fill={renk} stroke={RENKLER.arkaplan} strokeWidth={2} />
    </Svg>
  );
};

export default CizgiGrafik;
