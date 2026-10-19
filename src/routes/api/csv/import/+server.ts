// POST /api/csv/import  { csv, tester? } -> { columns, drafts, skipped, warnings }
// Maps Google Sheets columns automatically by header name.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importCsv } from '$lib/csv.ts';

const MAX = 5_000_000;

export const POST: RequestHandler = async ({ request }) => {
	let body: { csv?: unknown; tester?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Send JSON: { "csv": "..." }' }, { status: 400 });
	}
	if (typeof body.csv !== 'string' || !body.csv.trim()) return json({ error: 'The CSV file is empty.' }, { status: 400 });
	if (body.csv.length > MAX) return json({ error: 'CSV is too large (max 5 MB).' }, { status: 413 });
	const result = importCsv(body.csv, typeof body.tester === 'string' ? body.tester.slice(0, 200) : '');
	if (result.drafts.length > 2000) return json({ error: 'Too many rows (max 2000 projects per import).' }, { status: 413 });
	return json(result);
};
