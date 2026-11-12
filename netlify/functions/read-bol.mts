/**
 * Reads the in and out times off a photo of a signed bill of lading.
 *
 * POST /api/read-bol  { image: <base64 JPEG>, mediaType?: "image/jpeg" | "image/png" | "image/webp" }
 * → 200 { found, in, out, note }  times as "HH:MM" (24-hour) or null
 *
 * The Claude API key lives only here, in the ANTHROPIC_API_KEY environment
 * variable set in Netlify (Site configuration → Environment variables). It is
 * never sent to the app. The photo is not stored.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { Config } from '@netlify/functions';
import { z } from 'zod';

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** The app sends a resized JPEG well under this. Netlify's request limit is 6 MB. */
const MAX_BASE64_CHARS = 4_000_000;

const BolTimes = z.object({
  found: z.boolean().describe('True if at least one facility in or out time is legible on the document.'),
  in: z.string().nullable().describe('Time the truck arrived / checked in at the facility, 24-hour "HH:MM", or null.'),
  out: z.string().nullable().describe('Time the truck was released / left the facility, 24-hour "HH:MM", or null.'),
  note: z.string().describe('One short sentence for the driver: what was read, or why nothing could be read.'),
});

const PROMPT = `This is a photo of a signed bill of lading (BOL) or delivery receipt from a truck driver.
Find the times the shipping or receiving facility wrote for when the truck arrived (in / check-in / time in) and when it was released (out / time out / departed).
Rules:
- Report only times you can actually read on the document. Never guess or infer a time that isn't written.
- Convert to 24-hour "HH:MM". If a handwritten time has no AM/PM, use the reading that makes "out" later than "in" on a normal working day.
- Ignore appointment times, pickup windows, print timestamps and dates.
- If it isn't a BOL or nothing is legible, set found to false and explain briefly in note.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'Reading BOLs isn’t set up on this site yet.' }, 503);

  let image: string;
  let mediaType: (typeof MEDIA_TYPES)[number] = 'image/jpeg';
  try {
    const body = (await req.json()) as { image?: unknown; mediaType?: unknown };
    if (typeof body.image !== 'string' || !body.image) throw new Error();
    image = body.image.replace(/^data:[^,]+,/, '');
    if (MEDIA_TYPES.includes(body.mediaType as never)) mediaType = body.mediaType as typeof mediaType;
  } catch {
    return json({ error: 'Send { image: <base64> }.' }, 400);
  }
  if (image.length > MAX_BASE64_CHARS) return json({ error: 'Photo is too large.' }, 413);

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // If a request is declined, the API retries it on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(BolTimes) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return json({ found: false, in: null, out: null, note: 'Docket couldn’t read this photo.' });
    }
    const out = response.parsed_output;
    const hhmm = (t: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null);
    return json({ found: out.found, in: hhmm(out.in), out: hhmm(out.out), note: out.note });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now. Try again in a minute.' }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error', err.status, err.message);
      return json({ error: 'Couldn’t read the BOL right now.' }, 502);
    }
    console.error(err);
    return json({ error: 'Couldn’t read the BOL right now.' }, 500);
  }
};

export const config: Config = { path: '/api/read-bol', method: 'POST' };
