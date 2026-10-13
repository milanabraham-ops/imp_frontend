// Always relative, on purpose, every API call (not just auth) is routed through whichever origin
// actually served this page, proxied through to the real backend there (Vercel's rewrite in
// frontend/vercel.json in production, Vite's own dev server proxy in vite.config.js locally). That
// makes the browser see the backend as same-origin instead of a different site (Render vs Vercel),
// which is what lets the refresh-token cookie survive at all, browsers increasingly evict or
// partition a cookie set by a genuinely cross-site request, no matter its SameSite/Secure
// attributes, and reload kept logging people out until this stopped being cross-site in the first
// place. An absolute VITE_API_URL pointing straight at the Render URL would resurrect that bug.
export const API_URL = '/api'
