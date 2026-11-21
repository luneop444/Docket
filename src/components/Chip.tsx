import { StyleSheet, View } from 'react-native';
import { color } from '../theme/tokens';
import { CheckIcon } from './Icons';
import { T } from './ui';

/** A claim's status: plain, flagged (short, not sent) or lime (paid). */
export function Chip({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'flag' | 'lime' }) {
  return (
    <View style={[styles.chip, tone === 'flag' && styles.flag, tone === 'lime' && styles.lime]}>
      {tone === 'lime' ? <CheckIcon c={color.ink} size={12} /> : null}
      <T v="labelSmall" c={tone === 'flag' ? color.flag : color.ink}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: color.raise2 },
  // Solid, so red text keeps its contrast on glass over anything (5:1 on flagBg).
  flag: { backgroundColor: color.flagBg },
  lime: { backgroundColor: color.signal },
});
