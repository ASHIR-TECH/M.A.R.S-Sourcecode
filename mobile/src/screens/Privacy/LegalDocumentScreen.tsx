import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useTabBarVisibility } from '../../navigation/TabBarVisibility';
import { isAtBottom } from '../../navigation/scrollBottom';
import { LegalDocument, LegalSection } from './legalContent';
import { styles } from './LegalDocumentScreen.styles';

interface LegalDocumentScreenProps {
  document: LegalDocument;
  onClose: () => void;
}

function Section({ section }: { section: LegalSection }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{section.heading}</Text>
      {section.paragraphs?.map((paragraph, index) => (
        <Text key={`p${index}`} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
      {section.bullets?.map((bullet, index) => (
        <View key={`b${index}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>{'\u2022'}</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * In-app reader for the legal documents (Privacy Policy / Terms of Service).
 * Renders scrollable, app-styled copy so the user never leaves Mars to read it.
 */
export function LegalDocumentScreen({ document, onClose }: LegalDocumentScreenProps) {
  const setTabBarHidden = useTabBarVisibility();
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const offsetY = useRef(0);

  const syncBarVisibility = useCallback(() => {
    setTabBarHidden(
      !isAtBottom({
        offsetY: offsetY.current,
        layoutHeight: layoutHeight.current,
        contentHeight: contentHeight.current,
      })
    );
  }, [setTabBarHidden]);

  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    offsetY.current = contentOffset.y;
    layoutHeight.current = layoutMeasurement.height;
    contentHeight.current = contentSize.height;
    syncBarVisibility();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel={`Close ${document.title}`}>
          <Text style={styles.closeText}>{'\u2715'}</Text>
        </Pressable>
        <Text style={styles.kicker}>{document.kicker}</Text>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.updated}>Last updated {document.updated}</Text>
        <Text style={styles.intro}>{document.intro}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={(e) => {
          layoutHeight.current = e.nativeEvent.layout.height;
          syncBarVisibility();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
          syncBarVisibility();
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {document.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}
