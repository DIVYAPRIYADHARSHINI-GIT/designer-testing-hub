// Browser-side helpers for "Copy row for Google Sheets" and CSV export.
import type { Project } from './types.ts';
import { projectToTsv, projectsToCsv } from './csv.ts';
import { copyText, downloadBlob, downloadText } from './client.ts';
import { todayISO } from './utils.ts';

export async function copyRow(p: Project): Promise<boolean> {
	return copyText(projectToTsv(p));
}

/** Exports via the server route; falls back to building the CSV in the browser. */
export async function exportCsv(projects: Project[]): Promise<string> {
	const name = `Designer_Testing_Projects_${todayISO()}.csv`;
	try {
		const ctl = new AbortController();
		const t = setTimeout(() => ctl.abort(), 10000);
		const res = await fetch('/api/csv/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projects }), signal: ctl.signal });
		clearTimeout(t);
		if (res.ok) {
			downloadBlob(await res.blob(), name);
			return name;
		}
	} catch {
		/* fall through */
	}
	downloadText('\uFEFF' + projectsToCsv(projects), name, 'text/csv;charset=utf-8');
	return name;
}
