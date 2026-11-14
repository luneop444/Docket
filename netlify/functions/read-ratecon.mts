/**
 * Reads the load number and stops off a rate confirmation (screenshot, photo or PDF).
 *
 * POST /api/read-ratecon  { image: <base64>, mediaType: "image/jpeg" | "application/pdf" | … }
 * → 200 { found, number, stops: [{ name, kind, appt }], note }  appt as "HH:MM" (24-hour) or null
 */
import type { Config } from '@netlify/functions';
import { z } from 'zod';
import { hhmm, readDocument } from '../lib/readDocument.mjs';

const RateCon = z.object({
  found: z.boolean().describe('True if this is a rate confirmation or load tender with at least one stop.'),
  number: z.string().nullable().describe('The load, order or PRO number the driver would quote to dispatch, or null.'),
  stops: z
    .array(
      z.object({
        name: z.string().describe('Facility or company name at the stop, short, e.g. "Harbor Foods DC". Not the street address.'),
        kind: z.enum(['Pickup', 'Drop']).describe('Pickup (shipper) or Drop (consignee / delivery).'),
        appt: z.string().nullable().describe('Appointment time, 24-hour "HH:MM". For a window, the start. Null if none is written.'),
      }),
    )
    .describe('Every stop in route order.'),
  note: z.string().describe('One short sentence for the driver: what was read, or why nothing could be read.'),
});

const PROMPT = `This is a rate confirmation (rate con) or load tender a truck driver received from dispatch or a broker. It may be a screenshot, a photo or a PDF.
Pull out the load number and every stop in route order: the facility name, whether it's a pickup or a drop (delivery), and the appointment time.
Rules:
- Report only what is written. Never guess a name or time that isn't there.
- Use the facility or company name, not the street address. Keep it short.
- Times in 24-hour "HH:MM". For a window like 08:00-12:00 use the start. "FCFS" or no time means appt is null.
- Ignore rates, charges, accessorial terms, dates and contact details.
- If this isn't a rate con or no stops are legible, set found to false, leave stops empty and explain briefly in note.`;

export default (req: Request) =>
  readDocument({
    req,
    what: 'rate con',
    schema: RateCon,
    prompt: PROMPT,
    unreadable: { found: false, number: null, stops: [], note: 'Docket couldn’t read this rate con.' },
    tidy: (o) => ({
      found: o.found && o.stops.length > 0,
      number: o.number?.trim() || null,
      stops: o.stops.slice(0, 12).map((st) => ({ name: st.name.trim().slice(0, 60), kind: st.kind, appt: hhmm(st.appt) })),
      note: o.note,
    }),
  });

export const config: Config = { path: '/api/read-ratecon', method: 'POST' };
