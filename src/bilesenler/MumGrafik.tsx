import React from 'react';
import Svg, { G, Rect, Line, Text as ST } from 'react-native-svg';
import { RENKLER } from '../sabitler/renkler';
import { MumVerisi } from '../veriler/hisseVerileri';

interface Props {
  veriler: MumVerisi[];
  genislik: number;
  yukseklik: number;
}

const MumGrafik: React.FC<Props> = ({ veriler, genislik, yukseklik }) => {
  const PL = 52, PR = 8, PT = 12, PB = 36;
  const GW = genislik - PL - PR;
  const GH = yukseklik - PT - PB;
  if (veriler.length < 2) return null;

  const fiyatlar = veriler.flatMap(m => [m.yuksek, m.dusuk]);
  const mn = Math.min(...fiyatlar) * 0.997;
  const mx = Math.max(...fiyatlar) * 1.003;
  const aralık = mx - mn;

  const ny = (f: number) => PT + GH - ((f - mn) / aralık) * GH;
  const mw = (GW / veriler.length) * 0.6;
  const mx2 = (i: number) => PL + (i + 0.5) * (GW / veriler.length);
  const adim = Math.ceil(veriler.length / 5);

  return (
    <Svg width={genislik} height={yukseklik}>
      {[0,1,2,3,4].map(i => {
        const f = mn + (aralık / 4) * i;
        const y = ny(f);
        return (
          <G key={i}>
            <Line x1={PL} y1={y} x2={genislik - PR} y2={y} stroke="#2A2A2A" strokeWidth={1} strokeDasharray="3,3" />
            <ST x={PL - 4} y={y + 4} fontSize={9} fill={RENKLER.metinIkincil} textAnchor="end">{f.toFixed(0)}</ST>
          </G>
        );
      })}
      {veriler.map((m, i) => {
        const x = mx2(i);
        const yukselis = m.kapanis >= m.acilis;
        const renk = yukselis ? RENKLER.yukselis : RENKLER.dusus;
        const gy = Math.min(ny(m.acilis), ny(m.kapanis));
        const gh = Math.max(Math.abs(ny(m.acilis) - ny(m.kapanis)), 1.5);
        return (
          <G key={i}>
            <Line x1={x} y1={ny(m.yuksek)} x2={x} y2={ny(m.dusuk)} stroke={renk} strokeWidth={1} />
            <Rect x={x - mw / 2} y={gy} width={mw} height={gh} fill={renk} rx={1} />
            {i % adim === 0 && <ST x={x} y={yukseklik - 4} fontSize={9} fill={RENKLER.metinUcuncul} textAnchor="middle">{m.tarih.slice(5)}</ST>}
          </G>
        );
      })}
    </Svg>
  );
};

export default MumGrafik;
