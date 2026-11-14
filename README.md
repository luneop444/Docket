# Docket

Tracks detention pay (paid waiting time at shippers and receivers) for truck
drivers. CMU Advanced Interaction Design, Project 3. The Figma file is the spec.

## Run locally

```sh
npm install
npx expo start --web     # opens the web build; on desktop it shows inside a phone frame
```

Other commands:

```sh
npm test                 # unit tests for src/logic (detention + paycheck math)
npm run typecheck        # TypeScript
npm run build:web        # static web export to dist/ (what Netlify deploys)
```

## Layout

- `src/app/` – screens (expo-router; every file is a route)
- `src/components/` – reusable UI matching the Figma components
- `src/theme/tokens.ts` – colors and text styles from the Figma variables. The only place raw colors live.
- `src/logic/` – detention math, settlement check, stop logic and sample data; no UI imports
- `src/state/` – app state (AsyncStorage) and the simulated clock
- `assets/fonts/` – Google Sans Flex (SIL Open Font License, see `OFL.txt`)

All data stays on the device (AsyncStorage).

Real today: type in a load (Add a load → Type it in yourself), tap "I'm here"
when you pull in and "I left" when you go. The stop is timed with the phone's
clock (it keeps counting if the app is closed), saved to your history, and the
Paycheck tab checks those stops week by week (Monday to Sunday).
Your stops (from Paycheck or the profile button) lists them all and copies
them as text or downloads a CSV, as a record if a settlement comes up short.

With location allowed, the first "I'm here" at a facility saves where it is;
after that Docket starts the clock on its own when you pull in and asks when
you drive away (only while the app is open; background tracking needs the
iPhone build).

A BOL photo is shrunk and sent to `netlify/functions/read-bol.mts`, which asks
Claude for the facility's in and out times. The photo isn't stored.

Still simulated and marked "Faked" in the UI: background location, the 60×
clock behind the prototype controls, reading rate cons and settlements,
company data, Siri and the Dynamic Island.

## Reading BOLs (Claude API key)

The key lives only in Netlify, never in the app or the repo:

1. Get an API key at https://platform.claude.com (Settings → API keys).
2. Netlify → the site → Site configuration → Environment variables → Add
   `ANTHROPIC_API_KEY` (scope: Functions). Redeploy.

Without the key the app still works: the photo is kept and the summary says no
times were read. Locally, `npx expo start --web` has no functions; to try the
reader locally use `npx netlify-cli dev` with the key in `.env` (see
`.env.example`; `.env` is git-ignored).

## iOS

The same code runs on iPhone. `npx expo-doctor` passes and
`npx expo export --platform ios` bundles cleanly. Camera and photo-library
permission text is set in `app.json`. To try it on a phone today:

```sh
npx expo start           # then scan the QR code with the Expo Go app
```

Still to do for the App Store build: an Apple Developer account, EAS Build
(`npx eas-cli@latest build -p ios`), real background location (expo-location
with geofencing) and a native Live Activity / Dynamic Island widget, which
needs a development build rather than Expo Go.
