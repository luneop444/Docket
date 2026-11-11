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

All data stays on the device (AsyncStorage). GPS, time passing, document
reading and the Dynamic Island are simulated in the prototype and marked
"Faked" in the UI.
