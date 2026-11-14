/**
 * Sends a document (BOL photo, rate con, settlement) to one of the read-*
 * Netlify Functions, which ask Claude for the fields. Photos are shrunk first
 * (a phone photo is several MB; text reads fine at 1600 px). Nothing is stored.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Where the functions live. On the web it's the same site. A native build
 * needs EXPO_PUBLIC_API_BASE, e.g. https://docket-cmu-3139.netlify.app
 */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';
/** Matches the server's limit, so a big PDF fails here with a clear message. */
const MAX_BASE64_CHARS = 4_000_000;

export class DocReadError extends Error {}
/** The site has no Claude API key, or this is the local dev server: reading is off, not broken. */
export class DocReadingOff extends DocReadError {}

export interface DocFile {
  base64: string;
  mediaType: 'image/jpeg' | 'application/pdf';
}

export async function shrinkPhoto(uri: string): Promise<DocFile> {
  const img = await ImageManipulator.manipulate(uri, { maxWidth: 1600, maxHeight: 1600 }).renderAsync();
  const { base64 } = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!base64) throw new DocReadError('Couldn’t prepare the photo.');
  return { base64, mediaType: 'image/jpeg' };
}

/** A screenshot from the photo library. */
export async function pickScreenshot(): Promise<DocFile | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return r.canceled ? null : shrinkPhoto(r.assets[0].uri);
}

/** A PDF or image from Files (phone) or the computer (web). */
export async function pickFile(): Promise<DocFile | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const asset = r.assets[0];
  const pdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name);
  if (!pdf) return shrinkPhoto(asset.uri);
  const raw = Platform.OS === 'web' ? (asset.base64 ?? asset.uri) : await new File(asset.uri).base64();
  const base64 = raw.replace(/^data:[^,]+,/, '');
  if (base64.length > MAX_BASE64_CHARS) throw new DocReadError('That PDF is too big. Try a screenshot of the page instead.');
  return { base64, mediaType: 'application/pdf' };
}

/** POST the file to /api/<path> and return the JSON answer. */
export async function postDoc<T>(path: string, file: DocFile, what: string): Promise<T> {
  if (!API_BASE && Platform.OS !== 'web') throw new DocReadingOff(`Reading the ${what} needs the app’s web address set.`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: file.base64, mediaType: file.mediaType }),
    });
  } catch {
    throw new DocReadError('No connection. Try again when you have signal.');
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  // The local dev server answers with the app's HTML, not JSON.
  if (!body) throw new DocReadingOff(`Reading the ${what} works on the deployed site, not the local dev server.`);
  if (res.status === 503) throw new DocReadingOff(body.error ?? `Reading the ${what} isn’t set up on this site.`);
  if (!res.ok || body.error) throw new DocReadError(body.error ?? `Couldn’t read the ${what} right now.`);
  return body;
}
