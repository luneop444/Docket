import { router } from 'expo-router';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { glideRows, measureRows, type RowTops } from '../../components/reorderGlide';
import { glideNext, useReduceMotion } from '../../components/stepMotion';
import { Swap } from '../../components/Swap';
import { Fake, Gap, ListCard, ListRow, Pill, Seg, T } from '../../components/ui';
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
  const reduce = useReduceMotion();
  const board = sortBoard(SAMPLE_BOARD, s.sort);
  // Where each row was before a re-sort, so it can glide to its new place (reorderGlide).
  const list = useRef<unknown>(null);
  const before = useRef<RowTops>(null);
  useLayoutEffect(() => {
    if (!before.current) return;
    glideRows(list.current, before.current);
    before.current = null;
  }, [s.sort]);
  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodySmall">What waiting looks like at each company</T>

      <Gap h={24} />
      <T v="bodyStrong">Popular carriers</T>
      <Gap h={10} />
      {/* A ListCard: each row spans the card, so a pressed row lights up to its edges and dividers. */}
      <ListCard>
        {REAL_CARRIERS.map((c) => (
          <Row
            key={c.name}
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
        ))}
      </ListCard>
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
        onChange={(k) => {
          // The rows glide to their new order, so you can follow a company as the list re-sorts.
          glideNext(reduce);
          if (!reduce) before.current = measureRows(list.current);
          a.setSort(k);
        }}
      />
      <Gap h={12} />
      <View ref={list as never}>
        <ListCard>
          {board.map((c) => {
          const stats = showsStats(c);
          const h = headline(c, s.sort);
          return (
            <Row
              key={c.name}
              glide={c.name}
              sort={s.sort}
              figureFor={(k) => {
                const f = headline(c, k);
                return stats ? [f.value, f.label] : [`${c.reported}/${MIN_REPORTS}`, 'reports so far'];
              }}
              label={stats ? `${c.name}, ${h.value} ${h.label}, ${payLine(c)}` : `${c.name}, not enough reports yet`}
              onPress={() => open(c.name)}
              lead={null}
              body={
                <>
                  <T v="bodyStrong">{c.name}</T>
                  {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
                  <T v="bodySmall" c={color.ink}>{payLine(c)}</T>
                  {stats ? (
                    <Swap k={s.sort} render={(k) => <T v="bodyTiny">{otherStats(c, k)}</T>} />
                  ) : (
                    <T v="bodyTiny">{`Stats show at ${MIN_REPORTS} reports`}</T>
                  )}
                </>
              }
              value={stats ? h.value : `${c.reported}/${MIN_REPORTS}`}
              caption={stats ? h.label : 'reports so far'}
              muted={!stats}
            />
          );
        })}
        </ListCard>
      </View>
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
  glide,
  sort,
  figureFor,
}: {
  /** Names the row for reorderGlide, so it glides to its new place on a re-sort. */
  glide?: string;
  /** The board's sort: the figure swaps (Swap) when it changes, drawn by figureFor. */
  sort?: CompanySort;
  figureFor?: (k: CompanySort) => [string, string];
  label: string;
  onPress: () => void;
  lead: ReactNode;
  body: ReactNode;
  value: string;
  caption: string;
  muted?: boolean;
}) {
  const figure = (v: string, cap: string) => (
    <View style={styles.figure}>
      <T v="numberS" c={muted ? color.sub : color.ink} numberOfLines={1}>{v}</T>
      <T v="bodyTiny" style={styles.right}>{cap}</T>
    </View>
  );
  return (
    <View {...(glide ? ({ dataSet: { glide } } as object) : {})}>
      <ListRow accessibilityLabel={label} onPress={onPress}>
        {lead}
        <View style={styles.body}>{body}</View>
        {sort && figureFor ? <Swap k={sort} render={(k) => figure(...figureFor(k))} /> : figure(value, caption)}
        <ChevronRight size={16} c={color.faint} />
      </ListRow>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  figure: { alignItems: 'flex-end', maxWidth: 96 },
  right: { textAlign: 'right' },
  // The widest Figma logo is 108; one box keeps the rows lined up.
  logoBox: { width: 108, height: 36, justifyContent: 'center' },
});
