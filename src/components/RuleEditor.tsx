import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dur, money } from '../logic/format';
import { useStore } from '../state/AppStore';
import { color, protoColor, radius, type } from '../theme/tokens';
import { MinusIcon, PlusIcon } from './Icons';
import { Row, Seg, T } from './ui';

/** − value + control (rules rate, Fix a time). */
export function Stepper({
  value,
  onMinus,
  onPlus,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={onMinus} style={styles.stepBtn}>
        <MinusIcon />
      </Pressable>
      <Text style={[type.numberS, styles.stepValue]}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={onPlus} style={styles.stepBtn}>
        <PlusIcon />
      </Pressable>
    </View>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={[styles.switch, on && styles.switchOn]}
    >
      <View style={[styles.knob, on && styles.knobOn]} />
    </Pressable>
  );
}

export function RuleSection({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <View style={[styles.rule, last && styles.ruleLast]}>{children}</View>;
}

/** The four detention rules, editable (Figma v1 05 Edit rules / 19 Your rules). */
export function RuleEditor() {
  const { s, a } = useStore();
  const r = s.rules;
  return (
    <View>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Free time</T>
          <T v="numberS">{dur(r.free)}</T>
        </Row>
        <Seg
          style={styles.chips}
          options={[60, 120, 180].map((v) => ({ key: String(v), label: `${v / 60}h` }))}
          value={String(r.free)}
          onChange={(k) => a.setRule('free', Number(k))}
        />
      </RuleSection>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Clock starts at</T>
          <T v="bodySmall">{r.start === 'appt' ? 'Appointment time' : 'Arrival'}</T>
        </Row>
        <Seg
          style={styles.chips}
          options={[
            { key: 'arrival' as const, label: 'Arrival' },
            { key: 'appt' as const, label: 'Appt time' },
          ]}
          value={r.start}
          onChange={(k) => a.setRule('start', k)}
        />
      </RuleSection>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Pay after free time</T>
        </Row>
        <Stepper
          value={`${money(r.rate)}/hr`}
          onMinus={() => a.setRule('rate', Math.max(0, r.rate - 1))}
          onPlus={() => a.setRule('rate', r.rate + 1)}
        />
      </RuleSection>
      <RuleSection last>
        <Row style={styles.ruleHead}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Off-duty breaks still count</T>
            <T v="bodyTiny">
              {r.breaksCount ? 'Breaks at the dock are paid as detention.' : 'Your company subtracts breaks from detention.'}
            </T>
          </View>
          <Switch on={r.breaksCount} onChange={(v) => a.setRule('breaksCount', v)} />
        </Row>
      </RuleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: color.line },
  ruleLast: { borderBottomWidth: 0 },
  ruleHead: { minHeight: 28 },
  chips: { marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  stepBtn: {
    width: 52,
    height: 44,
    borderRadius: radius.chip, borderCurve: 'continuous',
    backgroundColor: color.raise2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { flex: 1, textAlign: 'center', color: color.ink, fontVariant: ['tabular-nums'] },
  switch: { width: 52, height: 32, borderRadius: 16, borderCurve: 'continuous', backgroundColor: color.raise2 },
  switchOn: { backgroundColor: color.ink },
  knob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 26,
    height: 26,
    borderRadius: 13, borderCurve: 'continuous',
    backgroundColor: color.bg,
    boxShadow: `0 1px 3px ${protoColor.knobShadow}`,
  },
  knobOn: { left: 23 },
});
