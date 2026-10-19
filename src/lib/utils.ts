// Small pure helpers shared by the UI, the server routes and the unit tests.

export function uid(prefix = ''): string {
	return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(d = new Date()): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-10-19" -> "19 Oct 2026" */
export function formatDate(iso: string): string {
	if (!isISODate(iso)) return iso || '-';
	const [y, m, d] = iso.split('-').map(Number);
	return `${d} ${MONTHS[m - 1]} ${y}`;
}

const utc = (iso: string) => new Date(iso + 'T00:00:00Z');

export function weekday(iso: string): string {
	return DAYS[utc(iso).getUTCDay()];
}

export function addDays(iso: string, n: number): string {
	const d = utc(iso);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
	const day = utc(iso).getUTCDay();
	return addDays(iso, day === 0 ? -6 : 1 - day);
}

/** Accepts "github.com/x" and turns it into "https://github.com/x". */
export function normalizeUrl(raw: string): string {
	const s = (raw ?? '').trim();
	if (!s) return '';
	if (/^https?:\/\//i.test(s)) return s;
	if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#]|$)/i.test(s)) return 'https://' + s;
	return s;
}

/** Empty is valid (links are optional); otherwise a full http(s) link. */
export function isValidUrl(raw: string): boolean {
	const s = (raw ?? '').trim();
	if (!s) return true;
	if (/\s/.test(s)) return false;
	try {
		const u = new URL(normalizeUrl(s));
		return (u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname.includes('.') || u.hostname === 'localhost');
	} catch {
		return false;
	}
}

/** Short display form of a link: host + path, no protocol. */
export function prettyUrl(url: string, max = 48): string {
	const s = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** Counts real words (letters/digits, any script); punctuation and emoji don't count. */
export function wordCount(s: string): number {
	const m = (s ?? '').match(/[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu);
	return m ? m.length : 0;
}

export function plural(n: number, word: string, many = word + 's'): string {
	return `${n} ${n === 1 ? word : many}`;
}

/** Safe for file names: "Brain Arena" -> "Brain_Arena". */
export function fileSafe(s: string): string {
	return (
		(s ?? '')
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^A-Za-z0-9 _-]/g, '')
			.trim()
			.replace(/[\s_-]+/g, '_') || 'Untitled'
	);
}
