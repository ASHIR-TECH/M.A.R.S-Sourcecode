import React from 'react';
import { SvgXml } from 'react-native-svg';
import { logo } from '@/constants/brand';

type BrandLogoProps = {
  width?: number;
  color?: string;
};

/**
 * The MARS app logo — rendered from the source SVG at runtime.
 */
export function BrandLogo({ width = 280, color }: BrandLogoProps) {
  const height = (width * 636.921317) / 1024;
  return <SvgXml xml={logo} width={width} height={height} color={color} />;
}
