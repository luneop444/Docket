import { router } from 'expo-router';
import { Fragment } from 'react';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Gap, Hr, Row, T } from '../components/ui';
import { dur, money } from '../logic/format';
import { COMPANIES } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/** v1 04 Company rules (review) */
export default function CompanyRules() {
  const { s } = useStore();
  const c = COMPANIES.find((c) => c.name === s.company);
  const r = s.rules;
  const rows: [string, string][] = [
    ['Free time', dur(r.free)],
    ['Clock starts at', r.start === 'appt' ? 'Appointment time' : 'Arrival'],
    ['Pay after free time', `${money(r.rate)} an hour`],
    ['Off-duty breaks still count', r.breaksCount ? 'Yes' : 'No'],
  ];
  return (
    <Screen
      header={<BackBar onPress={() => router.navigate('/paytype')} />}
      footer={
        <>
          <Button label="These match my paperwork" onPress={() => router.push('/location')} />
          <Button label="Mine are different" variant="text" onPress={() => router.push('/edit-rules')} />
        </>
      }
    >
      <T v="h2">{s.company}’s detention rules</T>
      <Gap h={8} />
      <T v="bodySmall">
        Reported by {c ? c.reported : 0} drivers. Check it against your paperwork. Rules can differ by fleet or division.
      </T>
      <Gap h={16} />
      <Card>
        {rows.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 8 }} /> : null}
            <Row style={{ minHeight: 40 }}>
              <T v="bodySmall" c={color.ink}>{label}</T>
              <T v="bodyStrong">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}
