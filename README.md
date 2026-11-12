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

Still simulated and marked "Faked" in the UI: GPS arriving and leaving, the
60× clock behind the prototype controls, reading rate cons, BOLs and
settlements, company data, Siri and the Dynamic Island.

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
