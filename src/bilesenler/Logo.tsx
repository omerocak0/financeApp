import React from 'react';
import { Image } from 'react-native';

interface LogoProps {
  genislik?: number;
  yukseklik?: number;
  style?: any;
}

export default function Logo({ genislik = 100, yukseklik = 100, style }: LogoProps) {
  return (
    <Image 
      source={require('../../assets/logo.png')} 
      style={[{ width: genislik, height: yukseklik, resizeMode: 'contain' }, style]} 
    />
  );
}
