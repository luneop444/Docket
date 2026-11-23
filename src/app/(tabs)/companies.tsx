import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Card, Fake, Gap, Hr, Pill, press, Seg, T } from '../../components/ui';
import { headline, noStatsNote, otherStats, payLine, REAL_CARRIERS, showsStats, sortBoard } from '../../logic/companyInfo';
import { durShort, rateShort } from '../../logic/format';
import { MIN_REPORTS, SAMPLE_BOARD } from '../../logic/sampleData';
import type { CompanySort } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

const open = (name: string) => router.push({ pathname: '/company-info', params: { name } });

/**
 * v1 18: Companies, as two lists. Each row leads with its key figure on the right (pay for
 * the real carriers; the wait or % paid, following the sort, for what drivers report), so
 * the numbers read at a glance and nothing inside a row looks like its own button.
 */
export default function Companies() {
  const { s, a } = useStore();
  const board = sortBoard(SAMPLE_BOARD, s.sort);
  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodySmall">What waiting looks like at each company</T>

      <Gap h={24} />
      <T v="bodyStrong">Popular carriers</T>
      <Gap h={10} />
      <Card style={styles.list}>
        {REAL_CARRIERS.map((c, i) => (
          <Fragment key={c.name}>
            {i > 0 ? <Hr /> : null}
            <Row
              label={`${c.name}, ${payLine(c)}`}
              onPress={() => open(c.name)}
              lead={
                <View style={styles.logoBox}>
                  <Image
                    source={LOGOS[c.name].src}
                    style={{ width: LOGOS[c.name].w, height: LOGOS[c.name].h }}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              }
              body={c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
              value={rateShort(c.rules.rate)}
              caption={`after ${durShort(c.rules.free)} free`}
            />
          </Fragment>
        ))}
      </Card>
      <Gap h={8} />
      <T v="bodyTiny">{noStatsNote(REAL_CARRIERS[0])}</T>

      <Gap h={32} />
      <T v="bodyStrong">What drivers report</T>
      <Gap h={10} />
      <Seg<CompanySort>
        label="Sort companies by"
        options={[
          { key: 'wait', label: 'Shortest waits' },
          { key: 'paid', label: 'Most often paid' },
        ]}
        value={s.sort}
        onChange={a.setSort}
      />
      <Gap h={12} />
      <Card style={styles.list}>
        {board.map((c, i) => {
          const stats = showsStats(c);
          const h = headline(c, s.sort);
          return (
            <Fragment key={c.name}>
              {i > 0 ? <Hr /> : null}
              <Row
                label={stats ? `${c.name}, ${h.value} ${h.label}, ${payLine(c)}` : `${c.name}, not enough reports yet`}
                onPress={() => open(c.name)}
                lead={null}
                body={
                  <>
                    <T v="bodyStrong">{c.name}</T>
                    {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
                    <T v="bodySmall" c={color.ink}>{payLine(c)}</T>
                    <T v="bodyTiny">{stats ? otherStats(c, s.sort) : `Stats show at ${MIN_REPORTS} reports`}</T>
                  </>
                }
                value={stats ? h.value : `${c.reported}/${MIN_REPORTS}`}
                caption={stats ? h.label : 'reports so far'}
                muted={!stats}
              />
            </Fragment>
          );
        })}
      </Card>
      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Made-up companies and numbers until drivers report for real.
      </T>
    </Screen>
  );
}

/** One list row: who on the left, the key figure on the right, a quiet chevron. */
function Row({
  label,
  onPress,
  lead,
  body,
  value,
  caption,
  muted,
}: {
  label: string;
  onPress: () => void;
  lead: ReactNode;
  body: ReactNode;
  value: string;
  caption: string;
  muted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && press.give]}
    >
      {lead}
      <View style={styles.body}>{body}</View>
      <View style={styles.figure}>
        <T v="numberS" c={muted ? color.sub : color.ink} numberOfLines={1}>{value}</T>
        <T v="bodyTiny" style={styles.right}>{caption}</T>
      </View>
      <ChevronRight size={16} c={color.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  figure: { alignItems: 'flex-end', maxWidth: 96 },
  right: { textAlign: 'right' },
  // The widest Figma logo is 108; one box keeps the rows lined up.
  logoBox: { width: 108, height: 36, justifyContent: 'center' },
});
