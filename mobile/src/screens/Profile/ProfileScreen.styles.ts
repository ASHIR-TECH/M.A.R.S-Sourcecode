import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { alignItems: 'center', gap: 4, marginBottom: spacing.xl },
  name: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  email: { color: colors.textMuted, fontSize: 13 },
  provider: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
