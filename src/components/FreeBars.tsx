import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { clock, dur, durShort, money } from '../logic/format';
import { color } from '../theme/tokens';
import { T } from './ui';

/** Which free-time bar Home shows. Prototype switch: ?bar=a..e on the Home link. */
export const BAR_VARIANTS = ['a', 'b', 'c', 'd', 'e'] as const;
export type BarVariant = (typeof BAR_VARIANTS)[number];
export const isBarVariant = (v: unknown): v is BarVariant => BAR_VARIANTS.includes(v as BarVariant);

export interface BarData {
  /** Minutes after midnight. */
  arrive: number;
  start: number;
  freeEnd: number;
  now: number;
  /** Free time in minutes, and the hourly rate. */
  free: number;
  rate: number;
  owed: number;
  paid: boolean;
}

export function FreeBars({ v, d }: { v: BarVariant; d: BarData }) {
  if (v === 'b') return <EarlyWait d={d} />;
  if (v === 'c') return <HourBlocks d={d} />;
  if (v === 'd') return <Inside d={d} />;
  if (v === 'e') return <NowLine d={d} />;
  return <Current d={d} />;
}

const used = (d: BarData) => Math.max(0, Math.min(d.now, d.freeEnd) - d.start);
const paidMin = (d: BarData) => Math.max(0, d.now - d.freeEnd);

/** A: grey is free time used, black is paid detention, free time not used yet is the track. */
function Current({ d }: { d: BarData }) {
  const u = used(d), p = paidMin(d);
  return (
    <View>
      <View style={styles.bar}>
        {u > 0 ? <View style={{ flex: u, backgroundColor: color.free }} /> : null}
        {d.now < d.freeEnd ? <View style={{ flex: Math.max(1, d.freeEnd - d.start) - u }} /> : null}
        {p > 0 ? <View style={{ flex: p, backgroundColor: color.detention }} /> : null}
      </View>
      <Labels left={`${durShort(d.free)} free from ${clock(d.start)}`} right={d.paid ? `Paid from ${clock(d.freeEnd)}` : clock(d.freeEnd)} ink={d.paid} />
    </View>
  );
}

/** Hatched light grey, on the web; elsewhere the plain light grey. */
const HATCH = Platform.select<ViewStyle>({
  web: { backgroundImage: `repeating-linear-gradient(135deg, ${color.free} 0 2px, ${color.bg} 2px 5px)` } as ViewStyle,
  default: { backgroundColor: color.raise2 },
});

/** B: from arrival, so the wait before free time started shows (hatched, unpaid). */
function EarlyWait({ d }: { d: BarData }) {
  const early = Math.max(0, d.start - d.arrive);
  const from = Math.min(d.arrive, d.start);
  const u = used(d), p = paidMin(d), left = Math.max(0, d.freeEnd - Math.max(d.now, d.start));
  const span = Math.max(1, Math.max(d.now, d.freeEnd) - from);
  const at = (m: number) => `${((m - from) / span) * 100}%` as const;
  return (
    <View>
      <View style={[styles.bar, styles.gapped, { backgroundColor: 'transparent' }]}>
        {early > 0 ? <View style={[{ flex: early }, HATCH]} /> : null}
        {u > 0 ? <View style={{ flex: u, backgroundColor: color.free }} /> : null}
        {left > 0 ? <View style={{ flex: left, backgroundColor: color.raise2 }} /> : null}
        {p > 0 ? <View style={{ flex: p, backgroundColor: color.detention }} /> : null}
      </View>
      <View style={styles.ticks}>
        {early > 0 ? <Tick at="0%" label={clock(d.arrive)} /> : null}
        <Tick at={at(d.start)} label={clock(d.start)} />
        <Tick at={at(d.freeEnd)} label={clock(d.freeEnd)} />
      </View>
      <Labels
        left={early > 0 ? `Waited ${dur(early)} before free time` : `${durShort(d.free)} free from ${clock(d.start)}`}
        right={d.paid ? `${dur(p)} paid` : `Paid from ${clock(d.freeEnd)}`}
        ink={d.paid}
      />
    </View>
  );
}

function Tick({ at, label }: { at: `${number}%`; label: string }) {
  return (
    <View style={[styles.tick, { left: at }]}>
      <T v="bodyTiny" c={color.sub}>
        {label}
      </T>
    </View>
  );
}

/** C: one block per hour, so a paid block reads as one hour of pay. */
function HourBlocks({ d }: { d: BarData }) {
  const freeH = Math.max(1, Math.round(d.free / 60));
  const u = used(d), p = paidMin(d);
  const paidH = Math.ceil(p / 60);
  const blocks: { fill: number; tone: string }[] = [];
  for (let i = 0; i < freeH; i++) blocks.push({ fill: Math.min(1, Math.max(0, u / 60 - i)), tone: color.free });
  for (let i = 0; i < Math.max(1, paidH); i++) blocks.push({ fill: Math.min(1, Math.max(0, p / 60 - i)), tone: color.detention });
  const full = Math.floor(p / 60), part = d.owed - full * d.rate;
  const sum = d.paid && p > 0 ? [...Array(full).fill(money(d.rate)), ...(part > 0.004 ? [money(part)] : [])].join(' + ') : `${money(d.rate)} an hour after ${clock(d.freeEnd)}`;
  return (
    <View>
      <View style={styles.blocks}>
        {blocks.map((b, i) => (
          <View key={i} style={styles.block}>
            <View style={{ width: `${b.fill * 100}%`, height: '100%', backgroundColor: b.tone }} />
          </View>
        ))}
      </View>
      <Labels left={`${freeH} free ${freeH === 1 ? 'hour' : 'hours'}`} right={sum} ink={d.paid} />
    </View>
  );
}

/** D: a thick bar that carries its own labels. */
function Inside({ d }: { d: BarData }) {
  const u = Math.max(1, Math.max(d.freeEnd, d.now) - d.start), p = paidMin(d);
  const free = Math.max(1, d.freeEnd - d.start);
  return (
    <View>
      <View style={styles.thick}>
        <View style={[styles.seg, { flex: Math.min(free, u), backgroundColor: color.raise2 }]}>
          <T v="labelSmall" c={color.sub} numberOfLines={1}>
            {`${durShort(d.free)} free`}
          </T>
        </View>
        {p > 0 ? (
          <View style={[styles.seg, styles.segEnd, { flex: p, backgroundColor: color.detention }]}>
            <T v="labelSmall" c={color.bg} numberOfLines={1}>
              {`${dur(p)} paid`}
            </T>
          </View>
        ) : null}
      </View>
      <Labels left={`From ${clock(d.start)}`} right={`Paid from ${clock(d.freeEnd)}`} ink={d.paid} />
    </View>
  );
}

/** E: a thin line with the paid boundary marked and a dot at now. */
function NowLine({ d }: { d: BarData }) {
  const end = Math.max(d.now, d.freeEnd), span = Math.max(1, end - d.start);
  const u = used(d), p = paidMin(d);
  const edge = `${((d.freeEnd - d.start) / span) * 100}%` as const;
  const now = `${((d.now - d.start) / span) * 100}%` as const;
  // The label ends at the boundary, so it never runs past the bar's end.
  const before = `${100 - ((d.freeEnd - d.start) / span) * 100}%` as const;
  return (
    <View>
      <View style={styles.markRow}>
        <View style={[styles.mark, { right: before }]}>
          <T v="bodyTiny" c={color.ink} numberOfLines={1}>
            {`Paid from ${clock(d.freeEnd)}`}
          </T>
        </View>
      </View>
      <View style={styles.lineWrap}>
        <View style={styles.line}>
          {u > 0 ? <View style={{ flex: u, backgroundColor: color.free }} /> : null}
          {d.now < d.freeEnd ? <View style={{ flex: d.freeEnd - d.now }} /> : null}
          {p > 0 ? <View style={{ flex: p, backgroundColor: color.detention }} /> : null}
        </View>
        <View style={[styles.edge, { left: edge }]} />
        <View style={[styles.dot, { left: now }]} />
      </View>
      <Labels left={clock(d.start)} right={`Now ${clock(d.now)}`} ink />
    </View>
  );
}

function Labels({ left, right, ink }: { left: string; right: string; ink?: boolean }) {
  return (
    <View style={styles.labels}>
      <T v="bodySmall" c={color.sub}>
        {left}
      </T>
      <T v="bodySmall" c={ink ? color.ink : color.sub}>
        {right}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, borderRadius: 4, backgroundColor: color.raise2, flexDirection: 'row', overflow: 'hidden' },
  gapped: { gap: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 8 },
  ticks: { height: 16, marginTop: 6, position: 'relative' },
  tick: { position: 'absolute', top: 0 },
  blocks: { flexDirection: 'row', gap: 3, height: 12 },
  block: { flex: 1, borderRadius: 3, backgroundColor: color.raise2, overflow: 'hidden' },
  thick: { flexDirection: 'row', height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: color.raise2 },
  seg: { justifyContent: 'center', paddingHorizontal: 12 },
  segEnd: { alignItems: 'flex-end' },
  markRow: { height: 20, position: 'relative' },
  mark: { position: 'absolute', top: 0, paddingRight: 6 },
  lineWrap: { height: 12, justifyContent: 'center' },
  line: { height: 4, borderRadius: 2, backgroundColor: color.raise2, flexDirection: 'row', overflow: 'hidden' },
  edge: { position: 'absolute', top: -2, width: 2, height: 16, marginLeft: -1, backgroundColor: color.ink },
  dot: { position: 'absolute', top: 0, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: color.ink, borderWidth: 2, borderColor: color.bg },
});
