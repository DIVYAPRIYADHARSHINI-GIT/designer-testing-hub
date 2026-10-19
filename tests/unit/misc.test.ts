import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupBugs, keywords } from '../../src/lib/group.ts';
import { weekSummary, MIN_WORDS } from '../../src/lib/daily.ts';
import { normalizeData, sampleData } from '../../src/lib/data.ts';
import { dashboardStats } from '../../src/lib/stats.ts';
import { fileSafe, isValidUrl, normalizeUrl, weekStart, wordCount } from '../../src/lib/utils.ts';

test('link validation', () => {
	for (const ok of ['', 'https://a.com', 'http://localhost:5173/x', 'github.com/me/repo', 'www.example.org']) assert.ok(isValidUrl(ok), ok);
	for (const bad of ['hello', 'ftp://a.com', 'https://', 'not a link.com', 'javascript:alert(1)']) assert.ok(!isValidUrl(bad), bad);
	assert.equal(normalizeUrl('github.com/me'), 'https://github.com/me');
	assert.equal(normalizeUrl(' https://x.io '), 'https://x.io');
});

test('word counter counts words, not punctuation or emoji', () => {
	assert.equal(wordCount(''), 0);
	assert.equal(wordCount('   '), 0);
	assert.equal(wordCount('Tested PowerWise, logged 2 bugs!'), 5);
	assert.equal(wordCount("don't re-test -- ok 🚀"), 3);
	assert.equal(wordCount('தமிழ் சோதனை'), 2);
	assert.equal(MIN_WORDS, 10);
});

test('weekly summary covers Monday to Sunday', () => {
	assert.equal(weekStart('2026-10-19'), '2026-10-19'); // Monday
	assert.equal(weekStart('2026-10-25'), '2026-10-19'); // Sunday
	const d = sampleData();
	const w = weekSummary(d.daily, '2026-10-16', 'divya');
	assert.equal(w.start, '2026-10-12');
	assert.equal(w.end, '2026-10-18');
	assert.equal(w.written, 4);
	assert.ok(w.text.startsWith('Weekly update - divya (12 Oct 2026 to 18 Oct 2026)'));
	assert.ok(w.text.includes('Fri 16 Oct 2026:'));
});

test('similar bug titles are grouped as most common', () => {
	assert.deepEqual(keywords('Browser tests hang with no timeout'), ['browser', 'test', 'hung', 'timeout']);
	const groups = groupBugs(sampleData().bugs);
	const top = groups.slice(0, 2).map((g) => g.count);
	assert.deepEqual(top, [2, 2]);
	const titles = groups.slice(0, 2).map((g) => g.title).sort();
	assert.ok(titles.some((t) => /Vercel GitHub App/.test(t)));
	assert.ok(titles.some((t) => /hung|hang/.test(t)));
	assert.equal(groups.reduce((s, g) => s + g.count, 0), sampleData().bugs.length);
});

test('sample data matches the brief', () => {
	const d = sampleData();
	assert.deepEqual(
		d.projects.map((p) => p.name),
		['TrafficSense', 'SkyFare', 'Brain Arena', 'JobPilot', 'PowerWise']
	);
	assert.ok(d.projects.every((p) => p.tester === 'divyapriyadharshini'));
	assert.ok(d.projects.every((p) => p.githubUrl.startsWith('https://github.com/DIVYAPRIYADHARSHINI-GIT/')));
	assert.equal(d.projects[0].liveUrl, 'https://trafficsense-brown.vercel.app');
	assert.ok(d.bugs.length >= 3 && d.feedback.some((f) => f.kind === 'pro') && d.feedback.some((f) => f.kind === 'con'));
});

test('backup normalisation drops orphans and rejects junk', () => {
	assert.equal(normalizeData(null), null);
	assert.equal(normalizeData({ foo: 1 }), null);
	const d = sampleData();
	const n = normalizeData({ ...d, bugs: [...d.bugs, { id: 'orphan', projectId: 'missing', title: 'x' }] });
	assert.ok(n);
	assert.equal(n.bugs.length, d.bugs.length);
	assert.equal(n.projects.length, 5);
	assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(d))), d);
});

test('dashboard stats', () => {
	const s = dashboardStats(sampleData());
	assert.equal(s.total, 5);
	assert.equal(s.completed, 4);
	assert.equal(s.inProgress, 1);
	assert.equal(s.bySeverity.High + s.bySeverity.Medium + s.bySeverity.Low, s.bugs);
	assert.equal(s.testers.length, 1);
	assert.equal(s.testers[0].completed, 4);
});

test('fileSafe', () => {
	assert.equal(fileSafe('Brain Arena!'), 'Brain_Arena');
	assert.equal(fileSafe('Café / Bar'), 'Cafe_Bar');
	assert.equal(fileSafe('***'), 'Untitled');
});
