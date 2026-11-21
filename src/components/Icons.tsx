/**
 * Every icon is an SF Symbol. On iPhone, expo-symbols draws Apple's real symbol;
 * off iPhone (this web prototype of the iOS app) the same symbol is drawn from its
 * outline in sfGlyphs.ts, at the same weight. The status bar pieces are not icons.
 */
import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import Svg, { Path, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';
import { SF_GLYPHS } from './sfGlyphs';

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

function sf(name: SFSymbol, weight: SymbolWeight, c: string, size: number) {
  return <SymbolView {...HIDDEN} name={name} weight={weight} tintColor={c} size={size} fallback={<Glyph name={name} weight={weight} c={c} size={size} />} />;
}

/** The same symbol off iPhone: Apple's outline, fitted in a size × size box as SymbolView fits it. */
function Glyph({ name, weight, c, size }: { name: string; weight: string; c: string; size: number }) {
  const g = SF_GLYPHS[`${name}@${weight}`];
  if (!g) return null;
  const [w, h, d] = g;
  const s = Math.max(w, h);
  return (
    <Svg {...HIDDEN} width={size} height={size} viewBox={`${(w - s) / 2} ${(h - s) / 2} ${s} ${s}`}>
      <Path d={d} fill={c} />
    </Svg>
  );
}

type P = { c?: string; size?: number };

/** Tab icons: `c` overrides the colour. `cut` is accepted for older callers and ignored. */
type TabP = { on: boolean; c?: string; cut?: string };

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
  sf('person.crop.circle', 'regular', c, size);

export const ChevronLeft = ({ c = color.ink, size = 22 }: P) =>
  sf('chevron.left', 'semibold', c, size);

export const ChevronRight = ({ c = color.sub, size = 18 }: P) =>
  sf('chevron.right', 'semibold', c, size);

export const PinIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('mappin', 'semibold', c, size);

export const ClockIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('clock', 'bold', c, size);

export const CheckIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('checkmark', 'bold', c, size);

export const HourglassIcon = ({ c = color.bg, size = 15 }: P) =>
  sf('hourglass', 'bold', c, size);

export const DollarIcon = ({ c = color.ink, size = 15 }: P) =>
  sf('dollarsign', 'bold', c, size);

export const TruckOutlineIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('truck.box', 'regular', c, size);

export const TruckIcon = ({ c = color.ink, size = 15 }: P) =>
  sf('truck.box.fill', 'regular', c, size);

export const CameraIcon = ({ c = color.sub, size = 22 }: P) =>
  sf('camera', 'medium', c, size);

export const CloseIcon = ({ c = color.ink, size = 18 }: P) =>
  sf('xmark', 'medium', c, size);

export const DocIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('doc.text', 'medium', c, size);

export const MinusIcon = ({ c = color.ink, size = 18 }: P) =>
  sf('minus', 'bold', c, size);

export const PlusIcon = ({ c = color.ink, size = 18 }: P) =>
  sf('plus', 'bold', c, size);

export const SearchIcon = ({ c = color.sub, size = 20 }: P) =>
  sf('magnifyingglass', 'medium', c, size);

export const ShieldIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('checkmark.shield', 'medium', c, size);

export const RepeatIcon = ({ c = color.ink, size = 24 }: P) =>
  sf('arrow.triangle.2.circlepath', 'medium', c, size);

export const ShuffleIcon = ({ c = color.ink, size = 24 }: P) =>
  sf('shuffle', 'medium', c, size);

export const CalendarPlusIcon = ({ c = color.ink, size = 24 }: P) =>
  sf('calendar.badge.plus', 'medium', c, size);

export const LocationIcon = ({ c = color.ink, size = 20, filled }: P & { filled?: boolean }) =>
  sf(filled ? 'location.fill' : 'location', 'medium', c, size);

export const IslandIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('capsule', 'medium', c, size);

export const EyeSlashIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('eye.slash', 'medium', c, size);

export const HandTapIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('hand.tap', 'medium', c, size);

export const ShareIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('square.and.arrow.up', 'medium', c, size);

export const MailIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('envelope', 'medium', c, size);

export const KeyboardIcon = ({ c = color.ink, size = 22 }: P) =>
  sf('keyboard', 'medium', c, size);

export const ChecklistIcon = ({ c = color.ink, size = 20 }: P) =>
  sf('checklist', 'medium', c, size);

export const TabTodayIcon =({ on, c, cut }: TabP) =>
  sf(on ? 'clock.fill' : 'clock', 'regular', c ?? color.ink, 24);

export const TabPaycheckIcon = ({ on, c, cut }: TabP) =>
  sf(on ? 'doc.text.fill' : 'doc.text', 'regular', c ?? color.ink, 24);

export const TabCompaniesIcon = ({ on, c, cut }: TabP) =>
  sf(on ? 'building.2.fill' : 'building.2', 'regular', c ?? color.ink, 24);
