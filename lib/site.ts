// Absolute base for share links and images.
// SITE_URL (set by hand, e.g. https://whowonthetrade.com) wins; else the host's own production address
// (Netlify sets URL, Vercel sets VERCEL_PROJECT_PRODUCTION_URL); else the local dev server.
const fromHost = process.env.URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
export const SITE_URL = (process.env.SITE_URL || fromHost || "http://localhost:3000").replace(/\/$/, "");
