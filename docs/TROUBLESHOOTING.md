# Troubleshooting

## My data disappeared

Starter stores data in browser local storage. Clearing site data, using private browsing, or changing browsers creates a separate empty workspace. Restore a JSON backup from **Local Data**.

## The app does not update after a new release

Close all Starter tabs, clear the site's service-worker cache, and reload. Your local records should be exported before clearing all site data.

## The production build fails

Use Node.js 20 or newer, remove `.next`, run `npm install`, then run `npm run build` again.
