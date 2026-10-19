# Forge Starter

Forge Starter is a free, local-first workout, calendar, and nutrition tracker. It runs entirely in the browser and does not require an account, cloud database, wearable connection, or API key.

## Included

- Editable exercise library
- Strength workout templates and live workout logging
- Rest timer and resumable active workouts
- Basic calendar planning
- Food, hydration, body-weight, and recipe tracking
- Browser-local persistence
- JSON backup and restore
- Local FIT, TCX, GPX, and CSV activity import
- Installable offline-capable PWA

## Not included

The hosted Forge product contains proprietary capabilities that are intentionally outside Starter: cloud synchronization, wearable integrations, recovery/readiness scoring, training-load intelligence, AI Coach, adaptive training and nutrition, verified challenges, and community features.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No environment file is required.

For a production build:

```bash
npm run build
npm start
```

## Data and backups

Records are stored in the browser's `localStorage`. Clearing site data removes them. Use **Local Data → Export backup** regularly, and restore that JSON file when moving to another browser or computer.

Starter does not send workout or nutrition records to Forge servers.

## Import activities from Garmin Connect

In Garmin Connect on the web, open an activity and use the settings menu to export the original FIT file, TCX, GPX, or CSV. In Forge Starter, open **Local Data**, choose **Import activity files**, and select one or more exports. Parsing happens in your browser; imported activities are saved locally and added to the calendar as completed workouts.

Starter never asks for or stores Garmin credentials. Direct account synchronization is intentionally reserved for Forge Online's authorized provider connection.

## Customization

The primary routes are under `src/app/(main)`. Reusable local persistence is in `src/lib/storage.ts`, `src/lib/schedule.ts`, and `src/lib/nutrition.ts`. Theme tokens are in `src/app/globals.css`.

## License

Forge Starter is source-available for personal, educational, and internal non-commercial use. Redistribution, resale, hosted commercial offerings, and use of Forge branding are prohibited without written permission. See [LICENSE](LICENSE).

Forge Starter is not medical advice and is not a medical device.
