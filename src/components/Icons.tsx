/**
 * Every icon is an SF Symbol. On iPhone, expo-symbols draws Apple's real symbol.
 * Apple licenses SF Symbols only for apps on Apple platforms, so the web
 * prototype and Android draw the matching SVG below instead (ported from the
 * v1 prototype). The status bar pieces at the bottom are not icons.
 */
import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import { useId, type ReactElement } from 'react';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';

/**
 * Every icon here is decorative: the button or row it sits in carries the
 * words. Hide it from VoiceOver/TalkBack (and from the web accessibility tree,
 * where an unlabeled <svg> is read as "image").
 */
const HIDDEN = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  'aria-hidden': true,
} as const;

function sf(name: SFSymbol, weight: SymbolWeight, c: string, size: number, fallback: ReactElement) {
  return <SymbolView {...HIDDEN} name={name} weight={weight} tintColor={c} size={size} fallback={fallback} />;
}

type P = { c?: string; size?: number };

const PersonIconSvg = ({ c = color.ink, size = 24 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.8} />
    <Circle cx={12} cy={10} r={3.4} fill={c} />
    <Path d="M5.8 18.2c1.4-2.1 3.6-3.2 6.2-3.2s4.8 1.1 6.2 3.2" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const ChevronLeftSvg = ({ c = color.ink, size = 22 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 5l-7 7 7 7" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightSvg = ({ c = color.sub, size = 18 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 5l7 7-7 7" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PinIconSvg = ({ c = color.bg, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill={c}>
    <Path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z" />
  </Svg>
);

const ClockIconSvg = ({ c = color.bg, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={2.6} />
    <Path d="M12 7v5l3 2" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
  </Svg>
);

const CheckIconSvg = ({ c = color.bg, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HourglassIconSvg = ({ c = color.bg, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill={c}>
    <Path d="M6 2h12v2h-1v3.2c0 1.5-.8 2.8-2 3.6L13.6 12l1.4 1.2c1.2.8 2 2.1 2 3.6V20h1v2H6v-2h1v-3.2c0-1.5.8-2.8 2-3.6L10.4 12 9 10.8c-1.2-.8-2-2.1-2-3.6V4H6V2z" />
  </Svg>
);

const DollarIconSvg = ({ c = color.ink, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v18M16.5 7.5c-.8-1.4-2.5-2.2-4.5-2.2-2.6 0-4.4 1.3-4.4 3.2 0 4.5 9.2 2.3 9.2 7 0 2-2 3.4-4.8 3.4-2.2 0-4-.9-4.8-2.4"
      stroke={c}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
  </Svg>
);

const TruckIconSvg = ({ c = color.ink, size = 15 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill={c}>
    <Path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h10A1.5 1.5 0 0 1 15 6.5V8h3.2c.5 0 .9.2 1.2.6l2.3 3c.2.3.3.6.3.9V16a1 1 0 0 1-1 1h-1.1a2.9 2.9 0 0 1-5.8 0H9.9a2.9 2.9 0 0 1-5.8 0H3a1 1 0 0 1-1-1V6.5zM7 18.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zm10 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zM15 9.6V12h4.9l-1.8-2.4H15z" />
  </Svg>
);

const CameraIconSvg = ({ c = color.sub, size = 22 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9z" stroke={c} strokeWidth={2} />
    <Circle cx={12} cy={12.5} r={3.5} stroke={c} strokeWidth={2} />
  </Svg>
);

const DocIconSvg = ({ c = color.ink, size = 22 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke={c} strokeWidth={2} />
    <Path d="M14 3v5h5M8.5 13h7M8.5 17h5" stroke={c} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const MinusIconSvg = ({ c = color.ink, size = 18 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
  </Svg>
);

const PlusIconSvg = ({ c = color.ink, size = 18 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
  </Svg>
);

const SearchIconSvg = ({ c = color.sub, size = 20 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={6.5} stroke={c} strokeWidth={2} />
    <Path d="M16 16l4 4" stroke={c} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ShieldIconSvg = ({ c = color.ink, size = 20 }: P) => (
  <Svg {...HIDDEN} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z" stroke={c} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/**
 * Tab icons: `c` overrides the fill. Their details (clock hands, page lines,
 * windows) are cut out of the shape, so whatever the icon sits on shows through.
 * `cut` is accepted for older callers and ignored.
 */
type TabP = { on: boolean; c?: string; cut?: string };

/** A per-instance mask id; useId's colons would break url(#…). */
const useMaskId = () => `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

const TabTodayIconSvg = ({ on, c }: TabP) => {
  const id = useMaskId();
  return (
    <Svg {...HIDDEN} width={24} height={24} viewBox="0 0 24 24">
      <Defs>
        <Mask id={id} x={0} y={0} width={24} height={24} maskUnits="userSpaceOnUse">
          <Rect width={24} height={24} fill="#fff" />
          <Path d="M12 6.5V12l-3.5 2.2" stroke="#000" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </Mask>
      </Defs>
      <Circle cx={12} cy={12} r={10} fill={c ?? (on ? color.ink : color.faint)} mask={`url(#${id})`} />
    </Svg>
  );
};

const TabPaycheckIconSvg = ({ on, c }: TabP) => {
  const id = useMaskId();
  return (
    <Svg {...HIDDEN} width={24} height={24} viewBox="0 0 24 24">
      <Defs>
        <Mask id={id} x={0} y={0} width={24} height={24} maskUnits="userSpaceOnUse">
          <Rect width={24} height={24} fill="#fff" />
          {/* The folded corner lets 45% through, as the old fold was drawn at 45%. */}
          <Path d="M13 2v6h6" fill="#000" opacity={0.45} />
          <Path d="M8.5 13h7M8.5 17h7" stroke="#000" strokeWidth={1.8} strokeLinecap="round" />
        </Mask>
      </Defs>
      <Path
        d="M6 2h7.5L19 7.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill={c ?? (on ? color.ink : color.faint)}
        mask={`url(#${id})`}
      />
    </Svg>
  );
};

const TabCompaniesIconSvg = ({ on, c }: TabP) => {
  const id = useMaskId();
  return (
    <Svg {...HIDDEN} width={24} height={24} viewBox="0 0 24 24">
      <Defs>
        <Mask id={id} x={0} y={0} width={24} height={24} maskUnits="userSpaceOnUse">
          <Rect width={24} height={24} fill="#fff" />
          <G fill="#000">
            {[[5.5, 5.5], [9.5, 5.5], [5.5, 9.5], [9.5, 9.5], [5.5, 13.5], [9.5, 13.5], [16, 12.5], [16, 16.5]].map(([x, y]) => (
              <Rect key={`${x}-${y}`} x={x} y={y} width={2} height={2} rx={0.4} />
            ))}
          </G>
        </Mask>
      </Defs>
      <Path
        d="M3 4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17H3V4zm11 6h6a1 1 0 0 1 1 1v10h-7V10z"
        fill={c ?? (on ? color.ink : color.faint)}
        mask={`url(#${id})`}
      />
    </Svg>
  );
};

/** iOS status bar indicators (desktop frame only). */
export const SignalBars = () => (
  <Svg {...HIDDEN} width={18} height={12} viewBox="0 0 18 12">
    <Rect x={0} y={8} width={3} height={4} rx={1} fill={color.ink} />
    <Rect x={5} y={5.5} width={3} height={6.5} rx={1} fill={color.ink} />
    <Rect x={10} y={3} width={3} height={9} rx={1} fill={color.ink} />
    <Rect x={15} y={0} width={3} height={12} rx={1} fill={color.ink} />
  </Svg>
);

export const Battery = () => (
  <Svg {...HIDDEN} width={26} height={12} viewBox="0 0 26 12">
    <Rect x={0.5} y={0.5} width={22} height={11} rx={3.5} fill="none" stroke={color.ink} opacity={0.4} />
    <Rect x={2} y={2} width={17} height={8} rx={2} fill={color.ink} />
    <Rect x={24} y={4} width={1.6} height={4} rx={0.8} fill={color.ink} opacity={0.4} />
  </Svg>
);

export const PersonIcon = ({ c = color.ink, size = 24 }: P) =>
  sf('person.crop.circle', 'regular', c, size, <PersonIconSvg c={c} size={size} />);

export const ChevronLeft = ({ c = color.ink, size = 22 }: P) =>
  sf('chevron.left', 'semibold', c, size, <ChevronLeftSvg c={c} size={size} />);

export const ChevronRight = ({ c = color.sub, size = 18 }: P) =>
  sf('chevron.right', 'semibold', c, size, <ChevronRightSvg c={c} size={size} />);

export const PinIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('mappin', 'semibold', c, size, <PinIconSvg c={c} size={size} />);

export const ClockIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('clock', 'bold', c, size, <ClockIconSvg c={c} size={size} />);

export const CheckIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('checkmark', 'bold', c, size, <CheckIconSvg c={c} size={size} />);

export const HourglassIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('hourglass', 'bold', c, size, <HourglassIconSvg c={c} size={size} />);

export const DollarIcon = ({ c = color.ink, size = 15 }: P) =>
  sf('dollarsign', 'bold', c, size, <DollarIconSvg c={c} size={size} />);

export const TruckIcon = ({ c = color.ink, size = 15 }: P) =>
  sf('truck.box.fill', 'regular', c, size, <TruckIconSvg c={c} size={size} />);

export const CameraIcon = ({ c = color.sub, size = 22 }: P) =>
  sf('camera', 'medium', c, size, <CameraIconSvg c={c} size={size} />);

export const DocIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('doc.text', 'medium', c, size, <DocIconSvg c={c} size={size} />);

export const MinusIcon = ({ c = color.ink, size = 18 }: P) =>
  sf('minus', 'bold', c, size, <MinusIconSvg c={c} size={size} />);

export const PlusIcon = ({ c = color.ink, size = 18 }: P) =>
  sf('plus', 'bold', c, size, <PlusIconSvg c={c} size={size} />);

export const SearchIcon = ({ c = color.sub, size = 20 }: P) =>
  sf('magnifyingglass', 'medium', c, size, <SearchIconSvg c={c} size={size} />);

export const ShieldIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('checkmark.shield', 'medium', c, size, <ShieldIconSvg c={c} size={size} />);

export const TabTodayIcon = ({ on, c, cut }: TabP) =>
  sf('clock.fill', 'regular', c ?? (on ? color.ink : color.faint), 24, <TabTodayIconSvg on={on} c={c} cut={cut} />);

export const TabPaycheckIcon = ({ on, c, cut }: TabP) =>
  sf('doc.text.fill', 'regular', c ?? (on ? color.ink : color.faint), 24, <TabPaycheckIconSvg on={on} c={c} cut={cut} />);

export const TabCompaniesIcon = ({ on, c, cut }: TabP) =>
  sf('building.2.fill', 'regular', c ?? (on ? color.ink : color.faint), 24, <TabCompaniesIconSvg on={on} c={c} cut={cut} />);
