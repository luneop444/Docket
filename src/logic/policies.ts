/**
 * What each carrier has published about paying company drivers for waiting, with where it's from.
 * Researched 24 Nov 2026 from the carriers' own job ads and careers pages and from trade press
 * (Trucking Info, Transport Topics, CCJ). Forum posts and driver reviews were left out, even when
 * they gave a number, because they're one driver's word. Where a carrier publishes nothing on
 * waiting, it says so instead of guessing.
 */

export type Segment = 'Truckload' | 'LTL' | 'Dedicated';

/**
 * hourly: paid by the hour for time on duty, so waiting is paid at that rate.
 * detention: a published detention rate (and free time, if given).
 * listed: detention pay is listed, with no rate or free time.
 * split: miles for driving plus an hourly rate for some other time, waiting not named.
 * none: nothing published on waiting.
 */
export type PolicyKind = 'hourly' | 'detention' | 'listed' | 'split' | 'none';

export interface Source {
  label: string;
  url: string;
  /** When it's from, as far as the page says. */
  when: string;
  /** Year it's from, when known, so old policies can say so. */
  year?: number;
}

export interface Policy {
  company: string;
  segment: Segment;
  kind: PolicyKind;
  /** The comparable fact, a few words: what you'd scan for. */
  headline: string;
  /** The policy in one or two plain lines. */
  line: string;
  /** Who it applies to. */
  scope?: string;
  /** Minutes before waiting is paid, when published. 0 for hourly pay. */
  freeMin?: number;
  /** Highest published $/hr for waiting, for sorting. */
  rate?: number;
  /** Paid whether or not the customer pays the carrier. */
  guaranteed?: boolean;
  /** The source names waiting or non-driving time itself, not just an hourly job. */
  namesWaiting?: boolean;
  sources: Source[];
}

export const POLICIES: Policy[] = [
  // Truckload
  {
    company: 'Schneider National', headline: 'Hourly when not driving',
    segment: 'Truckload',
    kind: 'hourly',
    line: 'Mileage pay plus hourly pay for time on duty that isn’t driving.',
    scope: 'Van truckload company drivers',
    freeMin: 0,
    namesWaiting: true,
    sources: [{ label: 'Schneider job ad', url: 'https://schneiderjobs.com/search-driving-jobs/details/250223', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Werner Enterprises', headline: 'Not published',
    segment: 'Truckload',
    kind: 'none',
    line: 'Nothing published on detention pay for company drivers.',
    sources: [],
  },
  {
    company: 'J.B. Hunt Transport', headline: '$7.25–$30/hr, by customer',
    segment: 'Truckload',
    kind: 'detention',
    line: 'One dedicated ad pays $15 an hour, starting 2 hours after an on-time arrival.',
    scope: 'Company drivers, by customer',
    freeMin: 120,
    rate: 30,
    sources: [
      { label: 'J.B. Hunt dedicated job ad', url: 'https://www.thetruckersreport.com/jobs/job/semi-local-truck-driver.546060/apply', when: 'Seen Nov 2026', year: 2026 },
      { label: 'J.B. Hunt local job ad', url: 'https://www.monster.com/job-openings/dry-van-truck-driver-in-jersey-city-nj-jersey-city-nj--7112acea-1794-432e-a794-add06837b997', when: 'Seen Nov 2026', year: 2026 },
      { label: 'J.B. Hunt team job ad', url: 'https://drivers.jbhunt.com/team-driver/job-20572-70e16853-32a2-ec11-983f-0022483526ef', when: 'Seen Nov 2026', year: 2026 },
    ],
  },
  { company: 'Swift Transportation', headline: 'Not published', segment: 'Truckload', kind: 'none', line: 'Nothing published on detention pay for company drivers.', sources: [] },
  {
    company: 'Knight Transportation', headline: 'Listed, no rate',
    segment: 'Truckload',
    kind: 'listed',
    line: 'Lists detention pay. Free time not published either.',
    sources: [{ label: 'Knight job ad', url: 'https://jobs.jobg8.com/job/truck-driver-jobs-phoenix-az-western-region-in-phoenix-arizona-4658-27521178545E', when: 'Seen Nov 2026' }],
  },
  { company: 'Prime Inc.', headline: 'Not published', segment: 'Truckload', kind: 'none', line: 'Nothing published on detention pay for company drivers.', sources: [] },
  {
    company: 'Heartland Express', headline: '$20/hr',
    segment: 'Truckload',
    kind: 'detention',
    line: 'Free time not published.',
    scope: 'OTR company drivers',
    rate: 20,
    sources: [{ label: 'Heartland job ad', url: 'https://www.careerbuilder.com/job-details/cdl-a-truck-driver-eastern-us-waco-tx--b70e87a6-cff3-4862-8177-126c3f9c7f99', when: 'Seen Nov 2026', year: 2026 }],
  },
  { company: 'Covenant Logistics', headline: 'Not published', segment: 'Truckload', kind: 'none', line: 'Nothing published on detention pay for company drivers.', sources: [] },
  {
    company: 'Marten Transport', headline: '$20/hr after 1h, guaranteed',
    segment: 'Truckload',
    kind: 'detention',
    line: 'Automatic after 1 hour: $10 an hour for the second hour, then $20. Paid whether or not the customer pays.',
    scope: 'All drivers, on time and following the detention steps',
    freeMin: 60,
    rate: 20,
    guaranteed: true,
    sources: [
      { label: 'Transport Topics', url: 'https://ttnews.com/articles/marten-enhances-automatic-detention-pay-program', when: '2014', year: 2014 },
      { label: 'Trucking Info', url: 'https://www.truckinginfo.com/news/marten-improves-driver-detention-pay', when: '2011', year: 2011 },
    ],
  },
  { company: 'CRST', headline: 'Not published', segment: 'Truckload', kind: 'none', line: 'Nothing published on detention pay for company drivers.', sources: [] },
  {
    company: 'Crete Carrier', headline: 'Guaranteed, no rate',
    segment: 'Truckload',
    kind: 'listed',
    line: 'Paid whether or not the customer pays. Free time not published either.',
    scope: 'Crete and Shaffer OTR drivers',
    guaranteed: true,
    sources: [{ label: 'Crete Carrier pay page', url: 'https://cretecarrier.com/project/leading-pay', when: 'Seen Nov 2026', year: 2026 }],
  },
  { company: 'Roehl Transport', headline: 'Not published', segment: 'Truckload', kind: 'none', line: 'Nothing published on detention pay for company drivers.', sources: [] },
  {
    company: 'Hirschbach Motor Lines', headline: 'Listed, no rate',
    segment: 'Truckload',
    kind: 'listed',
    line: 'Lists detention pay. Free time not published either.',
    sources: [{ label: 'Hirschbach job ad', url: 'https://www.simplyhired.com/job/UsPBec1SIZXKcPB5PXFslphNl3jwgzzKOUeRSpWjuxuD41PR93PyaA', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Maverick Transportation', headline: '$15/hr',
    segment: 'Truckload',
    kind: 'detention',
    line: 'Free time not published.',
    rate: 15,
    sources: [{ label: 'Maverick company profile', url: 'https://www.thetruckersreport.com/co/maverick-transportation.1065/about', when: 'Seen Nov 2026' }],
  },

  // LTL
  {
    company: 'Old Dominion Freight Line', headline: 'Not published',
    segment: 'LTL',
    kind: 'none',
    line: 'Publishes average pay only ($107,000 a year for line haul). Nothing on waiting.',
    sources: [{ label: 'Old Dominion careers', url: 'https://www.odfl.com/us/en/careers/women-driving-change.html', when: 'Seen Nov 2026', year: 2026 }],
  },
  { company: 'Estes Express Lines', headline: 'Not published', segment: 'LTL', kind: 'none', line: 'Nothing published on waiting.', sources: [] },
  {
    company: 'Saia', headline: 'Not published',
    segment: 'LTL',
    kind: 'none',
    line: 'Line haul pays $0.75 to $0.84 a mile. Nothing published on waiting.',
    sources: [{ label: 'Saia job ad', url: 'https://jobs.saia.com/en/job/-/-/43688/69637191328', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'XPO', headline: 'Road delays only',
    segment: 'LTL',
    kind: 'split',
    line: 'Line haul teams: $0.974 a mile split, plus $35.42 an hour for road delays over an hour (traffic, construction, weather). Dock waits not named.',
    scope: 'Line haul team drivers',
    sources: [{ label: 'XPO job ad', url: 'https://www.careerbuilder.com/job-details/cdl-a-truck-driver-pre-existing-teams-tucson-az--4aab9df9-c50a-49b0-b160-6caf654aacfc', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'ABF Freight', headline: 'Hourly',
    segment: 'LTL',
    kind: 'hourly',
    line: 'Road driver ads list the job as hourly, at Teamster union scale.',
    scope: 'Road drivers',
    freeMin: 0,
    sources: [{ label: 'ABF job ad', url: 'https://careers.arcb.com/careersmarketplace/JobDetail/Akron-Ohio-United-States-Road-Driver-Full-time/25628', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'R+L Carriers', headline: 'Not published',
    segment: 'LTL',
    kind: 'none',
    line: 'Line haul pays $0.78 a mile. Nothing published on waiting.',
    sources: [{ label: 'R+L job ad', url: 'https://jobs.transforce.com/viewjob/R%2BL-Carriers/CDL-A-Truck-Driver-Linehaul/Salem-VA/PJ/eyJpZCI6Ijg4MjU5NDgwLWFlZWEtNGFiNC05NTlmLTIwYTgwYjk4N2E4MSIsInNvdXJjZSI6InBhcnRuZXJlZC1qb2IifQ==', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'FedEx Freight', headline: 'Waiting not named',
    segment: 'LTL',
    kind: 'split',
    line: 'Road drivers: $0.7342 a mile for line haul, $31.93 an hour for other duties. Waiting not named.',
    scope: 'Road drivers',
    sources: [{ label: 'FedEx Freight job ad', url: 'https://www.snagajob.com/jobs/1269256684', when: 'Jun 2026', year: 2026 }],
  },
  {
    company: 'TForce Freight', headline: 'Waiting not named',
    segment: 'LTL',
    kind: 'split',
    line: 'Road drivers: $27.16 to $34.65 an hour, plus $0.7071 to $0.8057 a mile. Waiting not named.',
    scope: 'Road drivers',
    sources: [{ label: 'TForce job ad', url: 'https://www.careerbuilder.com/job-details/road-driver-tforce-freight-free-employee-healthcare-27-16-34-65-minneapolis-mn--07bb9f5b-f8ed-45a1-8553-c0da4710509a', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Southeastern Freight Lines', headline: 'Not published',
    segment: 'LTL',
    kind: 'none',
    line: 'Line haul pays $0.892 a mile. Nothing published on waiting.',
    sources: [{ label: 'Southeastern job ad', url: 'https://www.monster.com/job-openings/linehaul-driver-birmingham-al--9f670677-9d28-47f0-88e1-b4319bd6bb13', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Averitt Express', headline: 'Listed, no rate',
    segment: 'LTL',
    kind: 'listed',
    line: 'Lists detention pay on dedicated runs. Free time not published either.',
    scope: 'Dedicated drivers',
    sources: [{ label: 'Averitt job ad', url: 'https://www.thetruckersreport.com/jobs/job/cdl-a-dedicated-truck-driver.197216/apply', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Pitt Ohio', headline: 'Not published',
    segment: 'LTL',
    kind: 'none',
    line: 'Line haul pays $0.7564 a mile. Nothing published on waiting.',
    sources: [{ label: 'Pitt Ohio job ad', url: 'https://careers-pittohio.icims.com/jobs/3665/class-a-linehaul-driver/job', when: '2026', year: 2026 }],
  },

  // Dedicated and private fleets
  {
    company: 'Penske Logistics', headline: '$33/hr, every hour',
    segment: 'Dedicated',
    kind: 'hourly',
    line: 'From a Denver ad. Overtime after 40 hours.',
    scope: 'Local CDL A drivers',
    freeMin: 0,
    rate: 33,
    sources: [{ label: 'Penske job ad', url: 'https://www.careerbuilder.com/job-details/truck-driver-cdl-class-a-penske-logistics-denver-co--00e7ea8f-1cc4-4460-bbaf-4d962e56c4d5', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Ryder', headline: 'Depends on the customer',
    segment: 'Dedicated',
    kind: 'split',
    line: 'Many dedicated ads pay by the hour ($26 in East Moline, IL). Others pay by the mile and stop.',
    scope: 'Dedicated drivers, by customer',
    sources: [
      { label: 'Ryder hourly job ad', url: 'https://illinoisjoblink.illinois.gov/jobs/11970246', when: '2024', year: 2024 },
      { label: 'Ryder mileage job ad', url: 'https://www.careerbuilder.com/job-details/truck-driver-cdl-a-no-weekends-wooster-oh--c4c212d3-9718-408e-8daf-dc97454de2d6', when: 'Seen Nov 2026', year: 2026 },
    ],
  },
  {
    company: 'Sysco', headline: '$33.79/hr, every hour',
    segment: 'Dedicated',
    kind: 'hourly',
    line: 'Base pay in Harrisburg, PA, plus incentives.',
    scope: 'CDL A delivery drivers',
    freeMin: 0,
    rate: 33.79,
    sources: [{ label: 'Sysco careers', url: 'https://careers.sysco.com/en/job/harrisburg/cdl-a-delivery-truck-driver-33-79-hr-up-to-110k/1105/97838202640', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'US Foods', headline: 'Hourly for downtime',
    segment: 'Dedicated',
    kind: 'hourly',
    line: 'Paid by miles, cases and stops, with hourly pay for downtime.',
    scope: 'CDL A delivery drivers, after training',
    freeMin: 0,
    namesWaiting: true,
    sources: [{ label: 'US Foods job ad', url: 'https://www.careerbuilder.com/job-details/delivery-driver-tracy-ca--77b2b725-7539-4c9a-b6c6-c402bab777fc', when: 'Seen Nov 2026', year: 2026 }],
  },
  {
    company: 'Giant Eagle', headline: '$20.40/hr, every hour',
    segment: 'Dedicated',
    kind: 'hourly',
    line: 'Starting rate in Noblestown, PA.',
    scope: 'Local CDL A drivers, Talon Logistics',
    freeMin: 0,
    rate: 20.4,
    sources: [{ label: 'Giant Eagle job ad', url: 'https://jobs.livecareer.com/l/local-class-a-cdl-driver-home-every-night-giant-eagle-50c439d88c25fd05d87ee4568a424975', when: 'Seen Nov 2026', year: 2026 }],
  },
];

/** The one line of national context: a survey of fleets, not any one company's number. */
export const NATIONAL = {
  line: '74% of for-hire truckload fleets paid drivers for detention time.',
  source: {
    label: 'ATA Driver Compensation Study, via CCJ',
    url: 'https://www.ccjdigital.com/economic-trends/article/15837055/truck-driver-pay-continues-to-rise',
    when: '2026',
    year: 2026,
  } as Source,
};

/** Waiting gets paid within 2 hours: hourly pay, or published free time of 2 hours or less. */
export const paysBy2h = (p: Policy) => p.kind === 'hourly' || (p.kind === 'detention' && p.freeMin !== undefined && p.freeMin <= 120);

/**
 * How driver-friendly the published policy is, highest first:
 * every on-duty hour paid (pay that names waiting itself first), then guaranteed detention, then a published rate (shorter free time first),
 * then detention listed without terms, then pay that names other time but not waiting, then nothing.
 */
export function score(p: Policy): number {
  let s = { hourly: 100, detention: 30, listed: 20, split: 10, none: 0 }[p.kind];
  if (p.namesWaiting) s += 5;
  if (p.guaranteed && p.kind !== 'hourly') s = 80 + (p.kind === 'detention' ? 5 : 0);
  if (p.kind === 'detention' && p.freeMin !== undefined) s += (180 - p.freeMin) / 30;
  // A policy from more than 5 years ago may have changed, so it ranks under current ones of its kind.
  const newest = Math.max(0, ...p.sources.map((x) => x.year ?? 0));
  if (newest && newest < 2021) s -= 5;
  return s;
}

/** Recommended: every on-duty hour paid, or detention paid whether or not the customer pays. */
export const recommended = (p: Policy) => p.kind === 'hourly' || !!p.guaranteed;

/**
 * How a job-shopping driver ranks other companies (Edward, 25 Nov: drivers change jobs often,
 * so the choices are what they'd switch for): who pays most for waiting, who pays even when the
 * customer doesn't, and who starts paying soonest.
 */
export type CompanySort = 'rate' | 'guaranteed' | 'soon';

const byScore = (a: Policy, b: Policy) => score(b) - score(a) || a.company.localeCompare(b.company);
const byRate = (a: Policy, b: Policy) => (b.rate ?? -1) - (a.rate ?? -1) || byScore(a, b);
const bySoon = (a: Policy, b: Policy) => (a.freeMin ?? 999) - (b.freeMin ?? 999) || byRate(a, b);

/**
 * The choice puts the companies that match it at the top, under their own heading, in its order;
 * everyone else follows in recommended order. Nothing is hidden.
 */
export function splitPolicies(list: Policy[], by: CompanySort): { top: Policy[]; rest: Policy[] } {
  const match = by === 'rate' ? (p: Policy) => p.rate !== undefined : by === 'guaranteed' ? recommended : paysBy2h;
  const order = by === 'rate' ? byRate : by === 'guaranteed' ? byScore : bySoon;
  return { top: list.filter(match).sort(order), rest: list.filter((p) => !match(p)).sort(byScore) };
}

/** Companies whose name contains the search, ignoring case, spaces and punctuation ("jb hunt"). */
export function searchPolicies(list: Policy[], q: string): Policy[] {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = norm(q);
  return n ? list.filter((p) => norm(p.company).includes(n)) : list;
}

/** Oldest source year shown as a warning when a policy is old enough that it may have changed. */
export function staleYear(p: Policy): number | null {
  const newest = Math.max(0, ...p.sources.map((x) => x.year ?? 0));
  return newest && newest < 2021 ? newest : null;
}
