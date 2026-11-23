import type { ImageSourcePropType } from 'react-native';

/**
 * Logos for the six popular carriers, from the team's Figma (Onboarding v3, E1 Pick company,
 * component "Carrier logo"). Exported at 3x with transparent backgrounds; sizes are the Figma
 * sizes in pt.
 * Short names are the ones the Figma tiles use.
 */
export const LOGOS: Record<string, { src: ImageSourcePropType; w: number; h: number; short: string }> = {
  'Swift Transportation': { src: require('../../assets/carriers/swift.png'), w: 89, h: 29, short: 'Swift Transportation' },
  'Schneider National': { src: require('../../assets/carriers/schneider.png'), w: 108, h: 24, short: 'Schneider National' },
  'J.B. Hunt Transport': { src: require('../../assets/carriers/jbhunt.png'), w: 80, h: 32, short: 'J.B. Hunt' },
  'FedEx Freight': { src: require('../../assets/carriers/fedex-freight.png'), w: 77, h: 34, short: 'FedEx Freight' },
  'Werner Enterprises': { src: require('../../assets/carriers/werner.png'), w: 88, h: 30, short: 'Werner Enterprises' },
  'Prime Inc.': { src: require('../../assets/carriers/prime.png'), w: 92, h: 28, short: 'Prime Inc.' },
};
