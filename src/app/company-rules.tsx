import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Card, ChoiceTile, Fake, Gap, Hr, Row, T } from '../components/ui';
import { dur, keepLast, money } from '../logic/format';
import { COMPANIES, TEST_SETUP } from '../logic/sampleData';
import type { RulesCheck } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/**
 * The three honest answers to "Does this match your paperwork?", none picked to start.
 * Same pick-then-Continue pattern as the loads question (lime = chosen, black = go).
 */
const ANSWERS: { k: RulesCheck; label: string; sub: string }[] = [
  { k: 'matches', label: 'Yes, it matches', sub: 'Docket uses these rules' },
  { k: 'different', label: 'No, mine is different', sub: 'You’ll fix them next' },
  { k: 'unsure', label: 'I’m not sure', sub: 'Use these for now, change anytime' },
];

/**
 * Figma A2 Company rules, prefilled from other drivers. The driver is asked whether they
 * match, with no answer styled as the default: a wrong "yes" here makes every detention
 * figure after it wrong.
 */
export default function CompanyRules() {
  const { s, a } = useStore();
  const c = COMPANIES.find((c) => c.name === s.company);
  const r = s.rules;
  const rows: [string, string][] = [
    ['Free time', dur(r.free)],
    ['Clock starts at', r.start === 'appt' ? 'Appointment time' : 'Arrival'],
    ['Pay after free time', `${money(r.rate)} an hour`],
    ['Off-duty breaks still count', r.breaksCount ? 'Yes' : 'No'],
  ];

  const [picked, setPicked] = useState<RulesCheck | null>(s.rulesCheck ?? null);

  function next() {
    if (!picked) return;
    a.setRulesCheck(picked);
    router.push(picked === 'different' ? '/edit-rules' : '/loads');
  }

  return (
    <Screen
      step={2}
      header={<OnboardingBar step={2} onBack={() => router.navigate('/company')} />}
      footer={<Button label="Continue" disabled={!picked} onPress={next} />}
    >
      <T v="h2">{keepLast(`${s.company}’s detention rules`)}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {keepLast(`Reported by ${c ? c.reported : 0} drivers. Rules can differ by fleet or division.`)}
      </T>
      <Gap h={24} />
      <Card>
        {rows.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 17 }} /> : null}
            <Row>
              <T v="body" c={color.sub}>{label}</T>
              <T v="bodyStrong">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
      {TEST_SETUP?.company !== s.company ? (
        <>
          <Gap h={8} />
          <T v="bodyTiny">
            <Fake label="Sample data" /> {keepLast(`These rules are made up for this prototype, not ${s.company}’s real policy.`)}
          </T>
        </>
      ) : null}
      <Gap h={24} />
      <T v="labelSmall">Does this match your paperwork?</T>
      <Gap h={10} />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Does this match your paperwork?">
        {ANSWERS.map((o) => (
          <ChoiceTile
            key={o.k}
            label={o.label}
            sub={keepLast(o.sub)}
            selected={picked === o.k}
            onPress={() => setPicked(o.k)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
