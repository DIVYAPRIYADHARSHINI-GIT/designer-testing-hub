import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReport, reportFileName } from '../../src/lib/report/index.ts';
import { buildReport } from '../../src/lib/report/build.ts';
import { cleanText, layoutRuns, renderPdf } from '../../src/lib/report/pdf.ts';
import { cleanReportRequest } from '../../src/lib/report/validate.ts';
import { sampleData } from '../../src/lib/data.ts';

const d = sampleData();
const pw = d.projects.find((p) => p.name === 'PowerWise')!;
const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1');

test('file names include kind, project and tester', () => {
	assert.equal(reportFileName('feedback', [pw], 'divyapriyadharshini', 'pdf'), 'Designer_Feedback_PowerWise_DIVYAPRIYADHARSHINI.pdf');
	assert.equal(reportFileName('bugs', d.projects, 'divyapriyadharshini', 'docx'), 'Designer_Bug_Report_5_Projects_DIVYAPRIYADHARSHINI.docx');
	assert.equal(reportFileName('compare', [d.projects[2]], 'Divya P', 'pdf'), 'Designer_vs_Codex_Cursor_Brain_Arena_DIVYA_P.pdf');
});

test('feedback PDF is a valid PDF with clickable links and the required fields', () => {
	const out = generateReport({ kind: 'feedback', format: 'pdf', projects: [pw], bugs: d.bugs, feedback: d.feedback, reporter: 'divyapriyadharshini', includeSummary: true });
	const s = latin1(out.bytes);
	assert.equal(out.fileName, 'Designer_Feedback_PowerWise_DIVYAPRIYADHARSHINI.pdf');
	assert.ok(s.startsWith('%PDF-1.4'));
	assert.ok(s.trimEnd().endsWith('%%EOF'));
	for (const t of ['Designer Feedback Report', 'Name', 'Project Title', 'Live Site', 'GitHub', 'Pros', 'Cons', 'Summary']) assert.ok(s.includes(`(${t})`) || s.includes(t), t);
	assert.ok(s.includes('/URI (https://powerwise-dusky.vercel.app)'));
	assert.ok(s.includes('/URI (https://github.com/DIVYAPRIYADHARSHINI-GIT/powerwise)'));
	// xref offsets point at "N 0 obj"
	const xref = Number(s.match(/startxref\n(\d+)/)![1]);
	assert.equal(s.slice(xref, xref + 4), 'xref');
	const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
	offs.forEach((o, i) => assert.ok(s.slice(o).startsWith(`${i + 1} 0 obj`), `obj ${i + 1}`));
});

test('summary table can be hidden', () => {
	const on = buildReport({ kind: 'feedback', format: 'pdf', projects: [pw], bugs: [], feedback: d.feedback, includeSummary: true });
	const off = buildReport({ kind: 'feedback', format: 'pdf', projects: [pw], bugs: [], feedback: d.feedback, includeSummary: false });
	assert.ok(on.blocks.some((b) => b.t === 'table'));
	assert.ok(!off.blocks.some((b) => b.t === 'table'));
});

test('bug report numbers bugs as "Bug N: title (project)" across selected projects', () => {
	const doc = buildReport({ kind: 'bugs', format: 'pdf', projects: d.projects, bugs: d.bugs, feedback: [], reporter: 'divyapriyadharshini' });
	const items = doc.blocks.filter((b) => b.t === 'item').map((b) => (b.t === 'item' ? b.runs.map((r) => r.text).join('') : ''));
	assert.equal(items.length, d.bugs.length);
	assert.equal(items[0], 'Bug 1: Browser test hung without a timeout (TrafficSense)');
	const meta = doc.blocks.find((b) => b.t === 'meta');
	assert.ok(meta && meta.t === 'meta' && meta.rows.some((r) => r.label === 'Reported by') && meta.rows.some((r) => r.label === 'Projects tested'));
});

test('bug report can filter by status', () => {
	const doc = buildReport({ kind: 'bugs', format: 'pdf', projects: d.projects, bugs: d.bugs, feedback: [], bugStatuses: ['Fixed'] });
	assert.equal(doc.blocks.filter((b) => b.t === 'item').length, d.bugs.filter((b) => b.status === 'Fixed').length);
});

test('comparative report has Pros and Cons tables with the right headers', () => {
	const doc = buildReport({ kind: 'compare', format: 'pdf', projects: d.projects, bugs: [], feedback: d.feedback });
	const tables = doc.blocks.filter((b) => b.t === 'table');
	assert.equal(tables.length, 2);
	assert.deepEqual(tables[0].t === 'table' && tables[0].headers, ['Pro', 'What Designer did', 'Compared with Codex / Cursor']);
	assert.deepEqual(tables[1].t === 'table' && tables[1].headers, ['Con', 'What happened in Designer', 'How Codex / Cursor handle it']);
	assert.equal(doc.title.startsWith('Designer vs Codex & Cursor'), true);
});

test('DOCX is a zip with document.xml and external hyperlinks', () => {
	const out = generateReport({ kind: 'compare', format: 'docx', projects: [d.projects[0]], bugs: [], feedback: d.feedback, reporter: 'x' });
	const s = latin1(out.bytes);
	assert.equal(s.slice(0, 2), 'PK');
	assert.ok(s.includes('word/document.xml'));
	assert.ok(s.includes('[Content_Types].xml'));
	assert.ok(s.includes('TargetMode="External"'));
	assert.ok(s.includes('https://trafficsense-brown.vercel.app'));
	assert.ok(s.includes('<w:hyperlink r:id="rIdL1"'));
});

test('text cleaning keeps Latin-1 and maps unsupported characters', () => {
	assert.equal(cleanText('café → ok ✓ 🚀 ₹100'), 'café -> ok (ok)  Rs 100');
	assert.equal(cleanText('“quotes” – dash'), '“quotes” – dash');
});

test('word wrap never exceeds the width, and long URLs are split', () => {
	const url = 'https://github.com/DIVYAPRIYADHARSHINI-GIT/a-very-long-repository-name-that-will-not-fit';
	const lines = layoutRuns([{ text: 'See ' }, { text: url, link: url }], 10, 150);
	assert.ok(lines.length >= 3);
	for (const l of lines) assert.ok(l.w <= 150.01, `line width ${l.w}`);
	assert.equal(lines.map((l) => l.frags.map((f) => f.text).join('')).join(''), 'See ' + url);
});

test('many bugs flow onto several pages with page numbers', () => {
	const bugs = Array.from({ length: 40 }, (_, i) => ({ ...d.bugs[0], id: 'b' + i, title: `Bug number ${i}`, createdAt: i }));
	const s = latin1(renderPdf(buildReport({ kind: 'bugs', format: 'pdf', projects: [d.projects[0]], bugs, feedback: [] })));
	const pages = Number(s.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)![1]);
	assert.ok(pages >= 4, `pages=${pages}`);
	assert.ok(s.includes(`(Page ${pages} of ${pages})`));
});

test('server validation rejects bad payloads and coerces fields', () => {
	assert.equal(typeof cleanReportRequest(null), 'string');
	assert.equal(typeof cleanReportRequest({ kind: 'nope', projects: [] }), 'string');
	assert.equal(typeof cleanReportRequest({ kind: 'bugs', projects: [] }), 'string');
	const r = cleanReportRequest({ kind: 'bugs', format: 'exe', projects: [{ id: 'x', name: 'X', status: 'weird' }], bugs: [{ id: 'b', projectId: 'x', severity: 'Critical' }] });
	assert.ok(typeof r !== 'string');
	assert.equal(r.format, 'pdf');
	assert.equal(r.projects[0].status, 'In progress');
	assert.equal(r.bugs[0].severity, 'Medium');
});
