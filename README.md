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
you drive away. In the browser this only works while the app is open.

On a phone build (not Expo Go), `src/state/background.ts` also fences up to 20
saved facilities with expo-location geofencing, so it works with Docket
closed. A crossing is saved with its time and shown as a notification; the app
applies it when opened, so the clock starts at the moment you pulled in. Local
notifications also say 15 minutes before free time ends and when detention
starts. Needs "Always" location and notification permission, asked the first
time you tap "I'm here".

Claude reads three documents, each through its own Netlify Function (shared
code in `netlify/lib/readDocument.mts`). Nothing sent is stored.

- BOL photo → `read-bol`: the facility's in and out times.
- Rate con screenshot or PDF → `read-ratecon`: load number and stops, which
  open in Check your stops for the driver to confirm.
- Settlement screenshot or PDF → `read-settlement`: detention per load,
  matched to your stops by load number to mark Paid / Less / Not there.

Still simulated and marked "Faked" in the UI: background location, the 60×
clock behind the prototype controls, sharing or emailing a rate con into the
app, company data, Siri and the Dynamic Island.

## Reading documents (Claude API key)

The key lives only in Netlify, never in the app or the repo:

1. Get an API key at https://platform.claude.com (Settings → API keys).
2. Netlify → the site → Site configuration → Environment variables → Add
   `ANTHROPIC_API_KEY` (scope: Functions). Redeploy.

Without the key the app still works: the BOL photo is kept with no times read,
Add a load falls back to the labeled sample load, and settlements are marked by
hand. Locally, `npx expo start --web` has no functions; to try the
reader locally use `npx netlify-cli dev` with the key in `.env` (see
`.env.example`; `.env` is git-ignored).

## iOS

The same code runs on iPhone. `npx expo-doctor` passes and
`npx expo export --platform ios` bundles cleanly. Camera and photo-library
permission text is set in `app.json`. To try it on a phone today:

```sh
npx expo start           # then scan the QR code with the Expo Go app
```

Expo Go can't run background location. To test it, make a development build:
`npx eas-cli@latest build --profile development -p ios` (needs an Apple
Developer account to install on a phone) or `npx expo run:ios` on a Mac with
Xcode. Still to do: a native Live Activity / Dynamic Island widget and
receiving a shared rate con (a share extension).

### TestFlight

`eas.json` is set up for TestFlight. From this folder, signed in with the Apple
ID that has the Developer Program membership:

```sh
npm install -g eas-cli
eas login                                  # your Expo account (free)
eas init                                   # first time only: links the project to Expo
eas build -p ios --profile production      # cloud build, about 15–30 min; makes the certificates
eas submit -p ios --latest                 # uploads to App Store Connect / TestFlight
```

Then in App Store Connect → Docket → TestFlight, add internal testers (your team,
no review) or an external group / public link (a short Beta App Review first).

- `EXPO_PUBLIC_API_BASE` in `eas.json` is the site whose Netlify functions read
  BOLs, rate cons and settlements. It must be the one with `ANTHROPIC_API_KEY` set.
- Build numbers count up on their own (`autoIncrement`, versions kept by EAS).
- `usesNonExemptEncryption: false` answers the export-compliance question, so
  builds go straight to testing.
- If Apple says the bundle ID `app.docket.driver` is taken, change
  `ios.bundleIdentifier` in `app.json` (e.g. `edu.cmu.docket`) and build again.
