// Google Sheets sync: RFC 4180 CSV parse/serialize, automatic column mapping
// by header name, and the tab-separated "Copy row for Google Sheets" format.
//
// Sheet column order (matches the team's current sheet, 15 columns). The
// Frontend/Backend cells hold "stack | Drive link" like the sheet does.
import type { Project, ProjectDraft, Status } from './types.ts';
import { emptyProject } from './types.ts';
import { isISODate, normalizeUrl } from './utils.ts';

export const SHEET_HEADERS = [
	'Product name',
	'Reference website link',
	'Tester name',
	'Tier',
	"Why it's interesting",
	'Product details',
	'Expected output',
	'Frontend (stack + Drive link)',
	'Backend (stack + Drive link)',
	'Readme link',
	'GitHub link',
	'Live link',
	'Status',
	'Checked',
	'Date'
];

export type Field =
	| 'name'
	| 'referenceUrl'
	| 'tester'
	| 'tier'
	| 'why'
	| 'details'
	| 'expected'
	| 'frontend'
	| 'frontendStack'
	| 'frontendDrive'
	| 'backend'
	| 'backendStack'
	| 'backendDrive'
	| 'readmeUrl'
	| 'githubUrl'
	| 'liveUrl'
	| 'status'
	| 'checked'
	| 'date';

export const FIELD_LABELS: Record<Field, string> = {
	name: 'Product name',
	referenceUrl: 'Reference website',
	tester: 'Tester name',
	tier: 'Tier',
	why: "Why it's interesting",
	details: 'Product details',
	expected: 'Expected output',
	frontend: 'Frontend (stack + link)',
	frontendStack: 'Frontend stack',
	frontendDrive: 'Frontend Drive link',
	backend: 'Backend (stack + link)',
	backendStack: 'Backend stack',
	backendDrive: 'Backend Drive link',
	readmeUrl: 'Readme link',
	githubUrl: 'GitHub link',
	liveUrl: 'Live link',
	status: 'Status',
	checked: 'Checked',
	date: 'Date'
};

/** Parses CSV (or TSV when the header row has tabs and no commas). Handles quotes, "" escapes and multi-line cells. */
export function parseCsv(text: string): string[][] {
	const src = (text ?? '').replace(/^\uFEFF/, '');
	const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
	const sep = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (quoted) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					cell += '"';
					i++;
				} else quoted = false;
			} else cell += ch;
		} else if (ch === '"' && cell === '') quoted = true;
		else if (ch === sep) {
			row.push(cell);
			cell = '';
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && src[i + 1] === '\n') i++;
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else cell += ch;
	}
	if (cell !== '' || row.length) {
		row.push(cell);
		rows.push(row);
	}
	return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function csvCell(v: string): string {
	return /[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: string[][]): string {
	return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Maps one header to a project field. Order matters: specific rules first. */
export function matchHeader(header: string): Field | null {
	const n = norm(header);
	if (!n) return null;
	if (/tester|testedby|reportedby|owner|assignee/.test(n)) return 'tester';
	if (/reference|refsite|refwebsite|refurl|inspiration|competitor/.test(n)) return 'referenceUrl';
	if (/^tier|tier$|level|difficulty|complexity/.test(n)) return 'tier';
	if (/why|interesting|reason/.test(n)) return 'why';
	if (/expected|output/.test(n)) return 'expected';
	if (/detail|description|about|summary|brief/.test(n)) return 'details';
	if (/front|^fe$|^ui$|client/.test(n)) {
		const link = /drive|link|url|folder/.test(n);
		const stack = /stack|tech|framework/.test(n);
		return link && !stack ? 'frontendDrive' : stack && !link ? 'frontendStack' : 'frontend';
	}
	if (/back|^be$|server|api/.test(n)) {
		const link = /drive|link|url|folder/.test(n);
		const stack = /stack|tech|framework/.test(n);
		return link && !stack ? 'backendDrive' : stack && !link ? 'backendStack' : 'backend';
	}
	if (/readme|docs|documentation/.test(n)) return 'readmeUrl';
	if (/github|repo|^git|sourcecode/.test(n)) return 'githubUrl';
	if (/live|deploy|demo|vercel|hosted|website|site|url|link/.test(n)) return 'liveUrl';
	if (/status|state|progress/.test(n)) return 'status';
	if (/checked|verified|reviewed|approved|qa/.test(n)) return 'checked';
	if (/date|day|created|when/.test(n)) return 'date';
	if (/product|project|name|title|app/.test(n)) return 'name';
	return null;
}

export interface ColumnMap {
	header: string;
	field: Field | null;
}

/** First header to claim a field wins; duplicates are left unmapped. */
export function mapHeaders(headers: string[]): ColumnMap[] {
	const used = new Set<Field>();
	return headers.map((header) => {
		let field = matchHeader(header);
		if (field && used.has(field)) field = null;
		if (field) used.add(field);
		return { header: header.trim(), field };
	});
}

const URL_RE = /https?:\/\/[^\s|,]+/i;

/** "React + Tailwind | https://drive.google.com/..." -> stack + link */
export function splitStackLink(cell: string): { stack: string; link: string } {
	const s = (cell ?? '').trim();
	const m = s.match(URL_RE);
	if (!m) {
		const bare = s.match(/(^|\s)((?:drive|docs)\.google\.com\/\S+)/i);
		if (!bare) return { stack: s, link: '' };
		return { stack: s.replace(bare[2], '').replace(/[\s|,;:–—-]+$/, '').trim(), link: 'https://' + bare[2] };
	}
	const stack = s
		.replace(m[0], ' ')
		.replace(/\s{2,}/g, ' ')
		.replace(/[\s|,;:–—-]+$/, '')
		.replace(/^[\s|,;:–—-]+/, '')
		.trim();
	return { stack, link: m[0] };
}

export function joinStackLink(stack: string, link: string): string {
	return [stack.trim(), link.trim()].filter(Boolean).join(' | ');
}

export function parseStatus(v: string): Status {
	return /complete|done|finish|shipped|deployed|closed/i.test(v ?? '') ? 'Completed' : 'In progress';
}

export function parseChecked(v: string): boolean {
	return /^\s*(y|yes|true|1|✓|✔|☑|checked|done|ok)\b/i.test(v ?? '') || /^\s*[✓✔☑]/.test(v ?? '');
}

const MONTH_IDX: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Accepts YYYY-MM-DD, DD/MM/YYYY (team default), D-M-YY, "19 Oct 2026", "Oct 19, 2026". */
export function parseDate(v: string): string {
	const s = (v ?? '').trim();
	if (!s) return '';
	const p2 = (n: number) => String(n).padStart(2, '0');
	const ok = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${p2(m)}-${p2(d)}` : '');
	let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
	if (m) return ok(+m[1], +m[2], +m[3]);
	m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
	if (m) {
		let [a, b, y] = [+m[1], +m[2], +m[3]];
		if (y < 100) y += 2000;
		// DD/MM/YYYY by default; switch to MM/DD when the first part can't be a month... or the second can't be one.
		if (b > 12 && a <= 12) [a, b] = [b, a];
		return ok(y, b, a);
	}
	m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,})\.?[\s,-]+(\d{4})/);
	if (m && MONTH_IDX[m[2].slice(0, 3).toLowerCase()]) return ok(+m[3], MONTH_IDX[m[2].slice(0, 3).toLowerCase()], +m[1]);
	m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
	if (m && MONTH_IDX[m[1].slice(0, 3).toLowerCase()]) return ok(+m[3], MONTH_IDX[m[1].slice(0, 3).toLowerCase()], +m[2]);
	return '';
}

export interface ImportResult {
	columns: ColumnMap[];
	drafts: ProjectDraft[];
	/** Project fields that came from a CSV column (only these are updated on re-import). */
	mapped: Array<keyof ProjectDraft>;
	skipped: number;
	warnings: string[];
}

export function mappedFields(columns: ColumnMap[]): Array<keyof ProjectDraft> {
	const out = new Set<keyof ProjectDraft>();
	for (const c of columns) {
		if (!c.field) continue;
		if (c.field === 'frontend') out.add('frontendStack').add('frontendDrive');
		else if (c.field === 'backend') out.add('backendStack').add('backendDrive');
		else out.add(c.field);
	}
	return [...out];
}

/** CSV text -> project drafts (rows without a product name are skipped). */
export function importCsv(text: string, defaultTester = ''): ImportResult {
	const rows = parseCsv(text);
	const warnings: string[] = [];
	if (rows.length < 2) {
		const columns = mapHeaders(rows[0] ?? []);
		return { columns, drafts: [], mapped: mappedFields(columns), skipped: 0, warnings: ['The file has no data rows (need a header row plus at least one project).'] };
	}
	const columns = mapHeaders(rows[0]);
	if (!columns.some((c) => c.field === 'name')) warnings.push('No "Product name" column found, so the first column is used as the product name.');
	const nameIdx = columns.findIndex((c) => c.field === 'name');
	const drafts: ProjectDraft[] = [];
	let skipped = 0;
	for (const r of rows.slice(1)) {
		const d = emptyProject(defaultTester);
		columns.forEach((c, i) => {
			const v = (r[i] ?? '').trim();
			if (!c.field || !v) return;
			switch (c.field) {
				case 'frontend': {
					const { stack, link } = splitStackLink(v);
					d.frontendStack = stack;
					d.frontendDrive = normalizeUrl(link);
					break;
				}
				case 'backend': {
					const { stack, link } = splitStackLink(v);
					d.backendStack = stack;
					d.backendDrive = normalizeUrl(link);
					break;
				}
				case 'status':
					d.status = parseStatus(v);
					break;
				case 'checked':
					d.checked = parseChecked(v);
					break;
				case 'date':
					d.date = parseDate(v);
					if (!d.date) warnings.push(`Could not read date "${v}" (left empty).`);
					break;
				case 'referenceUrl':
				case 'frontendDrive':
				case 'backendDrive':
				case 'readmeUrl':
				case 'githubUrl':
				case 'liveUrl':
					d[c.field] = normalizeUrl(v);
					break;
				default:
					d[c.field] = v;
			}
		});
		if (nameIdx < 0) d.name = (r[0] ?? '').trim();
		if (!d.name) {
			skipped++;
			continue;
		}
		drafts.push(d);
	}
	const mapped = mappedFields(columns);
	if (nameIdx < 0) mapped.push('name');
	return { columns, drafts, mapped, skipped, warnings: [...new Set(warnings)].slice(0, 8) };
}

export function projectRow(p: Project | ProjectDraft): string[] {
	return [
		p.name,
		p.referenceUrl,
		p.tester,
		p.tier,
		p.why,
		p.details,
		p.expected,
		joinStackLink(p.frontendStack, p.frontendDrive),
		joinStackLink(p.backendStack, p.backendDrive),
		p.readmeUrl,
		p.githubUrl,
		p.liveUrl,
		p.status,
		p.checked ? 'Yes' : 'No',
		isISODate(p.date) ? p.date : p.date || ''
	];
}

export function projectsToCsv(projects: Array<Project | ProjectDraft>): string {
	return toCsv([SHEET_HEADERS, ...projects.map(projectRow)]);
}

/** One sheet row as tab-separated text, ready to paste into Google Sheets. */
export function projectToTsv(p: Project | ProjectDraft): string {
	return projectRow(p)
		.map((v) => v.replace(/[\t\r\n]+/g, ' ').trim())
		.join('\t');
}
