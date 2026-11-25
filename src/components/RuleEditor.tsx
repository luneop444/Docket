import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { tick } from '../logic/haptics';
import { dur, money } from '../logic/format';
import { useStore } from '../state/AppStore';
import type { Rules } from '../logic/detention';
import { color, protoColor, type } from '../theme/tokens';
import { AmountField } from './AmountField';
import { MinusIcon, PlusIcon } from './Icons';
import { RollText } from './RollText';
import { Tappable } from './Tappable';
import { useReduceMotion } from './stepMotion';
import { useRepeat } from './useRepeat';
import { Row, Seg, T } from './ui';

/** − value + control (rules rate, Fix a time). */
export function Stepper({
  value,
  onMinus,
  onPlus,
  label = 'value',
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  /** What the number is ("pay rate"), so the buttons say "Lower pay rate", not just "Less". */
  label?: string;
}) {
  const minus = useRepeat(() => {
    tick();
    onMinus();
  });
  const plus = useRepeat(() => {
    tick();
    onPlus();
  });
  return (
    <View style={styles.stepper}>
      <Tappable accessibilityRole="button" accessibilityLabel={`Lower ${label}`} accessibilityHint={value} {...minus} instant style={styles.stepBtn}>
        <MinusIcon />
      </Tappable>
      <View style={styles.stepValueBox} accessibilityLiveRegion="polite">
        <RollText text={value} style={[type.numberS, styles.stepValue]} />
      </View>
      <Tappable accessibilityRole="button" accessibilityLabel={`Raise ${label}`} accessibilityHint={value} {...plus} instant style={styles.stepBtn}>
        <PlusIcon />
      </Tappable>
    </View>
  );
}

/** Slides like an iOS switch (knob and track together, 200 ms); Reduce Motion just switches. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      x.setValue(on ? 1 : 0);
      return;
    }
    Animated.timing(x, { toValue: on ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [on, reduce, x]);
  const bg = x.interpolate({ inputRange: [0, 1], outputRange: [color.track, color.ink] });
  const left = x.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      // The web build drops accessibilityState: aria-checked is what a screen reader reads there.
      aria-checked={on}
      onPress={() => {
        tick();
        onChange(!on);
      }}
    >
      <Animated.View style={[styles.switch, { backgroundColor: bg }]}>
        <Animated.View style={[styles.knob, { left }]} />
      </Animated.View>
    </Pressable>
  );
}

export function RuleSection({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <View style={[styles.rule, last && styles.ruleLast]}>{children}</View>;
}

/**
 * The four detention rules, editable (Figma v1 05 Edit rules / 19 Your rules). In setup, `unset`
 * names the rules the driver hasn't given yet: those show no answer, rather than a default that
 * reads like their company's rule. `onSet` hears each one as it's given.
 */
export function RuleEditor({ unset, onSet }: { unset?: Set<keyof Rules>; onSet?: (k: keyof Rules) => void } = {}) {
  const { s, a } = useStore();
  const r = s.rules;
  const blank = (k: keyof Rules) => !!unset?.has(k);
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => {
    a.setRule(k, v);
    onSet?.(k);
  };
  const [rateText, setRateText] = useState('');
  return (
    <View>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Free time</T>
          {blank('free') ? null : <T v="numberS">{dur(r.free)}</T>}
        </Row>
        <Seg
          style={styles.chips}
          label="Free time"
          options={[60, 90, 120, 180].map((v) => ({ key: String(v), label: dur(v) }))}
          value={blank('free') ? null : String(r.free)}
          onChange={(k) => set('free', Number(k))}
        />
      </RuleSection>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Clock starts at</T>
          {blank('start') ? null : <T v="bodySmall">{r.start === 'appt' ? 'Appointment time' : 'Arrival'}</T>}
        </Row>
        <Seg
          style={styles.chips}
          label="Clock starts at"
          options={[
            { key: 'arrival' as const, label: 'Arrival' },
            { key: 'appt' as const, label: 'Appt time' },
          ]}
          value={blank('start') ? null : r.start}
          onChange={(k) => set('start', k)}
        />
      </RuleSection>
      <RuleSection>
        <Row style={styles.ruleHead}>
          <T v="bodyStrong">Pay after free time</T>
        </Row>
        {blank('rate') || rateText ? (
          // Typed in during setup: there's no sensible rate to step from.
          <View style={styles.chips}>
            <AmountField
              label="Pay per hour after free time"
              value={rateText}
              onChange={(v) => {
                setRateText(v);
                const n = Number(v);
                if (v && Number.isFinite(n)) set('rate', n);
              }}
            />
            <T v="bodyTiny">Dollars per hour, from your paperwork.</T>
          </View>
        ) : (
          <Stepper
            label="pay rate"
            value={`${money(r.rate)}/hr`}
            onMinus={() => a.setRule('rate', Math.max(0, r.rate - 1))}
            onPlus={() => a.setRule('rate', r.rate + 1)}
          />
        )}
      </RuleSection>
      <RuleSection last>
        <Row style={styles.ruleHead}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Off-duty breaks still count</T>
            {blank('breaksCount') ? null : (
              <T v="bodyTiny">
                {r.breaksCount ? 'Breaks at the dock are paid as detention.' : 'Your company subtracts breaks from detention.'}
              </T>
            )}
          </View>
          {unset ? null : (
            <Switch label="Off-duty breaks still count" on={r.breaksCount} onChange={(v) => a.setRule('breaksCount', v)} />
          )}
        </Row>
        {unset ? (
          // In setup an answer is asked for, not assumed: a switch is always on or off.
          <Seg
            style={styles.chips}
            label="Off-duty breaks still count"
            options={[
              { key: 'yes' as const, label: 'Yes, they count' },
              { key: 'no' as const, label: 'No' },
            ]}
            value={blank('breaksCount') ? null : r.breaksCount ? 'yes' : 'no'}
            onChange={(k) => set('breaksCount', k === 'yes')}
          />
        ) : null}
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
    borderRadius: 22,
    backgroundColor: color.raise2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: { backgroundColor: color.signal },
  stepValueBox: { flex: 1, alignItems: 'center' },
  stepValue: { color: color.ink, fontVariant: ['tabular-nums'] },
  // Off track uses `track` (3.06:1 on white) so the off switch is visible (WCAG 1.4.11); raise2 was 1.2:1.
  switch: { width: 52, height: 32, borderRadius: 16, borderCurve: 'continuous', backgroundColor: color.track },
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
});
