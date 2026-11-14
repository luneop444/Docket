/**
 * Shared by the read-* Netlify Functions: take a photo or PDF the app posted,
 * ask Claude to pull structured fields off it, and answer with JSON.
 *
 * The Claude API key lives only in the ANTHROPIC_API_KEY environment variable
 * set in Netlify (Site configuration → Environment variables). It is never
 * sent to the app. Nothing posted here is stored.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
type MediaType = ImageType | 'application/pdf';

/** The app sends a resized JPEG well under this. Netlify's request limit is 6 MB. */
const MAX_BASE64_CHARS = 4_000_000;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export interface ReadOptions<T extends z.ZodType> {
  req: Request;
  /** What the driver is sending, for error messages: "BOL", "rate con", "settlement". */
  what: string;
  schema: T;
  prompt: string;
  /** Sent back when Claude declines or returns nothing usable. */
  unreadable: z.infer<T>;
  /** Clean up the parsed answer before it goes back to the app. */
  tidy?: (out: z.infer<T>) => unknown;
}

export async function readDocument<T extends z.ZodType>({ req, what, schema, prompt, unreadable, tidy }: ReadOptions<T>) {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: `Reading the ${what} isn’t set up on this site yet.` }, 503);

  let data: string;
  let mediaType: MediaType = 'image/jpeg';
  try {
    const body = (await req.json()) as { image?: unknown; mediaType?: unknown };
    if (typeof body.image !== 'string' || !body.image) throw new Error();
    data = body.image.replace(/^data:[^,]+,/, '');
    if (body.mediaType === 'application/pdf' || IMAGE_TYPES.includes(body.mediaType as ImageType)) {
      mediaType = body.mediaType as MediaType;
    }
  } catch {
    return json({ error: 'Send { image: <base64> }.' }, 400);
  }
  if (data.length > MAX_BASE64_CHARS) return json({ error: 'That file is too large. Try a screenshot instead.' }, 413);

  const file =
    mediaType === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: mediaType, data } } as const)
      : ({ type: 'image', source: { type: 'base64', media_type: mediaType, data } } as const);

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // If a request is declined, the API retries it on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
      messages: [{ role: 'user', content: [file, { type: 'text', text: prompt }] }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) return json(unreadable);
    const out = response.parsed_output as z.infer<T>;
    return json(tidy ? tidy(out) : out);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now. Try again in a minute.' }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error', err.status, err.message);
      return json({ error: `Couldn’t read the ${what} right now.` }, 502);
    }
    console.error(err);
    return json({ error: `Couldn’t read the ${what} right now.` }, 500);
  }
}

/** Keep only well-formed 24-hour "HH:MM". */
export const hhmm = (t: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null);
