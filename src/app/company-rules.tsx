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
const ANSWERS: { k: RulesCheck; label: string }[] = [
  // One line each, with what happens next in the answer, so all three fit above Continue
  // even on a short screen: a hidden "I'm not sure" would nudge drivers to the other two.
  { k: 'matches', label: 'Yes, it matches' },
  { k: 'different', label: 'No, I’ll fix them' },
  { k: 'unsure', label: 'I’m not sure, use these for now' },
]

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
      {/* A heading that's one line for every carrier, so a long name (Ruan Transportation
          Management Systems) can't push an answer under Continue. The company goes first in
          the line under it. */}
      <T v="h2">Your detention rules</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {keepLast(`${s.company}, as ${c ? c.reported : 0} drivers reported them. Rules vary by fleet.`)}
      </T>
      {/* Sits with the subtitle it qualifies, so nothing comes between the rules and the question. */}
      {TEST_SETUP?.company !== s.company ? (
        <>
          <Gap h={8} />
          <T v="bodyTiny">
            <Fake label="Sample data" /> {keepLast('Made up for this prototype, not the real policy.')}
          </T>
        </>
      ) : null}
      <Gap h={24} />
      <Card>
        {rows.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 13 }} /> : null}
            <Row>
              <T v="body" c={color.sub}>{label}</T>
              {/* Grey label, black value: colour already separates them, so no bold. */}
              <T v="body">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
      <Gap h={24} />
      {/* The decision on this screen: as strong as its answers, not a caption. */}
      <T v="bodyStrong">{keepLast('Does this match your paperwork?')}</T>
      <Gap h={10} />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Does this match your paperwork?">
        {ANSWERS.map((o) => (
          <ChoiceTile
            key={o.k}
            label={o.label}
            plain
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
