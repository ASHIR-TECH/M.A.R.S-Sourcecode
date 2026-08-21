import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, Image } from 'react-native';

const nativeSource = require('../../assets/orb-background.jpg') as any;

const orbStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
});

function WebBackground() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    html.style.background = '#1b0d00';
    html.style.margin = '0';
    html.style.padding = '0';
    html.style.height = '100%';
    body.style.background = '#1b0d00';
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.height = '100%';
    body.style.overflow = 'hidden';

    const root = document.getElementById('root');
    if (root) {
      root.style.background = 'transparent';
    }

    if (document.getElementById('orb-web-bg')) return;

    const bg = document.createElement('div');
    bg.id = 'orb-web-bg';
    Object.assign(bg.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '-1',
      pointerEvents: 'none',
    });

    const img = document.createElement('img');
    img.src = '/orb-background.jpg';
    img.alt = '';
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    });

    bg.appendChild(img);
    body.insertBefore(bg, body.firstChild);
  }, []);

  return null;
}

export function OrbBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={orbStyles.container}>
      {Platform.OS === 'web' && <WebBackground />}
      {Platform.OS !== 'web' && (
        <Image
          source={nativeSource}
          style={orbStyles.bg}
          resizeMode="cover"
        />
      )}
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
