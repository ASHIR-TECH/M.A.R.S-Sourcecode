import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colours, goldGradient } from '@/constants/colours';

interface GradientTextProps extends TextProps {
  children: React.ReactNode;
}

/**
 * Gold gradient text (Audiowide wordmarks, screen titles). Rendered by
 * masking a LinearGradient through the text glyphs via MaskedView.
 */
export function GradientText({ children, style, ...rest }: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, styles.maskText]} {...rest}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={goldGradient.colors}
        start={goldGradient.start}
        end={goldGradient.end}
        style={styles.gradient}
      >
        <Text style={[style, styles.transparentText]} {...rest}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  maskText: {
    backgroundColor: colours.transparent,
  },
  gradient: {
    alignSelf: 'flex-start',
  },
  transparentText: {
    color: colours.transparent,
  },
});
