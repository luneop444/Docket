/**
 * Sends a BOL photo to the read-bol Netlify Function, which asks Claude for
 * the facility's in and out times. The photo is shrunk first (a phone photo
 * is several MB; the times read fine at 1600 px) and isn't stored anywhere.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface BolReading {
  found: boolean;
  in: string | null;
  out: string | null;
  note: string;
}

/**
 * Where the function lives. On the web it's the same site. A native build
 * needs EXPO_PUBLIC_API_BASE, e.g. https://docket-cmu-3139.netlify.app
 */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';

export class BolReadError extends Error {}

export async function readBol(uri: string): Promise<BolReading> {
  if (!API_BASE && Platform.OS !== 'web') throw new BolReadError('Reading BOLs needs the app’s web address set.');

  const img = await ImageManipulator.manipulate(uri, { maxWidth: 1600, maxHeight: 1600 }).renderAsync();
  const { base64 } = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!base64) throw new BolReadError('Couldn’t prepare the photo.');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/read-bol`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
    });
  } catch {
    throw new BolReadError('No connection. The photo is kept with the stop.');
  }
  const body = (await res.json().catch(() => null)) as (BolReading & { error?: string }) | null;
  // The local dev server answers with the app's HTML, not JSON.
  if (!body) throw new BolReadError('Reading BOLs works on the deployed site, not the local dev server.');
  if (!res.ok || body.error) throw new BolReadError(body.error ?? 'Couldn’t read the BOL right now.');
  return { found: !!body.found, in: body.in ?? null, out: body.out ?? null, note: body.note ?? '' };
}
