// Browser helpers: file downloads, clipboard, and calling the server routes
// (with an in-browser fallback for reports if the server can't be reached).
import type { ReportRequest } from './report/build.ts';

export function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadText(text: string, fileName: string, mime = 'text/plain;charset=utf-8') {
	downloadBlob(new Blob([text], { type: mime }), fileName);
}

export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fallback for http:// or blocked clipboard permissions.
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch {
			ok = false;
		}
		ta.remove();
		return ok;
	}
}

function fileNameFrom(res: Response, fallback: string): string {
	const cd = res.headers.get('content-disposition') ?? '';
	const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
	if (star) return decodeURIComponent(star[1]);
	const plain = cd.match(/filename="?([^";]+)"?/i);
	return plain ? plain[1] : fallback;
}

async function withTimeout(input: RequestInfo, init: RequestInit, ms = 15000): Promise<Response> {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), ms);
	try {
		return await fetch(input, { ...init, signal: ctl.signal });
	} finally {
		clearTimeout(t);
	}
}

/** Generates a report on the server and downloads it. Falls back to in-browser generation when offline. */
export async function downloadReport(req: ReportRequest): Promise<string> {
	let res: Response | null = null;
	try {
		res = await withTimeout('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) });
	} catch {
		res = null;
	}
	if (res && res.ok) {
		const blob = await res.blob();
		const name = fileNameFrom(res, `report.${req.format}`);
		downloadBlob(blob, name);
		return name;
	}
	if (res && res.status >= 400 && res.status < 500) {
		const msg = await res.json().catch(() => ({ error: 'Report request was rejected.' }));
		throw new Error(msg.error ?? 'Report request was rejected.');
	}
	// Server unreachable or failed: build the same file in the browser.
	const { generateReport } = await import('./report/index.ts');
	const out = generateReport(req);
	downloadBlob(new Blob([out.bytes as BlobPart], { type: out.mime }), out.fileName);
	return out.fileName;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await withTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
	return res.json() as Promise<T>;
}
