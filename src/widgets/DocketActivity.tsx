/**
 * Docket's Live Activity: the Dynamic Island and lock screen card for a stop
 * (Figma "Live Activity · Dynamic Island", node 144:223).
 *
 * The layout function below is compiled to SwiftUI by expo-widgets, so it can
 * only use @expo/ui/swift-ui views and modifiers: no hooks, no imports of our
 * own, and no values from module scope. Colors are written out inline for
 * that reason (lime = color.signal #D4F54C).
 *
 * `until` is a real epoch time in ms. iOS draws it as a live timer that counts
 * down to it during free time and up from it once detention starts, so the
 * island keeps ticking with the app closed. It is 0 when the timer should not
 * show (the demo clock, which runs a minute per second, and the end stages).
 */
import { Capsule, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

export interface DocketActivityProps {
  /** Short text for the compact island when there is no timer, e.g. "$10.50". */
  compact: string;
  compactLime: boolean;
  title: string;
  sub: string;
  value: string;
  valueLime: boolean;
  line: string;
  /** 1–4 progress segments filled. */
  filled: number;
  lockTitle: string;
  lockLine: string;
  /** Epoch ms for the live timer, or 0 for none. */
  until: number;
}

function DocketActivity(p: DocketActivityProps) {
  'widget';
  const lime = '#D4F54C';
  const dim = '#9B9B9F';
  const timed = p.until > 0;
  const accent = p.compactLime ? lime : '#FFFFFF';
  const seg = (n: number) => (
    <Capsule modifiers={[frame({ height: 4 }), foregroundStyle(p.filled >= n ? lime : '#3A3A3C')]} />
  );
  const timer = (size: number, color: string) => (
    <Text
      date={new Date(p.until)}
      dateStyle="timer"
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(color)]}
    />
  );
  const mark = <Capsule modifiers={[frame({ width: 6, height: 18 }), foregroundStyle(lime)]} />;

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint('#1C1C1C')]}>
        <HStack alignment="center" spacing={10}>
          {mark}
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{p.lockTitle}</Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(dim), lineLimit(1)]}>{p.lockLine}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text
              modifiers={[
                font({ size: 24, weight: 'semibold' }),
                monospacedDigit(),
                foregroundStyle(p.valueLime ? lime : '#FFFFFF'),
              ]}
            >
              {p.value}
            </Text>
            {timed ? timer(13, dim) : null}
          </VStack>
        </HStack>
        <HStack spacing={4}>
          {seg(1)}
          {seg(2)}
          {seg(3)}
          {seg(4)}
        </HStack>
      </VStack>
    ),
    compactLeading: mark,
    compactTrailing: timed ? (
      timer(14, accent)
    ) : (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), foregroundStyle(accent)]}>
        {p.compact}
      </Text>
    ),
    minimal: mark,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 6, top: 4 })]}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{p.title}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(dim), lineLimit(1)]}>{p.sub}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 6, top: 4 })]}>
        <Text
          modifiers={[
            font({ size: 24, weight: 'semibold' }),
            monospacedDigit(),
            foregroundStyle(p.valueLime ? lime : '#FFFFFF'),
          ]}
        >
          {p.value}
        </Text>
        {timed ? timer(12, dim) : null}
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ horizontal: 6, bottom: 4 })]}>
        <HStack spacing={4}>
          {seg(1)}
          {seg(2)}
          {seg(3)}
          {seg(4)}
        </HStack>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(dim), lineLimit(1)]}>{p.line}</Text>
      </VStack>
    ),
  };
}

export default createLiveActivity<DocketActivityProps>('DocketStop', DocketActivity);
