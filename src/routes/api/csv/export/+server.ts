// POST /api/csv/export  { projects } -> CSV attachment in the sheet's column order.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { projectsToCsv } from '$lib/csv.ts';
import { cleanProject } from '$lib/report/validate.ts';
import { todayISO } from '$lib/utils.ts';

export const POST: RequestHandler = async ({ request }) => {
	let body: { projects?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Send JSON: { "projects": [...] }' }, { status: 400 });
	}
	if (!Array.isArray(body.projects)) return json({ error: '"projects" must be an array.' }, { status: 400 });
	const projects = body.projects
		.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
		.slice(0, 5000)
		.map(cleanProject);
	// BOM so Excel opens UTF-8 correctly; Google Sheets ignores it.
	const csv = '\uFEFF' + projectsToCsv(projects);
	const name = `Designer_Testing_Projects_${todayISO()}.csv`;
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${name}"`,
			'cache-control': 'no-store'
		}
	});
};
