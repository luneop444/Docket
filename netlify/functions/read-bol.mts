/**
 * Reads the in and out times off a photo of a signed bill of lading.
 *
 * POST /api/read-bol  { image: <base64 JPEG>, mediaType?: "image/jpeg" | "image/png" | "image/webp" }
 * → 200 { found, in, out, note }  times as "HH:MM" (24-hour) or null
 */
import type { Config } from '@netlify/functions';
import { z } from 'zod';
import { hhmm, readDocument } from '../lib/readDocument.mjs';

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

export default (req: Request) =>
  readDocument({
    req,
    what: 'BOL',
    schema: BolTimes,
    prompt: PROMPT,
    unreadable: { found: false, in: null, out: null, note: 'Docket couldn’t read this photo.' },
    tidy: (o) => ({ found: o.found, in: hhmm(o.in), out: hhmm(o.out), note: o.note }),
  });

export const config: Config = { path: '/api/read-bol', method: 'POST' };
