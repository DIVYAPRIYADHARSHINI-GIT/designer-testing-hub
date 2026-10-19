import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Server routes (PDF/DOCX reports, CSV import/export) run as Vercel
		// Node.js serverless functions; pages are client-rendered (localStorage).
		// Runtime pinned explicitly (the adapter refuses to infer one from newer local Node versions).
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
