import { router, useLocalSearchParams } from 'expo-router';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { LOGOS } from '../components/carrierLogos';
import { Tappable } from '../components/Tappable';
import { Card, Gap, Row, T } from '../components/ui';
import { dur } from '../logic/format';
import { POLICIES, recommended, staleYear } from '../logic/policies';
import { color } from '../theme/tokens';

/**
 * One other company's published policy for paying drivers to wait, opened from Companies
 * (Edward, 25 Nov: the list shows the fact to compare; the rest is here, like your own company's
 * card opens your rules). Every fact says where it's from; what isn't published says so.
 */
export default function CompanyPolicy() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const p = POLICIES.find((x) => x.company === name);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/companies'));

  if (!p) {
    return (
      <Screen header={<BackBar label="Companies" onPress={back} />}>
        <T v="h2">Company not found</T>
      </Screen>
    );
  }

  const logo = LOGOS[p.company];
  const old = staleYear(p);
  const facts: [string, string][] = [
    ['Type', p.segment],
    ['Applies to', p.scope ?? 'Not said'],
    ['Free time', p.kind === 'hourly' ? 'None, paid by the hour' : p.freeMin != null ? dur(p.freeMin) : 'Not published'],
    ['Highest rate', p.rate != null ? `$${p.rate.toFixed(2)} an hour` : 'Not published'],
    ['If the customer doesn’t pay', p.kind === 'hourly' ? 'Still paid, it’s hourly' : p.guaranteed ? 'Still paid' : 'Not published'],
  ];

  return (
    <Screen header={<BackBar label="Companies" onPress={back} />}>
      {logo ? (
        <>
          <Image source={logo.src} style={{ width: logo.w, height: logo.h }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Gap h={8} />
        </>
      ) : null}
      <T v="h2">{p.company}</T>
      <Gap h={4} />
      <T v="bodySmall">{recommended(p) ? 'Recommended' : p.segment}</T>
      <Gap h={20} />
      {/* "Not published" in a figure size would say the line below it twice. */}
      {p.kind === 'none' ? null : (
        <>
          <T v="numberM">{p.headline}</T>
          <Gap h={8} />
        </>
      )}
      <T v="body">{p.line}</T>
      {old ? (
        <>
          <Gap h={8} />
          <T v="bodySmall" c={color.flag}>{`From ${old}. It may have changed.`}</T>
        </>
      ) : null}

      <Gap h={24} />
      <Card>
        {facts.map(([k, v], i) => (
          <View key={k}>
            {i ? <View style={styles.rule} /> : null}
            <Row base style={styles.factRow}>
              <T v="bodySmall" style={styles.flex}>{k}</T>
              <T v="bodyStrong" style={styles.value}>{v}</T>
            </Row>
          </View>
        ))}
      </Card>

      <Gap h={24} />
      <T v="bodyStrong">{p.sources.length === 1 ? 'Source' : 'Sources'}</T>
      <Gap h={10} />
      {p.sources.length ? (
        <Card>
          {p.sources.map((src, i) => (
            <View key={src.url}>
              {i ? <View style={styles.rule} /> : null}
              <Tappable
                accessibilityRole="link"
                accessibilityLabel={`${src.label}, ${src.when}. Opens the page.`}
                onPress={() => Linking.openURL(src.url)}
                highlight="fade"
                style={styles.factRow}
              >
                <T v="bodyStrong" style={styles.link}>{src.label}</T>
                <T v="bodyTiny">{src.when}</T>
              </Tappable>
            </View>
          ))}
        </Card>
      ) : (
        <T v="bodySmall">None. {p.company} hasn’t published anything on paying company drivers to wait that Docket could find.</T>
      )}
      <Gap h={16} />
      {/* The sources above already say where it's from. What they can't say: pay can change
          with the customer a driver hauls for (J.B. Hunt and Ryder do).
          "Account" is the trade word, but read as an app account (Edward, 25 Nov), so it's plain. */}
      <T v="bodyTiny">Pay can change with the customer you haul for, so yours may be different.</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  value: { flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  factRow: { paddingVertical: 12, gap: 2 },
  link: { textDecorationLine: 'underline' },
});
