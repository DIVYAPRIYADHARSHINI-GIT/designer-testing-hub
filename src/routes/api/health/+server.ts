import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json({ ok: true, app: 'Designer Testing Hub', tagline: 'Test. Track. Report.' });
