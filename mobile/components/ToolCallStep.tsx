import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours, radii, spacing } from '@/constants/colours';
import type { ToolCallStep } from '@/api/types';

interface ToolCallStepProps {
  step: ToolCallStep;
}

/**
 * Collapsed accordion row for a single agent tool call. Shows tool name and
 * status icon; expands to key params and a result summary.
 */
export function ToolCallStep({ step }: ToolCallStepProps) {
  const [expanded, setExpanded] = useState(false);

  const isRunning = step.status === 'running';

  const icon =
    isRunning
      ? 'sync'
      : step.status === 'completed'
        ? 'checkmark-circle'
        : 'alert-circle';
  const iconColor =
    step.status === 'completed'
      ? colours.stateSuccess
      : step.status === 'failed'
        ? colours.ember
        : colours.purpleBright;

  const paramsSummary = Object.entries(step.params ?? {})
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' · ');

  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Tool call ${step.tool_name}`}
    >
      <View style={styles.header}>
        {isRunning ? (
          <ActivityIndicator size="small" color={colours.purpleBright} />
        ) : (
          <Ionicons name={icon} size={14} color={iconColor} />
        )}
        <Text style={styles.toolName} numberOfLines={1}>
          {step.tool_name}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colours.textSecondary}
        />
      </View>
      {expanded ? (
        <View style={styles.body}>
          {paramsSummary ? (
            <Text style={styles.params} numberOfLines={2}>
              {paramsSummary}
            </Text>
          ) : null}
          {step.result_summary ? (
            <Text style={styles.result}>{step.result_summary}</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolName: {
    flex: 1,
    color: colours.purpleBright,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  body: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colours.purpleDim,
    paddingTop: spacing.sm,
  },
  params: {
    color: colours.textSecondary,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  result: {
    color: colours.textPrimary,
    fontSize: 12,
    fontFamily: 'Offside',
    marginTop: spacing.xs,
  },
});
