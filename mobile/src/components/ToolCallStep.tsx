import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { AgentToolCall, ToolCallStatus } from '../desktop/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fonts } from '../theme/typography';

const STATUS_GLYPH: Record<ToolCallStatus, string> = {
  running: '●',
  completed: '✓',
  failed: '✕',
};

const STATUS_COLOR: Record<ToolCallStatus, string> = {
  running: colors.accent,
  completed: '#5BC48A',
  failed: '#E05A47',
};

function formatParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  return Object.entries(params)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('\n');
}

/**
 * Collapsed tool-call row shown under an agent reply (PHASE_14 §"Tool call
 * steps"). Collapsed: name + status glyph. Expanded: params + result summary.
 */
export function ToolCallStep({ call }: { call: AgentToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const params = formatParams(call.params);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={`Tool ${call.name}, ${call.status}`}
      testID="tool-call-step"
      style={styles.row}
    >
      <View style={styles.header}>
        <Text style={[styles.glyph, { color: STATUS_COLOR[call.status] }]}>{STATUS_GLYPH[call.status]}</Text>
        <Text style={styles.name}>{call.name}</Text>
        <Text style={styles.chevron}>{expanded ? '⌄' : '›'}</Text>
      </View>
      {expanded && (params.length > 0 || call.result) && (
        <View style={styles.body}>
          {params.length > 0 && <Text style={styles.mono}>{params}</Text>}
          {call.result ? <Text style={styles.result}>{call.result}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.4)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  glyph: { fontSize: 11 },
  name: { color: colors.textPrimary, fontSize: 12, fontFamily: fonts.montserrat, flex: 1 },
  chevron: { color: colors.textMuted, fontSize: 12 },
  body: { marginTop: spacing.xs },
  mono: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.montserrat },
  result: { color: colors.textPrimary, fontSize: 11, marginTop: spacing.xs, fontStyle: 'italic' },
});
