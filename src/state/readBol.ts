/**
 * Sends a BOL photo to the read-bol Netlify Function, which asks Claude for
 * the facility's in and out times. The photo isn't stored anywhere.
 */
import { DocReadError, DocReadingOff, postDoc, shrinkPhoto } from './readDoc';

export interface BolReading {
  found: boolean;
  in: string | null;
  out: string | null;
  note: string;
}

export { DocReadError as BolReadError, DocReadingOff as BolReadingOff };

export async function readBol(uri: string): Promise<BolReading> {
  const body = await postDoc<BolReading>('read-bol', await shrinkPhoto(uri), 'BOL');
  return { found: !!body.found, in: body.in ?? null, out: body.out ?? null, note: body.note ?? '' };
}
