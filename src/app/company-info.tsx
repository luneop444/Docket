import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LOGOS } from '../components/carrierLogos';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Fake, Gap, Hr, Pill, Row, T } from '../components/ui';
import { findCompany, noStatsNote, recruiterQuestions, recruiterText, rulesRows, showsStats } from '../logic/companyInfo';
import { useStore } from '../state/AppStore';
import { color, radius } from '../theme/tokens';

const back = () => (router.canGoBack() ? router.back() : router.replace('/companies'));

/** One company from the Companies tab: its reported rules, how waiting goes there, and what to ask before signing on. */
export default function CompanyInfo() {
  const { s, a } = useStore();
  const { name } = useLocalSearchParams<{ name: string }>();
  const c = findCompany(name);

  if (!c) {
    return (
      <Screen header={<BackBar onPress={back} />}>
        <T v="h2">Company not found</T>
        <Gap h={8} />
        <T v="bodySmall">It may have left the list. Go back and pick another.</T>
      </Screen>
    );
  }

  const yours = c.name === s.company;
  const enough = showsStats(c);
  const logo = LOGOS[c.name];

  function driveHere() {
    a.switchCompany(c!.name, c!.rules);
    a.toast(`You drive for ${c!.name} now. Check these rules against your paperwork.`);
    router.push('/rules');
  }

  async function copyQuestions() {
    await Clipboard.setStringAsync(recruiterText(c!));
    a.toast('Questions copied. Paste them in a text to the recruiter.');
  }

  return (
    <Screen
      header={<BackBar label="Companies" onPress={back} />}
      footer={
        yours ? (
          <Button label="Check your rules" variant="quiet" onPress={() => router.push('/rules')} />
        ) : (
          <Button label={`I drive for ${c.name}`} onPress={driveHere} />
        )
      }
    >
      {logo ? (
        <>
          <Image source={logo.src} style={{ width: logo.w, height: logo.h }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Gap h={12} />
        </>
      ) : null}
      <Row base>
        <T v="h2" style={styles.title}>{c.name}</T>
        {yours ? <Pill label="Yours" tone="signal" /> : null}
      </Row>
      <Gap h={8} />
      <T v="bodySmall">
        {logo
          ? 'Detention rules as drivers report them. Check yours against your paperwork.'
          : `${c.drivers.toLocaleString()} drivers on Docket. ${c.reported} reported how their stops went.`}
      </T>

      <Gap h={24} />
      <T v="bodyStrong">Detention rules drivers report</T>
      <Gap h={10} />
      <Card>
        {rulesRows(c).map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 14 }} /> : null}
            <Row>
              <T v="body" c={color.sub}>{label}</T>
              <T v="bodyStrong">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
      <Gap h={8} />
      <T v="bodyTiny">Rules can differ by fleet or division. Your paperwork wins.</T>

      <Gap h={24} />
      <T v="bodyStrong">Waiting at {c.name}</T>
      <Gap h={10} />
      <Card>
        {enough ? (
          <View style={{ gap: 14 }}>
            <Line value={c.avg} text="average wait per stop" />
            <Line value={`${c.past}%`} text="of stops went past free time" />
            <Line value={`${c.paid}%`} text="of drivers say detention was paid" />
          </View>
        ) : (
          <T v="bodySmall">{noStatsNote(c)}</T>
        )}
      </Card>

      {yours ? null : (
        <>
          <Gap h={24} />
          <T v="bodyStrong">Thinking of driving here?</T>
          <Gap h={6} />
          <T v="bodySmall">Ask their recruiter before you sign on. Get the answers in writing.</T>
          <Gap h={10} />
          <Card>
            <View style={{ gap: 12 }}>
              {recruiterQuestions(c).map((q, i) => (
                <View key={q} style={styles.q}>
                  <View style={styles.num}>
                    <T v="labelSmall">{i + 1}</T>
                  </View>
                  <T v="bodySmall" c={color.ink} style={styles.flex}>{q}</T>
                </View>
              ))}
            </View>
            <Gap h={14} />
            <Button label="Copy questions" variant="white" small onPress={copyQuestions} />
          </Card>
        </>
      )}

      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Made-up numbers until drivers report for real.
      </T>
    </Screen>
  );
}

function Line({ value, text }: { value: string; text: string }) {
  return (
    <View style={styles.line}>
      <T v="numberS" style={styles.value}>{value}</T>
      <T v="bodySmall" style={styles.flex}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { flexShrink: 1 },
  flex: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  value: { minWidth: 72 },
  q: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: {
    width: 24,
    height: 24,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
