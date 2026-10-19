import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importCsv, mapHeaders, parseCsv, parseDate, projectToTsv, projectsToCsv, SHEET_HEADERS, splitStackLink } from '../../src/lib/csv.ts';
import { sampleData } from '../../src/lib/data.ts';

test('parseCsv handles quotes, escaped quotes, commas and multi-line cells', () => {
	const rows = parseCsv('a,b,c\r\n"x, y","he said ""hi""","line1\nline2"\n');
	assert.deepEqual(rows, [
		['a', 'b', 'c'],
		['x, y', 'he said "hi"', 'line1\nline2']
	]);
});

test('parseCsv reads TSV pasted from Sheets and strips the BOM', () => {
	assert.deepEqual(parseCsv('\uFEFFName\tTester\nApp\tme\n'), [
		['Name', 'Tester'],
		['App', 'me']
	]);
});

test('headers from the team sheet map to every field', () => {
	const map = mapHeaders(SHEET_HEADERS).map((c) => c.field);
	assert.deepEqual(map, ['name', 'referenceUrl', 'tester', 'tier', 'why', 'details', 'expected', 'frontend', 'backend', 'readmeUrl', 'githubUrl', 'liveUrl', 'status', 'checked', 'date']);
});

test('header aliases and split stack/link columns', () => {
	const map = mapHeaders(['Project', 'Tested by', 'Live URL', 'Repo', 'Frontend Stack', 'Frontend Drive Link', 'Backend tech', 'Backend folder', 'Verified?', 'Random']).map((c) => c.field);
	assert.deepEqual(map, ['name', 'tester', 'liveUrl', 'githubUrl', 'frontendStack', 'frontendDrive', 'backendStack', 'backendDrive', 'checked', null]);
});

test('splitStackLink separates the stack from the Drive link', () => {
	assert.deepEqual(splitStackLink('React + Tailwind | https://drive.google.com/drive/folders/abc'), { stack: 'React + Tailwind', link: 'https://drive.google.com/drive/folders/abc' });
	assert.deepEqual(splitStackLink('FastAPI'), { stack: 'FastAPI', link: '' });
	assert.deepEqual(splitStackLink('https://drive.google.com/x'), { stack: '', link: 'https://drive.google.com/x' });
});

test('parseDate accepts common sheet formats', () => {
	assert.equal(parseDate('2026-10-19'), '2026-10-19');
	assert.equal(parseDate('19/10/2026'), '2026-10-19');
	assert.equal(parseDate('10/19/2026'), '2026-10-19');
	assert.equal(parseDate('19 Oct 2026'), '2026-10-19');
	assert.equal(parseDate('Oct 19, 2026'), '2026-10-19');
	assert.equal(parseDate('soon'), '');
});

test('CSV export -> import round-trips every project field', () => {
	const { projects } = sampleData();
	const csv = projectsToCsv(projects);
	const res = importCsv(csv);
	assert.equal(res.drafts.length, projects.length);
	assert.equal(res.warnings.length, 0);
	for (let i = 0; i < projects.length; i++) {
		const { id: _i, createdAt: _c, updatedAt: _u, ...want } = projects[i];
		assert.deepEqual(res.drafts[i], want);
	}
});

test('import skips rows without a product name and normalizes links/status/checked', () => {
	const csv = 'Product name,Status,Checked,Live link\nAlpha,Done,yes,alpha.vercel.app\n,In progress,no,\nBeta,wip,✓,\n';
	const res = importCsv(csv, 'tester1');
	assert.equal(res.drafts.length, 2);
	assert.equal(res.skipped, 1);
	assert.equal(res.drafts[0].status, 'Completed');
	assert.equal(res.drafts[0].checked, true);
	assert.equal(res.drafts[0].liveUrl, 'https://alpha.vercel.app');
	assert.equal(res.drafts[0].tester, 'tester1');
	assert.equal(res.drafts[1].status, 'In progress');
	assert.equal(res.drafts[1].checked, true);
	assert.deepEqual(res.mapped.sort(), ['checked', 'liveUrl', 'name', 'status']);
});

test('copy row is 15 tab-separated cells with no line breaks', () => {
	const p = sampleData().projects[0];
	const tsv = projectToTsv({ ...p, details: 'line 1\nline 2\twith tab' });
	const cells = tsv.split('\t');
	assert.equal(cells.length, 15);
	assert.ok(!/\n/.test(tsv));
	assert.equal(cells[0], 'TrafficSense');
	assert.equal(cells[13], 'Yes');
});
