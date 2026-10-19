// End-to-end test with the locally installed headless Chrome (no npm deps).
//
//   npm run build && npx vite preview --port 4317 --strictPort &
//   caffeinate -dims env BASE_URL=http://localhost:4317 node tests/e2e/smoke.mjs
//
// Full flow: sample data -> add project (validation) -> add bugs / pros / cons
// -> edit + delete with confirmation -> every PDF/DOCX report (downloaded and
// checked) -> CSV export + import (auto column mapping) + copy row (TSV) ->
// daily update (word counter, save by date, weekly summary) -> JSON backup ->
// start fresh -> empty states, then every page on desktop + mobile + dark mode.
// Short timeouts, a freeze heartbeat and a global watchdog: fail fast, never hang.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4317').replace(/\/$/, '');
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'output', process.env.OUT_NAME ?? 'local');
const DL = join(OUT, 'downloads');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
const SHOTS = process.env.SHOTS !== '0';
const PAGES = ['/', '/projects', '/projects/p-powerwise', '/bugs', '/reports', '/daily', '/settings', '/does-not-exist'];

const results = [];
function check(name, ok, detail = '') {
	results.push({ name, ok: Boolean(ok), detail });
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const { newPage, close } = await launch({ port: Number(process.env.CDP_PORT ?? 9431) });
const WATCHDOG_MS = Number(process.env.E2E_TIMEOUT_MS ?? 6 * 60_000);
const watchdog = setTimeout(async () => {
	console.error(`E2E watchdog: aborting after ${WATCHDOG_MS / 1000}s`);
	await close().catch(() => {});
	process.exit(2);
}, WATCHDOG_MS);
watchdog.unref();

let seq = 0;
async function freshPage({ width = 1366, height = 900, mobile = false, dark = false, clear = true } = {}) {
	const p = await newPage();
	await p.viewport(width, height, mobile);
	const key = `dth-init-${++seq}`;
	await p.addInitScript(`
    try {
      if (!sessionStorage.getItem('${key}')) {
        ${clear ? 'localStorage.clear();' : ''}
        sessionStorage.setItem('${key}', '1');
        localStorage.setItem('dth.theme', '${dark ? 'dark' : 'light'}');
      }
    } catch (e) {}
    // Clipboard stub so copy buttons can be verified headless.
    window.__clip = '';
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__clip = t; } }, configurable: true }); } catch (e) {}
    window.__beat = 0; setInterval(() => { window.__beat++; }, 50);
  `);
	await p.setDownloadDir(DL);
	return p;
}
async function notFrozen(p, label) {
	const a = await p.eval('window.__beat');
	await sleep(500);
	const b = await p.eval('window.__beat');
	check(`${label}: responsive (no freeze)`, b - a >= 5, `${b - a} beats/500ms`);
}
async function shot(p, name, fullPage = false) {
	if (SHOTS) await p.screenshot(join(OUT, `${name}.png`), { fullPage }).catch(() => {});
}
async function step(name, fn) {
	try {
		await fn();
	} catch (e) {
		check(name, false, String(e?.message ?? e).split('\n')[0]);
	}
}
const noErrors = (p, label) => check(`${label}: no console errors`, p.errors.length === 0, p.errors.slice(0, 2).join(' | '));
const overflow = (p) => p.eval('document.documentElement.scrollWidth - window.innerWidth');
const ready = (p) => p.waitFor("!document.querySelector('[data-testid=loading]') && document.querySelector('[data-testid=page-title]')", 8000);
const nav = async (p, path) => {
	// Client-side navigation through a real link click keeps localStorage state warm.
	await p.goto(BASE + path, { wait: 350 });
	await ready(p);
};

/** Waits for a download whose name matches, returns { name, bytes }. */
async function waitDownload(re, timeout = 8000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const f = readdirSync(DL).find((n) => re.test(n) && !n.endsWith('.crdownload'));
		if (f) {
			const full = join(DL, f);
			await sleep(150);
			if (statSync(full).size > 0) return { name: f, bytes: readFileSync(full) };
		}
		await sleep(120);
	}
	throw new Error(`no download matching ${re}`);
}
function pdfOk(buf) {
	const s = buf.toString('latin1');
	const xref = Number(s.match(/startxref\n(\d+)/)?.[1] ?? -1);
	return s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF') && s.slice(xref, xref + 4) === 'xref';
}
const uris = (buf) => [...buf.toString('latin1').matchAll(/\/URI \(([^)]*)\)/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------
// 1. Main flow (desktop, light)
// ---------------------------------------------------------------------------
const p = await freshPage();
await step('API health', async () => {
	const r = await fetch(BASE + '/api/health');
	check('API /api/health 200', r.ok);
});

await step('dashboard with sample data', async () => {
	await nav(p, '/');
	check('dashboard: sample data pre-loaded (5 projects)', (await p.text('[data-testid=kpi-total] .v')) === '5');
	check('dashboard: completed vs in progress', (await p.text('[data-testid=kpi-completed] .v')) === '4' && (await p.text('[data-testid=kpi-progress] .v')) === '1');
	check('dashboard: bugs by severity chart', (await p.count('[data-testid=donut-severity] circle[stroke-dasharray]')) === 3);
	check('dashboard: bugs per project chart (5 rows)', (await p.count('[data-testid=bars-per-project] .row')) === 5);
	check('dashboard: pros vs cons chart', /Pros\s*7/.test((await p.text('[data-testid=donut-proscons]')) ?? ''));
	check('dashboard: tester-wise progress', /divyapriyadharshini/.test((await p.text('[data-testid=bars-testers]')) ?? ''));
	await shot(p, 'd-dashboard', true);
	noErrors(p, 'dashboard');
	await notFrozen(p, 'dashboard');
});

let newId = '';
await step('add project with validation', async () => {
	await nav(p, '/projects');
	check('projects: table shows 5 rows', (await p.count('[data-testid=project-row]')) === 5);
	await p.click('[data-testid=add-project]');
	await p.waitFor('document.querySelector("[data-testid=project-modal]")', 3000);
	await p.fill('[data-testid=pf-name]', '');
	await p.fill('[data-testid=pf-live]', 'not a link');
	await p.click('[data-testid=pf-save]');
	const errs = await p.count('[data-testid=project-form] [aria-invalid=true]');
	check('project form: blocks empty name + bad link', errs >= 2, `${errs} invalid fields`);
	check('project form: modal still open', (await p.count('[data-testid=project-modal]')) === 1);
	await p.fill('[data-testid=pf-name]', 'QuizCraft');
	await p.fill('[data-testid=pf-tester]', 'Asha Tester');
	await p.fill('[data-testid=pf-tier]', 'Tier 2');
	await p.fill('[data-testid=pf-why]', 'Tests a quiz builder with timers.');
	await p.fill('[data-testid=pf-fe-stack]', 'SvelteKit + Tailwind');
	await p.fill('[data-testid=pf-fe-drive]', 'drive.google.com/drive/folders/abc');
	await p.fill('[data-testid=pf-live]', 'https://quizcraft-demo.vercel.app');
	await p.fill('[data-testid=pf-github]', 'github.com/asha/quizcraft');
	await p.click('[data-testid=pf-save]');
	await p.waitFor("location.pathname.startsWith('/projects/p-')", 4000);
	newId = await p.eval('location.pathname.split("/").pop()');
	await ready(p);
	check('add project: opens the new project page', (await p.text('[data-testid=page-title]')) === 'QuizCraft');
	const gh = await p.eval('document.querySelector("[data-testid=link-github]")?.href');
	check('add project: links normalized + clickable', gh === 'https://github.com/asha/quizcraft', gh);
	check('add project: links open in a new tab', (await p.eval('document.querySelector("[data-testid=link-live]")?.target')) === '_blank');
});

await step('bugs on a project', async () => {
	for (const [title, sev, ss] of [
		['Timer resets after page refresh', 'High', 'https://example.com/shot1.png'],
		['Quiz list not sorted', 'Low', '']
	]) {
		await p.click('[data-testid=add-bug]');
		await p.waitFor('document.querySelector("[data-testid=bug-modal]")', 3000);
		await p.fill('[data-testid=bf-title]', title);
		await p.click(`[data-testid=bf-sev-${sev}]`);
		await p.fill('[data-testid=bf-steps]', '1. Start a quiz\n2. Refresh');
		await p.fill('[data-testid=bf-expected]', 'Timer continues');
		await p.fill('[data-testid=bf-actual]', 'Timer is back to 0');
		if (ss) await p.fill('[data-testid=bf-screenshot]', ss);
		await p.fill('[data-testid=bf-chat]', 'https://designer.example/chat/42');
		await p.click('[data-testid=bf-save]');
		await p.waitFor('!document.querySelector("[data-testid=bug-modal]")', 3000);
	}
	check('bugs: 2 sticker cards added', (await p.count('[data-testid=bug-card]')) === 2);
	check('bugs: severity tag colours', (await p.count('[data-testid=bug-card] .tag.high')) === 1 && (await p.count('[data-testid=bug-card] .tag.low')) === 1);
	// change status inline
	await p.fill('[data-testid=bug-card] [data-testid=bug-status]', 'Reported');
	check('bugs: inline status change', /Reported/.test((await p.text('[data-testid=bug-card]')) ?? ''));
	// edit
	await p.click('[data-testid=bug-card] [data-testid=bug-edit]');
	await p.waitFor('document.querySelector("[data-testid=bug-modal]")', 3000);
	await p.fill('[data-testid=bf-title]', 'Timer resets after a page refresh');
	await p.click('[data-testid=bf-save]');
	await p.waitFor('!document.querySelector("[data-testid=bug-modal]")', 3000);
	check('bugs: edit saved', /Timer resets after a page refresh/.test((await p.text('[data-testid=bug-list]')) ?? ''));
	// delete: cancel first, then confirm
	await p.eval('document.querySelectorAll("[data-testid=bug-card] [data-testid=bug-delete]")[1].click()');
	await p.waitFor('document.querySelector("[data-testid=confirm-dialog]")', 3000);
	check('bugs: delete asks for confirmation', (await p.count('[data-testid=confirm-dialog]')) === 1);
	await p.click('[data-testid=confirm-cancel]');
	check('bugs: cancel keeps the bug', (await p.count('[data-testid=bug-card]')) === 2);
	await p.eval('document.querySelectorAll("[data-testid=bug-card] [data-testid=bug-delete]")[1].click()');
	await p.waitFor('document.querySelector("[data-testid=confirm-dialog]")', 3000);
	await p.click('[data-testid=confirm-ok]');
	check('bugs: confirmed delete removes it', (await p.count('[data-testid=bug-card]')) === 1);
	await p.click('[data-testid=bug-card] [data-testid=bug-toggle]');
	check('bugs: details show steps/expected/actual', /Steps[\s\S]*Expected[\s\S]*Actual/i.test((await p.text('[data-testid=bug-card]')) ?? ''));
	await shot(p, 'd-project-bugs', true);
});

await step('pros and cons', async () => {
	await p.click('[data-testid=tab-proscons]');
	await p.waitFor('document.querySelector("[data-testid=panel-proscons]")', 3000);
	check('pros/cons: empty states', (await p.count('[data-testid=pros-empty]')) === 1 && (await p.count('[data-testid=cons-empty]')) === 1);
	const add = async (btn, title, desc, cmp, chat) => {
		await p.click(btn);
		await p.waitFor('document.querySelector("[data-testid=feedback-modal]")', 3000);
		await p.fill('[data-testid=ff-title]', title);
		await p.fill('[data-testid=ff-description]', desc);
		if (cmp) await p.fill('[data-testid=ff-compared]', cmp);
		if (chat) await p.fill('[data-testid=ff-chat]', chat);
		await p.click('[data-testid=ff-save]');
		await p.waitFor('!document.querySelector("[data-testid=feedback-modal]")', 3000);
	};
	await add('[data-testid=add-pro]', 'Built the timer logic first try', 'Countdown, pause and resume all worked.', 'Cursor needed two fixes for pause.', 'https://designer.example/chat/7');
	await add('[data-testid=add-pro]', 'Clean component structure', 'Small reusable components.', '', '');
	await add('[data-testid=add-con]', 'Forgot to persist the timer', 'State was lost on refresh.', 'Codex used localStorage by default.', '');
	check('pros/cons: 2 pros + 1 con', (await p.count('[data-testid=pros-list] [data-testid=feedback-card]')) === 2 && (await p.count('[data-testid=cons-list] [data-testid=feedback-card]')) === 1);
	check('pros/cons: Codex/Cursor comparison shown', /vs Codex \/ Cursor/i.test((await p.text('[data-testid=panel-proscons]')) ?? ''));
	await shot(p, 'd-project-proscons', true);
});

await step('reports from the project page', async () => {
	await p.click('[data-testid=tab-reports]');
	await p.waitFor('document.querySelector("[data-testid=panel-reports]")', 3000);
	await p.click('[data-testid=project-feedback-pdf]');
	const f = await waitDownload(/^Designer_Feedback_QuizCraft_.*\.pdf$/);
	check('feedback PDF: downloaded with project + tester name', f.name === 'Designer_Feedback_QuizCraft_DIVYAPRIYADHARSHINI.pdf', f.name);
	check('feedback PDF: valid PDF', pdfOk(f.bytes));
	const u = uris(f.bytes);
	check('feedback PDF: clickable live + GitHub + evidence links', u.includes('https://quizcraft-demo.vercel.app') && u.includes('https://github.com/asha/quizcraft') && u.includes('https://designer.example/chat/7'), u.join(' '));
	check('feedback PDF: summary table included', f.bytes.toString('latin1').includes('(Summary)'));
	await p.click('[data-testid=include-summary]');
	rmSync(join(DL, f.name));
	await p.click('[data-testid=project-feedback-pdf]');
	const f2 = await waitDownload(/^Designer_Feedback_QuizCraft_.*\.pdf$/);
	check('feedback PDF: summary can be hidden', !f2.bytes.toString('latin1').includes('(Summary)'));
	await p.click('[data-testid=project-feedback-docx]');
	const d = await waitDownload(/^Designer_Feedback_QuizCraft_.*\.docx$/);
	check('feedback DOCX: downloaded zip', d.bytes.subarray(0, 2).toString() === 'PK' && d.bytes.toString('latin1').includes('word/document.xml'));
	await p.click('[data-testid=project-bugs-pdf]');
	const b = await waitDownload(/^Designer_Bug_Report_QuizCraft_.*\.pdf$/);
	const bs = b.bytes.toString('latin1');
	check('bug PDF: "Bug 1: title (project)"', bs.includes('(Bug 1: Timer resets after a page refresh \\(QuizCraft\\))'));
	check('bug PDF: evidence links clickable', uris(b.bytes).includes('https://example.com/shot1.png') && uris(b.bytes).includes('https://designer.example/chat/42'));
	await p.click('[data-testid=project-compare-pdf]');
	const c = await waitDownload(/^Designer_vs_Codex_Cursor_QuizCraft_.*\.pdf$/);
	const cs = c.bytes.toString('latin1');
	check('compare PDF: title + both tables', cs.includes('(Designer vs Codex & Cursor)') && cs.includes('(What Designer did)') && cs.includes('(How Codex / Cursor handle it)'));
	noErrors(p, 'project page');
	await notFrozen(p, 'project page');
});

await step('reports page (multi-project)', async () => {
	await nav(p, '/reports');
	check('reports: feedback filename preview', /Designer_Feedback_.*_DIVYAPRIYADHARSHINI\.pdf/.test((await p.text('[data-testid=fb-filename]')) ?? ''));
	check('reports: bug PDF disabled until a project is picked', await p.eval('document.querySelector("[data-testid=rep-bugs-pdf]").disabled'));
	await p.click('[data-testid=bug-select-all]');
	await p.click('[data-testid=rep-bugs-pdf]');
	const b = await waitDownload(/^Designer_Bug_Report_6_Projects_.*\.pdf$/);
	check('reports: bug report for all 6 projects', pdfOk(b.bytes), b.name);
	const bs = b.bytes.toString('latin1');
	check('reports: bug report has Reported by + Projects tested', bs.includes('(Reported by)') && bs.includes('(Projects tested)'));
	// pick 2 projects for compare
	await p.eval('document.querySelectorAll("[data-testid=cmp-pick]")[0].click()');
	await p.eval('document.querySelectorAll("[data-testid=cmp-pick]")[4].click()');
	await sleep(200);
	await p.click('[data-testid=rep-compare-pdf]');
	const c = await waitDownload(/^Designer_vs_Codex_Cursor_2_Projects_.*\.pdf$/);
	check('reports: comparative report for selected projects', pdfOk(c.bytes), c.name);
	await p.click('[data-testid=rep-compare-docx]');
	const cd = await waitDownload(/^Designer_vs_Codex_Cursor_2_Projects_.*\.docx$/);
	check('reports: comparative DOCX', cd.bytes.toString('latin1').includes('TargetMode="External"'));
	await p.fill('[data-testid=fb-project]', 'p-powerwise');
	await p.click('[data-testid=rep-feedback-pdf]');
	const f = await waitDownload(/^Designer_Feedback_PowerWise_DIVYAPRIYADHARSHINI\.pdf$/);
	check('reports: exact sample file name Designer_Feedback_PowerWise_DIVYAPRIYADHARSHINI.pdf', !!f);
	await shot(p, 'd-reports', true);
	noErrors(p, 'reports');
});

await step('API validation', async () => {
	const r1 = await fetch(BASE + '/api/report', { method: 'POST', body: 'nope', headers: { 'content-type': 'application/json' } });
	const r2 = await fetch(BASE + '/api/report', { method: 'POST', body: JSON.stringify({ kind: 'bugs', projects: [] }), headers: { 'content-type': 'application/json' } });
	const r3 = await fetch(BASE + '/api/csv/import', { method: 'POST', body: JSON.stringify({ csv: '' }), headers: { 'content-type': 'application/json' } });
	check('API: bad report requests -> 400 with message', r1.status === 400 && r2.status === 400 && /project/i.test((await r2.json()).error));
	check('API: empty CSV -> 400', r3.status === 400);
});

await step('bugs page: filters + most common', async () => {
	await nav(p, '/bugs');
	const total = await p.count('[data-testid=bug-card]');
	check('bugs page: lists bugs across projects', total === 9, `${total}`);
	check('bugs page: most common bugs grouped (×2)', /×2/.test((await p.text('[data-testid=common-bugs]')) ?? ''));
	await p.fill('[data-testid=bug-filter-severity]', 'High');
	const hi = await p.count('[data-testid=bug-card]');
	check('bugs page: severity filter', hi === 3 && (await p.count('[data-testid=bug-card] .tag.high')) === 3, `${hi}`);
	await p.fill('[data-testid=bug-filter-severity]', '');
	await p.fill('[data-testid=bug-filter-project]', newId);
	check('bugs page: project filter', (await p.count('[data-testid=bug-card]')) === 1);
	await p.click('[data-testid=bug-clear]');
	await p.click('[data-testid=common-bug]');
	check('bugs page: click common bug filters by title', (await p.count('[data-testid=bug-card]')) >= 1 && (await p.count('[data-testid=bug-card]')) < total);
	await shot(p, 'd-bugs', true);
	noErrors(p, 'bugs');
	await notFrozen(p, 'bugs');
});

await step('projects: search / filter / sort / cards', async () => {
	await nav(p, '/projects');
	await p.fill('[data-testid=search]', 'fastapi');
	check('projects: search', (await p.count('[data-testid=project-row]')) === 1);
	await p.fill('[data-testid=search]', '');
	await p.fill('[data-testid=filter-tester]', 'Asha Tester');
	check('projects: tester filter', (await p.count('[data-testid=project-row]')) === 1);
	await p.fill('[data-testid=filter-tester]', '');
	await p.fill('[data-testid=filter-status]', 'Completed');
	check('projects: status filter', (await p.count('[data-testid=project-row]')) === 4);
	await p.fill('[data-testid=filter-status]', '');
	await p.fill('[data-testid=filter-tier]', 'Tier 3');
	check('projects: tier filter', (await p.count('[data-testid=project-row]')) === 2);
	await p.fill('[data-testid=filter-tier]', '');
	await p.fill('[data-testid=filter-bugs]', 'no');
	check('projects: has-bugs filter (none without bugs)', (await p.count('[data-testid=projects-no-match]')) === 1);
	await p.fill('[data-testid=filter-bugs]', '');
	await p.fill('[data-testid=sort]', 'name');
	const first = await p.eval('document.querySelector("[data-testid=project-row] .pname").innerText');
	check('projects: sort by name', first === 'Brain Arena', first);
	await p.click('[data-testid=sort-dir]');
	check('projects: sort direction', (await p.eval('document.querySelector("[data-testid=project-row] .pname").innerText')) === 'TrafficSense');
	await p.click('[data-testid=view-cards]');
	check('projects: card view', (await p.count('[data-testid=project-card]')) === 6);
	check('projects: Checked ✓ stamp', (await p.count('[data-testid=project-card] .stamp:not(.pending)')) === 3);
	await shot(p, 'd-projects-cards', true);
	await p.click('[data-testid=view-table]');
	// copy row (TSV)
	await p.eval('[...document.querySelectorAll("[data-testid=project-row]")].find((r) => r.innerText.includes("QuizCraft")).querySelector("[data-testid=copy-row]").click()');
	await sleep(300);
	const clip = await p.eval('window.__clip');
	const cells = clip.split('\t');
	check('copy row: 15 tab-separated cells', cells.length === 15 && cells[0] === 'QuizCraft' && cells[2] === 'Asha Tester', `${cells.length} cells`);
	check('copy row: frontend stack + Drive link in one cell', cells[7] === 'SvelteKit + Tailwind | https://drive.google.com/drive/folders/abc', cells[7]);
	// edit project inline
	await p.eval('[...document.querySelectorAll("[data-testid=project-row]")].find((r) => r.innerText.includes("QuizCraft")).querySelector("[data-testid=edit-project]").click()');
	await p.waitFor('document.querySelector("[data-testid=project-modal]")', 3000);
	await p.fill('[data-testid=pf-status]', 'Completed');
	await p.click('[data-testid=pf-checked]');
	await p.click('[data-testid=pf-save]');
	await p.waitFor('!document.querySelector("[data-testid=project-modal]")', 3000);
	check('projects: edit saved (status + checked)', /Completed[\s\S]*Checked/i.test((await p.eval('[...document.querySelectorAll("[data-testid=project-row]")].find((r) => r.innerText.includes("QuizCraft")).innerText')) ?? ''));
	noErrors(p, 'projects');
});

let exported = '';
await step('CSV export + import', async () => {
	await nav(p, '/projects');
	await p.click('[data-testid=export-csv]');
	const f = await waitDownload(/^Designer_Testing_Projects_.*\.csv$/);
	exported = f.bytes.toString('utf8').replace(/^\uFEFF/, '');
	check('CSV export: header row matches the sheet', exported.startsWith('Product name,Reference website link,Tester name,Tier,'));
	check('CSV export: 6 projects', exported.trim().split(/\r\n/).length === 7);
	await nav(p, '/settings');
	const sheet = [
		'Project Name,Tested By,Tier,Live Link,GitHub Repo,Frontend (stack + Drive link),Status,Checked,Date,Notes',
		'Recipe Box,Ravi,Tier 1,recipebox.vercel.app,https://github.com/ravi/recipebox,"React | https://drive.google.com/x",Done,Yes,05/10/2026,ignored',
		'"Chat, Inc",Ravi,Tier 2,https://chat.vercel.app,,Next.js,In progress,No,2026-10-07,',
		',,,,,,,,,'
	].join('\n');
	await p.setFile('[data-testid=csv-input]', 'Designer sheet.csv', sheet, 'text/csv');
	await p.waitFor('document.querySelector("[data-testid=import-preview]")', 5000);
	const mapping = (await p.text('[data-testid=import-mapping]')) ?? '';
	check('CSV import: auto column mapping', /Project Name\s*→\s*Product name/.test(mapping) && /Tested By\s*→\s*Tester name/.test(mapping) && /GitHub Repo\s*→\s*GitHub link/.test(mapping) && /Notes\s*→\s*ignored/.test(mapping), mapping.replace(/\s+/g, ' ').slice(0, 160));
	check('CSV import: preview 2 projects (blank row skipped)', /Import 2 projects/.test((await p.text('[data-testid=import-preview] h2')) ?? ''));
	await shot(p, 'd-import-preview');
	await p.click('[data-testid=import-confirm]');
	await sleep(300);
	await nav(p, '/projects');
	await p.fill('[data-testid=filter-tester]', 'Ravi');
	check('CSV import: projects added', (await p.count('[data-testid=project-row]')) === 2);
	const row = (await p.eval('[...document.querySelectorAll("[data-testid=project-row]")].find((r) => r.innerText.includes("Recipe Box")).innerText')) ?? '';
	check('CSV import: status, checked and DD/MM date parsed', /Completed/i.test(row) && /Checked/i.test(row) && /5 Oct 2026/.test(row), row.replace(/\s+/g, ' '));
	// re-import the app's own export: updates, no duplicates
	await nav(p, '/settings');
	await p.setFile('[data-testid=csv-input]', 'export.csv', exported, 'text/csv');
	await p.waitFor('document.querySelector("[data-testid=import-preview]")', 5000);
	await p.click('[data-testid=import-confirm]');
	await sleep(300);
	await nav(p, '/');
	check('CSV import: re-importing the export updates instead of duplicating', (await p.text('[data-testid=kpi-total] .v')) === '8');
	noErrors(p, 'csv');
});

await step('daily update', async () => {
	await nav(p, '/daily');
	await p.fill('[data-testid=daily-text]', 'Tested QuizCraft today');
	check('daily: live word counter', /3\s*\/\s*10 words/.test((await p.text('[data-testid=word-count]')) ?? ''));
	check('daily: save disabled under 10 words', await p.eval('document.querySelector("[data-testid=daily-save]").disabled'));
	const text = 'Tested QuizCraft with Designer today, logged two bugs, added pros and cons, and sent the PDF report.';
	await p.fill('[data-testid=daily-text]', text);
	check('daily: counter reaches minimum', /17\s*\/\s*10 words/.test((await p.text('[data-testid=word-count]')) ?? ''));
	await p.click('[data-testid=daily-save]');
	check('daily: saved', (await p.count('[data-testid=daily-saved]')) === 1);
	await p.click('[data-testid=daily-copy]');
	await sleep(200);
	check('daily: copy button', (await p.eval('window.__clip')) === text);
	check('daily: weekly summary includes today', ((await p.text('[data-testid=week-text]')) ?? '').includes('Tested QuizCraft with Designer today'));
	await p.click('[data-testid=week-copy]');
	await sleep(200);
	check('daily: copy weekly summary', (await p.eval('window.__clip')).startsWith('Weekly update - divyapriyadharshini'));
	await p.click('[data-testid=daily-prev]');
	await sleep(250);
	const prev = await p.eval('document.querySelector("[data-testid=daily-text]").value');
	check('daily: saved by date (yesterday is separate)', prev !== text);
	// Walk back week by week (the current date varies) until the sample week appears.
	let found = false;
	for (let i = 0; i < 8 && !found; i++) {
		found = /Fri 16 Oct 2026/.test((await p.text('[data-testid=week-text]')) ?? '');
		if (!found) {
			await p.click('[data-testid=week-prev]');
			await sleep(150);
		}
	}
	check('daily: earlier week shows sample entries', found);
	await p.goto(BASE + '/daily', { wait: 300 });
	await ready(p);
	check('daily: persists after reload', (await p.eval('document.querySelector("[data-testid=daily-text]").value')) === text);
	await shot(p, 'd-daily', true);
	noErrors(p, 'daily');
	await notFrozen(p, 'daily');
});

let backup = '';
await step('JSON backup + start fresh', async () => {
	await nav(p, '/settings');
	await p.click('[data-testid=json-export]');
	const f = await waitDownload(/^Designer_Testing_Hub_Backup_.*\.json$/);
	backup = f.bytes.toString('utf8');
	const j = JSON.parse(backup);
	check('backup: JSON export has everything', j.projects.length === 8 && j.bugs.length === 9 && j.feedback.length === 15 && j.daily.length === 5, `${j.projects.length}/${j.bugs.length}/${j.feedback.length}/${j.daily.length}`);
	await p.click('[data-testid=start-fresh]');
	await p.waitFor('document.querySelector("[data-testid=confirm-dialog]")', 3000);
	await p.click('[data-testid=confirm-ok]');
	await nav(p, '/');
	check('start fresh: dashboard empty state', (await p.count('[data-testid=dash-empty]')) === 1);
	await nav(p, '/projects');
	check('start fresh: projects empty state', (await p.count('[data-testid=projects-empty]')) === 1);
	await nav(p, '/bugs');
	check('start fresh: bugs empty state', (await p.count('[data-testid=bugs-empty]')) === 1);
	await nav(p, '/reports');
	check('start fresh: reports empty state', (await p.count('[data-testid=reports-empty]')) === 1);
	await shot(p, 'd-empty-reports');
	await nav(p, '/settings');
	await p.setFile('[data-testid=json-input]', 'backup.json', backup, 'application/json');
	await p.waitFor('document.querySelector("[data-testid=confirm-dialog]")', 3000);
	await p.click('[data-testid=confirm-ok]');
	await sleep(300);
	await nav(p, '/');
	check('backup: JSON import restores data', (await p.text('[data-testid=kpi-total] .v')) === '8');
	await p.setFile('[data-testid=json-input]', 'x.json', '{"nope":1}', 'application/json').catch(() => {});
	noErrors(p, 'settings');
});

await step('theme toggle + persistence', async () => {
	await nav(p, '/');
	await p.click('[data-testid=theme-toggle]');
	check('theme: dark mode on', (await p.eval('document.documentElement.dataset.theme')) === 'dark');
	await p.goto(BASE + '/bugs', { wait: 300 });
	await ready(p);
	check('theme: dark mode persists', (await p.eval('document.documentElement.dataset.theme')) === 'dark');
	const bg = await p.eval('getComputedStyle(document.body).backgroundColor');
	check('theme: black background', bg === 'rgb(10, 10, 10)', bg);
});
await p.close();

// ---------------------------------------------------------------------------
// 2. Every page: desktop / mobile / dark (sample data)
// ---------------------------------------------------------------------------
const MODES = [
	{ label: 'desktop', width: 1366, height: 900 },
	{ label: 'mobile', width: 390, height: 844, mobile: true },
	{ label: 'dark', width: 1366, height: 900, dark: true },
	{ label: 'mobile-dark', width: 390, height: 844, mobile: true, dark: true }
];
for (const m of MODES) {
	const q = await freshPage(m);
	for (const path of PAGES) {
		await step(`${m.label} ${path}`, async () => {
			await q.goto(BASE + path, { wait: 300 });
			await ready(q);
			const ov = await overflow(q);
			check(`${m.label} ${path}: no horizontal overflow`, ov <= 1, `${ov}px`);
			const theme = await q.eval('document.documentElement.dataset.theme');
			if (m.dark) check(`${m.label} ${path}: dark theme`, theme === 'dark');
			if (path === '/does-not-exist') check(`${m.label}: 404 page`, (await q.count('[data-testid=error-page]')) === 1);
			await shot(q, `${m.label}${path.replace(/\//g, '_') || '_home'}`, m.label !== 'desktop');
		});
	}
	if (m.mobile) {
		await step(`${m.label}: menu`, async () => {
			await q.goto(BASE + '/', { wait: 300 });
			await ready(q);
			check(`${m.label}: sidebar hidden`, !(await q.eval('document.querySelector("[data-testid=sidebar]").classList.contains("open")')));
			await q.click('[data-testid=menu-btn]');
			await sleep(300);
			check(`${m.label}: menu opens`, await q.eval('document.querySelector("[data-testid=sidebar]").classList.contains("open")'));
			await shot(q, `${m.label}-menu`);
			await q.click('[data-testid=nav-bugs]');
			await q.waitFor("location.pathname === '/bugs'", 3000);
			check(`${m.label}: nav link works and closes menu`, !(await q.eval('document.querySelector("[data-testid=sidebar]").classList.contains("open")')));
			// a modal on mobile
			await q.goto(BASE + '/projects/p-jobpilot', { wait: 300 });
			await ready(q);
			await q.click('[data-testid=add-bug]');
			await q.waitFor('document.querySelector("[data-testid=bug-modal]")', 3000);
			check(`${m.label}: bug form fits`, (await overflow(q)) <= 1);
			await shot(q, `${m.label}-bug-form`);
			await q.click('[data-testid=modal-close]');
		});
	}
	noErrors(q, m.label);
	await notFrozen(q, m.label);
	await q.close();
}

clearTimeout(watchdog);
await close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `, ${failed.length} FAILED` : ''}`);
if (existsSync(DL)) console.log(`downloads: ${readdirSync(DL).length} files in ${DL}`);
process.exit(failed.length ? 1 : 0);
