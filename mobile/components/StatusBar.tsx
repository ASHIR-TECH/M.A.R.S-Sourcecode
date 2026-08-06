import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent } from '@/contexts/AgentContext';

interface StatusBarProps {
  /** Last-known online state; overrides the auth-derived default. */
  online?: boolean | null;
}

/** Top bar — connection indicator, agent status dot, wordmark. */
export function StatusBar({ online }: StatusBarProps) {
  const { online: authOnline, ready } = useAuth();
  const { status } = useAgent();

  const connected = online ?? authOnline;
  const agentActive = status?.status === 'active';

  return (
    <View style={styles.bar} testID="status-bar">
      <View style={styles.connection}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                connected === false ? colours.danger : ready ? colours.success : colours.warning,
            },
          ]}
        />
        <Text style={styles.label}>
          {connected === false ? 'Offline' : ready ? 'Connected' : 'Connecting…'}
        </Text>
      </View>

      <Text style={styles.wordmark}>ADTP</Text>

      <View style={styles.agent}>
        <Text style={styles.label}>Agent</Text>
        <View
          style={[
            styles.dot,
            { backgroundColor: agentActive ? colours.success : colours.textSecondary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colours.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colours.purpleDim,
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  agent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
  },
  wordmark: {
    color: colours.gold,
    fontSize: fontSizes.md,
    fontFamily: 'Audiowide',
    letterSpacing: 2,
  },
});
