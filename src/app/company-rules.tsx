import { router } from 'expo-router';
import { Fragment } from 'react';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Card, Fake, Gap, Hr, Row, T } from '../components/ui';
import { dur, money } from '../logic/format';
import { COMPANIES, TEST_SETUP } from '../logic/sampleData';
import type { RulesCheck } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/** Figma A2 Company rules: prefilled from other drivers, one tap to confirm. */
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

  function answer(check: RulesCheck) {
    a.setRulesCheck(check);
    router.push(check === 'different' ? '/edit-rules' : '/loads');
  }

  return (
    <Screen
      step={2}
      header={<OnboardingBar step={2} onBack={() => router.navigate('/company')} />}
      footer={
        <>
          <Button label="Matches my paperwork" onPress={() => answer('matches')} />
          <Button label="Mine is different" variant="quiet" onPress={() => answer('different')} />
          <Button label="I’m not sure" variant="text" onPress={() => answer('unsure')} />
        </>
      }
    >
      <T v="h2">{s.company}’s detention rules</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Reported by {c ? c.reported : 0} drivers. Check it against your paperwork. Rules can differ by fleet or division.
      </T>
      <Gap h={20} />
      <Card>
        {rows.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 8 }} /> : null}
            <Row style={{ minHeight: 40 }}>
              <T v="bodySmall">{label}</T>
              <T v="bodyStrong">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
      {TEST_SETUP?.company !== s.company ? (
        <>
          <Gap h={12} />
          <T v="bodyTiny">
            <Fake label="Sample data" /> These rules are made up for this prototype, not {s.company}’s real policy.
          </T>
        </>
      ) : null}
    </Screen>
  );
}
