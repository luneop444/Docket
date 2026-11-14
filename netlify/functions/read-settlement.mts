/**
 * Reads which loads a weekly settlement lists and how much detention it pays on each.
 *
 * POST /api/read-settlement  { image: <base64>, mediaType: "image/jpeg" | "application/pdf" | … }
 * → 200 { found, loads: [{ number, detention }], note }  detention in dollars, null when none is listed
 */
import type { Config } from '@netlify/functions';
import { z } from 'zod';
import { readDocument } from '../lib/readDocument.mjs';

const Settlement = z.object({
  found: z.boolean().describe('True if this is a driver settlement or pay statement that lists loads.'),
  loads: z
    .array(
      z.object({
        number: z.string().describe('The load, trip or order number as printed.'),
        detention: z
          .number()
          .nullable()
          .describe('Total dollars paid for detention / delay / wait time on this load. Null if no such line for this load.'),
      }),
    )
    .describe('Every load listed on the settlement.'),
  note: z.string().describe('One short sentence for the driver: what was read, or why nothing could be read.'),
});

const PROMPT = `This is a truck driver's weekly settlement (pay statement). It may be a screenshot, a photo or a PDF.
List every load on it by its load, trip or order number, and the total paid for detention on that load. Detention may be labelled detention, delay, wait time, layover-detention or similar.
Rules:
- Report only what is written. Never guess a number or amount.
- Detention is in dollars as a plain number (37.50). If a load has no detention line, use null.
- Don't count line haul, mileage, fuel, stop pay, layover, lumper or deductions as detention.
- If this isn't a settlement or nothing is legible, set found to false, leave loads empty and explain briefly in note.`;

export default (req: Request) =>
  readDocument({
    req,
    what: 'settlement',
    schema: Settlement,
    prompt: PROMPT,
    unreadable: { found: false, loads: [], note: 'Docket couldn’t read this settlement.' },
    tidy: (o) => ({
      found: o.found && o.loads.length > 0,
      loads: o.loads.slice(0, 60).map((l) => ({
        number: l.number.trim(),
        detention: l.detention != null && Number.isFinite(l.detention) && l.detention >= 0 ? l.detention : null,
      })),
      note: o.note,
    }),
  });

export const config: Config = { path: '/api/read-settlement', method: 'POST' };
