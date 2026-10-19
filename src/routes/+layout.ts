// All data lives in localStorage, so pages render in the browser only.
// API routes (+server.ts) still run on the server (Vercel functions).
export const ssr = false;
export const prerender = false;
