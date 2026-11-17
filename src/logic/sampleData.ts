/**
 * Made-up data for the prototype (labelled "Sample data" / "Faked" in the UI).
 * Times are minutes after midnight.
 */
import type { Rules } from './detention';

/** Simulated minutes per real second while you're at the dock (60× speed). */
export const SIM_MINUTES_PER_SECOND = 1;
/** Today's appointment at Harbor Foods DC: 2:00 PM. */
export const APPT = 14 * 60;
/** Simulated clock before pulling in: 1:47 PM. */
export const START_NOW = 13 * 60 + 47;
/** Today's real date, e.g. "Sun, Nov 15". */
export const TODAY_LABEL = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const WEEK_LABEL = 'Week of Oct 26';

export const TODAY_STOP = {
  name: 'Harbor Foods DC',
  short: 'Harbor Foods',
  city: 'Allentown, PA',
  load: '48262',
  typicalWait: '3h 20m',
  typicalWaitMin: 200,
  visits: 41,
};

/** Minutes before each stop's appointment that Docket starts watching location. */
export const WATCH_LEAD_MIN = 180;

export interface LoadStop {
  name: string;
  kind: 'Pickup' | 'Drop';
  /** Appointment, minutes after midnight. */
  at: number;
}

/** What the faked "AI read" pulls off today's rate con (Figma B2). */
export const SAMPLE_LOAD = {
  number: '48262',
  stops: [
    { name: 'Keystone Cold Storage', kind: 'Pickup', at: 6 * 60 },
    { name: 'Harbor Foods DC', kind: 'Drop', at: 14 * 60 },
  ] as LoadStop[],
};

/** "Been here before?" shortcuts on Add a load (Figma B1). */
export const RECENT_STOPS = ['Harbor Foods DC', 'Lehigh Grocery DC'];

export interface Company {
  name: string;
  drivers: number;
  reported: number;
  rules: Rules;
  /** Average wait per stop, e.g. "1h 52m". */
  avg: string;
  /** % of stops past free time. */
  past: number;
  /** % of drivers who say detention was paid. */
  paid: number;
}

/**
 * Real carrier names (public facts). Everything else per company (driver
 * counts, rules, wait stats) is made up to simulate Docket being widely used,
 * and is tagged "Sample data" in the UI.
 * [name, drivers, free min, clock start, $/hr, breaks count, avg wait, % past free, % paid]
 */
const CARRIERS: [string, number, number, 'appt' | 'arrival', number, boolean, string, number, number][] = [
  ['Schneider National', 1840, 120, 'appt', 20, false, '2h 05m', 33, 64],
  ['Werner Enterprises', 1520, 120, 'arrival', 18, true, '2h 22m', 38, 58],
  ['J.B. Hunt Transport', 1710, 120, 'appt', 20, false, '1h 58m', 30, 69],
  ['Swift Transportation', 2260, 120, 'arrival', 15, true, '2h 40m', 44, 47],
  ['Knight Transportation', 1180, 120, 'arrival', 15, true, '2h 31m', 41, 51],
  ['Prime Inc.', 1390, 120, 'appt', 18, false, '2h 12m', 36, 60],
  ['Heartland Express', 610, 120, 'arrival', 15, true, '2h 26m', 39, 55],
  ['Covenant Logistics', 420, 120, 'appt', 18, false, '2h 18m', 37, 57],
  ['Marten Transport', 540, 120, 'appt', 20, false, '1h 55m', 29, 71],
  ['CRST', 760, 120, 'arrival', 15, true, '2h 44m', 45, 46],
  ['Crete Carrier', 480, 120, 'appt', 20, false, '1h 49m', 27, 73],
  ['Roehl Transport', 350, 120, 'appt', 18, false, '2h 03m', 32, 66],
  ['Hirschbach Motor Lines', 330, 120, 'arrival', 18, true, '2h 35m', 42, 52],
  ['Maverick Transportation', 290, 120, 'appt', 20, false, '1h 57m', 31, 68],
  ['Old Dominion Freight Line', 980, 60, 'arrival', 25, true, '1h 20m', 24, 74],
  ['Estes Express Lines', 870, 60, 'arrival', 25, true, '1h 26m', 26, 70],
  ['Saia', 640, 60, 'arrival', 22, true, '1h 31m', 28, 67],
  ['XPO', 910, 60, 'arrival', 22, true, '1h 34m', 29, 63],
  ['ABF Freight', 590, 60, 'arrival', 25, true, '1h 24m', 25, 72],
  ['R+L Carriers', 520, 60, 'arrival', 22, true, '1h 38m', 31, 61],
  ['FedEx Freight', 1260, 60, 'arrival', 25, true, '1h 22m', 23, 75],
  ['TForce Freight', 450, 60, 'arrival', 22, true, '1h 36m', 30, 62],
  ['Southeastern Freight Lines', 310, 60, 'arrival', 22, true, '1h 29m', 27, 68],
  ['Averitt Express', 380, 60, 'arrival', 22, true, '1h 33m', 28, 66],
  ['Pitt Ohio', 260, 60, 'arrival', 25, true, '1h 18m', 22, 76],
  ['Penske Logistics', 690, 90, 'appt', 22, false, '1h 46m', 30, 65],
  ['Ryder', 720, 90, 'appt', 22, false, '1h 51m', 32, 63],
  ['Sysco', 650, 90, 'appt', 20, false, '1h 42m', 29, 59],
  ['US Foods', 470, 90, 'appt', 20, false, '1h 47m', 31, 57],
  ['Giant Eagle', 140, 90, 'appt', 20, false, '1h 39m', 27, 61],
];


/**
 * More real fleets from Transport Topics' 2026 Top 100 For-Hire Carriers and
 * Top 100 Private Carriers lists (ttnews.com). Brands drivers say (Swift,
 * Knight, ABF, Schneider…) are in CARRIERS above; their holding companies are
 * left out here. Everything except the name is generated sample data.
 */
const RANKED: [string, 'hire' | 'private', number][] = [
  ['FedEx', 'hire', 2],
  ['Landstar System', 'hire', 12],
  ['Hub Group', 'hire', 15],
  ['NFI', 'hire', 17],
  ['Purolator', 'hire', 21],
  ['Kenan Advantage Group', 'hire', 22],
  ['Evans Network of Cos.', 'hire', 23],
  ['Central Transport', 'hire', 25],
  ['PS Logistics', 'hire', 26],
  ['Day & Ross', 'hire', 27],
  ['Universal Logistics Holdings', 'hire', 28],
  ['Ruan Transportation Management Systems', 'hire', 30],
  ['Anderson Trucking Service', 'hire', 31],
  ['STG Logistics', 'hire', 33],
  ['Lynden', 'hire', 34],
  ['C.R. England', 'hire', 35],
  ['Forward Air', 'hire', 37],
  ['Bennett Family of Cos.', 'hire', 38],
  ['Mullen Group', 'hire', 40],
  ['Bridgeway Connects', 'hire', 41],
  ['Canada Cartage', 'hire', 42],
  ['Dayton Freight Lines', 'hire', 43],
  ['KLLM Transport Services', 'hire', 45],
  ['UniGroup', 'hire', 46],
  ['Atlas World Group', 'hire', 47],
  ['Quantix SCS', 'hire', 49],
  ['IMC Logistics', 'hire', 50],
  ['A. Duie Pyle', 'hire', 51],
  ['Quality Carriers', 'hire', 52],
  ['Western Express', 'hire', 54],
  ['Bison Transport', 'hire', 55],
  ['Stevens Transport', 'hire', 56],
  ['Manitoulin Group of Cos.', 'hire', 57],
  ['RoadOne IntermodaLogistics', 'hire', 59],
  ['TMC Transportation', 'hire', 60],
  ['Mesilla Valley Transportation', 'hire', 61],
  ['Transervice Logistics/Lily Transportation', 'hire', 62],
  ['Mercer Transportation', 'hire', 63],
  ['Fastfrate Group', 'hire', 64],
  ['PAMT', 'hire', 65],
  ['Foodliner/Quest Liner', 'hire', 66],
  ['PGT Holdings', 'hire', 67],
  ['Beemac Trucking', 'hire', 68],
  ['Koch Cos.', 'hire', 71],
  ['Roadrunner Freight', 'hire', 72],
  ['Bay and Bay Transportation', 'hire', 73],
  ['Melton Truck Lines', 'hire', 74],
  ['Daylight Transport', 'hire', 75],
  ['Oak Harbor Freight Lines', 'hire', 76],
  ['TCI Transportation', 'hire', 77],
  ['Trans-System', 'hire', 78],
  ['Red Classic', 'hire', 79],
  ['United Vision Logistics', 'hire', 80],
  ['Artur Express', 'hire', 81],
  ['United Petroleum Transports', 'hire', 82],
  ['Ward Transport & Logistics', 'hire', 83],
  ['Leonard\'s Express', 'hire', 84],
  ['Dupré Logistics', 'hire', 85],
  ['Cassens Transport', 'hire', 86],
  ['Acme Truck Line', 'hire', 87],
  ['Groendyke Transport', 'hire', 88],
  ['Paper Transport', 'hire', 89],
  ['May Trucking', 'hire', 90],
  ['Gulf Winds International', 'hire', 91],
  ['CrossCountry Freight Solutions', 'hire', 92],
  ['National Carriers', 'hire', 93],
  ['Highlight Motor Group', 'hire', 94],
  ['Spee-Dee Delivery Service', 'hire', 95],
  ['Blackhawk Transport', 'hire', 96],
  ['Magnum Ltd.', 'hire', 97],
  ['Continental Express', 'hire', 98],
  ['Pride Transport', 'hire', 99],
  ['System Freight', 'hire', 100],
  ['Walmart', 'private', 1],
  ['PepsiCo', 'private', 2],
  ['Performance Food Group', 'private', 4],
  ['Reyes Holdings', 'private', 6],
  ['McLane', 'private', 7],
  ['Tyson Foods', 'private', 8],
  ['Halliburton', 'private', 9],
  ['Nutrien', 'private', 10],
  ['Clean Harbors Environmental Services', 'private', 11],
  ['Air Liquide USA', 'private', 12],
  ['Keurig Dr Pepper', 'private', 13],
  ['United Rentals', 'private', 14],
  ['United Natural Foods', 'private', 15],
  ['Dollar General', 'private', 16],
  ['Amazon.com', 'private', 17],
  ['Dairy Farmers of America', 'private', 18],
  ['Gordon Food Service', 'private', 19],
  ['Quikrete Cos.', 'private', 20],
  ['Dot Foods', 'private', 21],
  ['Sunbelt Rentals', 'private', 22],
  ['Herc Holdings', 'private', 23],
  ['Coca-Cola Bottling Co. United', 'private', 24],
  ['Ben E. Keith', 'private', 25],
  ['Patterson-UTI Energy', 'private', 26],
  ['CHS', 'private', 27],
  ['Builders FirstSource', 'private', 28],
  ['Love\'s Travel Stops & Country Stores', 'private', 29],
  ['Medline', 'private', 30],
  ['Linde (North America)', 'private', 31],
  ['Kroger', 'private', 32],
  ['Pilot Travel Centers', 'private', 33],
  ['Darling Ingredients', 'private', 34],
  ['CRH Americas', 'private', 35],
  ['J.R. Simplot', 'private', 36],
  ['Prairie Farms Dairy', 'private', 37],
  ['Coca-Cola Southwest Beverages', 'private', 38],
  ['C&S Wholesale Grocers', 'private', 39],
  ['ABC Supply', 'private', 40],
  ['RPC', 'private', 41],
  ['Ahold Delhaize USA', 'private', 42],
  ['Southern Glazer\'s Wine and Spirits', 'private', 43],
  ['Helena Agri-Enterprises', 'private', 44],
  ['Ashley Furniture Industries', 'private', 45],
  ['Swire Coca-Cola USA', 'private', 46],
  ['WillScot Holdings', 'private', 47],
  ['Albertsons Cos.', 'private', 48],
  ['ProFrac Holding', 'private', 49],
  ['Cemex USA', 'private', 50],
  ['Sherwin-Williams', 'private', 51],
  ['EquipmentShare.com', 'private', 52],
  ['Univar Solutions', 'private', 53],
  ['Costco Wholesale', 'private', 54],
  ['Brenntag North America', 'private', 55],
  ['Home Depot', 'private', 56],
  ['Walgreen', 'private', 57],
  ['Publix Super Markets', 'private', 58],
  ['ProPetro Services', 'private', 59],
  ['Shamrock Foods', 'private', 60],
  ['QXO', 'private', 61],
  ['Quanta Services', 'private', 62],
  ['Carvana', 'private', 63],
  ['Mohawk Industries', 'private', 64],
  ['Wayne-Sanderson Farms', 'private', 65],
  ['BlueLinx Holdings', 'private', 66],
  ['H-E-B Grocery', 'private', 67],
  ['Coca-Cola Beverages Florida', 'private', 68],
  ['Burrtec Waste Industries/Edco Disposal', 'private', 69],
  ['Messer Americas', 'private', 70],
  ['Plains All American Pipeline', 'private', 71],
  ['Knife River', 'private', 72],
  ['Marathon Petroleum', 'private', 73],
  ['Energy Transfer', 'private', 74],
  ['Shaw Industries Group', 'private', 75],
  ['KeHE Distributors', 'private', 76],
  ['Air Products', 'private', 77],
  ['Nippon Sanso Matheson', 'private', 78],
  ['Ecology Auto Parts', 'private', 79],
  ['Archer-Daniels-Midland', 'private', 80],
  ['Coca-Cola Beverages Northeast', 'private', 81],
  ['JBS USA Holdings', 'private', 82],
  ['Lowe\'s Companies', 'private', 83],
  ['Ace Hardware', 'private', 84],
  ['Advanced Drainage Systems', 'private', 85],
  ['RelaDyne', 'private', 86],
  ['Veritiv', 'private', 87],
  ['MasTec', 'private', 88],
  ['Mondelēz International', 'private', 89],
  ['Stericycle', 'private', 90],
  ['Select Water Solutions', 'private', 91],
  ['Pepsi Bottling Ventures', 'private', 92],
  ['Domino\'s Pizza', 'private', 93],
  ['Hobby Lobby Stores', 'private', 94],
  ['H.T. Hackney', 'private', 95],
  ['Calfrac Well Services', 'private', 96],
  ['Cal-Maine Foods', 'private', 97],
  ['SLB Ltd.', 'private', 98],
  ['Bunzl Distribution USA', 'private', 99],
  ['AutoZone', 'private', 100],
  ['UPS', 'hire', 1],
];

/** Stable 0–1 number from a name, so the made-up stats don't change between visits. */
function seed(name: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const RULE_PRESETS: Rules[] = [
  { free: 120, start: 'appt', rate: 20, breaksCount: false },
  { free: 120, start: 'arrival', rate: 18, breaksCount: true },
  { free: 90, start: 'appt', rate: 22, breaksCount: false },
  { free: 60, start: 'arrival', rate: 25, breaksCount: true },
];

function sampleCompany(name: string, group: 'hire' | 'private', rank: number): Company {
  const size = group === 'hire' ? 1400 : 700;
  const drivers = Math.max(24, Math.round(size * (1 - rank / 115) * (0.75 + seed(name, 1) * 0.5)));
  const rules = RULE_PRESETS[Math.floor(seed(name, 2) * RULE_PRESETS.length)];
  const waitMin = 70 + Math.round(seed(name, 3) * 100);
  const past = 20 + Math.round(seed(name, 4) * 28);
  return {
    name,
    drivers,
    reported: Math.round(drivers * 0.24),
    rules,
    avg: `${Math.floor(waitMin / 60)}h ${String(waitMin % 60).padStart(2, '0')}m`,
    past,
    paid: Math.min(80, 100 - past - Math.round(seed(name, 5) * 15)),
  };
}

const BASE_COMPANIES: Company[] = CARRIERS.map(([name, drivers, free, start, rate, breaksCount, avg, past, paid]) => ({
  name,
  drivers,
  reported: Math.round(drivers * 0.24),
  rules: { free, start, rate, breaksCount },
  avg,
  past,
  paid,
}));
const HAND_TUNED = new Set(BASE_COMPANIES.map((c) => c.name));
for (const [name, group, rank] of RANKED) {
  if (!HAND_TUNED.has(name)) BASE_COMPANIES.push(sampleCompany(name, group, rank));
}

/**
 * Audit #5: the Companies tab shows made-up numbers, so it uses made-up company names. Real carrier names
 * stay in the onboarding picker (that's where a driver names their own employer) but never sit next to
 * invented stats. One small fleet shows the "not enough reports yet" state.
 */
export const MIN_REPORTS = 20;
export const SAMPLE_BOARD: Company[] = [
  ['Ridgeline Freight', 412, 99, 120, 'appt', 20, '1h 44m', 21, 64],
  ['Copperleaf Carriers', 268, 64, 120, 'arrival', 18, '1h 15m', 21, 74],
  ['Bluewater Transport', 530, 127, 90, 'appt', 22, '2h 05m', 34, 51],
  ['Prairie Line Logistics', 190, 46, 60, 'arrival', 25, '1h 52m', 29, 58],
  ['Northgate Haulers', 344, 83, 120, 'appt', 20, '2h 31m', 41, 38],
  ['Small Fleet Co.', 31, 7, 120, 'arrival', 18, '1h 20m', 25, 60],
].map(([name, drivers, reported, free, start, rate, avg, past, paid]) => ({
  name: name as string,
  drivers: drivers as number,
  reported: reported as number,
  rules: { free: free as number, start: start as Rules['start'], rate: rate as number, breaksCount: false },
  avg: avg as string,
  past: past as number,
  paid: paid as number,
}));

/**
 * Researcher setup for a user test (Wizard of Oz). Open the prototype with
 *   ?company=Estes%20Express%20Lines&free=60&rate=25&start=arrival&breaks=1
 * and that company appears first with the participant's real rules.
 * It is remembered on this browser until ?setup=clear.
 */
export interface TestSetup {
  company: string;
  rules: Rules;
}

const SETUP_KEY = 'docket-test-setup';

export function parseSetup(search: string): TestSetup | 'clear' | null {
  const q = new URLSearchParams(search);
  if (q.get('setup') === 'clear') return 'clear';
  const company = q.get('company')?.trim();
  if (!company) return null;
  const num = (k: string, d: number) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const known = BASE_COMPANIES.find((c) => c.name.toLowerCase() === company.toLowerCase());
  const base = known?.rules ?? { free: 120, start: 'appt' as const, rate: 20, breaksCount: false };
  const start = q.get('start') === 'arrival' ? 'arrival' : q.get('start') === 'appt' ? 'appt' : base.start;
  const breaks = q.get('breaks');
  return {
    company: known?.name ?? company,
    rules: {
      free: Math.round(num('free', base.free / 60) * 60),
      start,
      rate: num('rate', base.rate),
      breaksCount: breaks == null ? base.breaksCount : breaks === '1' || breaks === 'true',
    },
  };
}

export function withSetup(list: Company[], setup: TestSetup | null): Company[] {
  if (!setup) return list;
  const known = list.find((c) => c.name === setup.company);
  const mine: Company = known
    ? { ...known, rules: setup.rules }
    : { name: setup.company, drivers: 96, reported: 23, rules: setup.rules, avg: '1h 54m', past: 31, paid: 62 };
  return [mine, ...list.filter((c) => c.name !== setup.company)];
}

function loadSetup(): TestSetup | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const parsed = parseSetup(window.location.search);
    if (parsed === 'clear') {
      window.localStorage?.removeItem(SETUP_KEY);
      return null;
    }
    if (parsed) {
      window.localStorage?.setItem(SETUP_KEY, JSON.stringify(parsed));
      return parsed;
    }
    const saved = window.localStorage?.getItem(SETUP_KEY);
    return saved ? (JSON.parse(saved) as TestSetup) : null;
  } catch {
    return null;
  }
}

export const TEST_SETUP: TestSetup | null = loadSetup();

/** Every company on "Docket", the test participant's first when set up. */
export const COMPANIES: Company[] = withSetup(BASE_COMPANIES, TEST_SETUP);

/** Shown before the driver types: their company (if set up), then the most used. */
// The six in the team's Figma (Onboarding v3, E1 Pick company), which have logos. FedEx
// Freight, not FedEx: its logo is the Freight one, and Freight runs its own company drivers.
const POPULAR = ['Swift Transportation', 'Schneider National', 'J.B. Hunt Transport', 'FedEx Freight', 'Werner Enterprises', 'Prime Inc.'];
export const SUGGESTED: Company[] = TEST_SETUP
  ? COMPANIES.slice(0, 6)
  : POPULAR.map((n) => COMPANIES.find((c) => c.name === n)).filter((c): c is Company => !!c);

export interface WeekLoad {
  /** Key for settlement marks. For the sample week it's also the load number. */
  id: string;
  /** Load number when it differs from `id` (logged stops). */
  number?: string;
  name: string;
  day: string;
  arrive: number;
  appt: number;
  leave: number;
  brk: number;
}

/** Last week's loads: the settlement being checked on the Paycheck tab. */
export const WEEK: WeekLoad[] = [
  { id: '48213', name: 'Harbor Foods DC', day: 'Mon Oct 26', arrive: 7 * 60 + 52, appt: 8 * 60, leave: 12 * 60 + 10, brk: 0 },
  { id: '48227', name: 'Keystone Cold Storage', day: 'Tue Oct 27', arrive: 6 * 60 + 2, appt: 6 * 60 + 30, leave: 9 * 60 + 32, brk: 0 },
  { id: '48240', name: 'Lehigh Grocery DC', day: 'Wed Oct 28', arrive: 13 * 60 + 15, appt: 13 * 60 + 15, leave: 19 * 60, brk: 0 },
  { id: '48251', name: 'Valley Paper Co.', day: 'Thu Oct 29', arrive: 10 * 60 + 5, appt: 10 * 60, leave: 11 * 60 + 40, brk: 0 },
];

/** The load number to show for a week's load, or "" if the driver didn't enter one. */
export const loadNo = (l: WeekLoad): string => l.number ?? (/^\d{1,8}$/.test(l.id) ? l.id : '');

export type Mark = { m: 'paid' | 'less' | 'none'; amt?: string };
export type Marks = Record<string, Mark>;

/** What "Scan" pretends to read off the settlement. */
export const SAMPLE_SETTLEMENT: Marks = {
  '48213': { m: 'paid' },
  '48227': { m: 'none' },
  '48240': { m: 'less', amt: '25.00' },
};
