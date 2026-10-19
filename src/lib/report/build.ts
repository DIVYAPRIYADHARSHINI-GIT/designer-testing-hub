// Builds the three one-click reports from app data:
//  1. Designer Feedback Report (per project, optional summary table)
//  2. Designer Bug Report (one or more projects)
//  3. Designer vs Codex & Cursor comparative report (one or more projects)
// File names: Designer_Feedback_PowerWise_DIVYAPRIYADHARSHINI.pdf etc.
import type { Bug, Feedback, Project } from '../types.ts';
import { SEVERITIES } from '../types.ts';
import { fileSafe, formatDate, plural, todayISO } from '../utils.ts';
import type { Block, ReportDoc, Run } from './doc.ts';

export type ReportKind = 'feedback' | 'bugs' | 'compare';
export type ReportFormat = 'pdf' | 'docx';

export interface ReportRequest {
	kind: ReportKind;
	format: ReportFormat;
	projects: Project[];
	bugs: Bug[];
	feedback: Feedback[];
	/** Shown as "Name" / "Reported by"; falls back to the projects' tester. */
	reporter?: string;
	/** Feedback report: include the pros/cons summary table. */
	includeSummary?: boolean;
	/** Bug report: which bug statuses to include (default all). */
	bugStatuses?: Bug['status'][];
	/** YYYY-MM-DD shown on the report (default today). */
	date?: string;
}

const KIND_PREFIX: Record<ReportKind, string> = {
	feedback: 'Designer_Feedback',
	bugs: 'Designer_Bug_Report',
	compare: 'Designer_vs_Codex_Cursor'
};

export function reporterOf(req: Pick<ReportRequest, 'reporter' | 'projects'>): string {
	const r = (req.reporter ?? '').trim();
	if (r) return r;
	const testers = [...new Set(req.projects.map((p) => p.tester.trim()).filter(Boolean))];
	return testers.join(', ') || 'Tester';
}

export function reportFileName(kind: ReportKind, projects: Pick<Project, 'name'>[], reporter: string, format: ReportFormat): string {
	const proj = projects.length === 1 ? fileSafe(projects[0].name) : projects.length ? `${projects.length}_Projects` : 'No_Project';
	const tester = fileSafe(reporter.split(',')[0]).toUpperCase();
	return `${KIND_PREFIX[kind]}_${proj}_${tester}.${format}`;
}

const linkRun = (url: string, text = url): Run => ({ text, link: url });
const linkOrDash = (url: string): Run[] => (url ? [linkRun(url)] : [{ text: 'Not provided', tone: 'muted' }]);

/** "Evidence: Chat link · Screenshot" as clickable runs (empty when no links). */
function evidenceRuns(links: Array<[string, string]>): Run[] {
	const present = links.filter(([, u]) => u && u.trim());
	if (!present.length) return [];
	const runs: Run[] = [{ text: present.length > 1 ? 'Evidence: ' : 'Evidence: ', bold: true }];
	present.forEach(([label, url], i) => {
		if (i) runs.push({ text: '  |  ', tone: 'muted' });
		runs.push(linkRun(url, label));
		runs.push({ text: ` (${url})`, tone: 'muted' });
	});
	return runs;
}

const feedbackEvidence = (f: Feedback) =>
	evidenceRuns([
		['Chat link', f.chatUrl],
		['Screenshot / video', f.mediaUrl]
	]);

const bugEvidence = (b: Bug) =>
	evidenceRuns([
		['Screenshot', b.screenshotUrl],
		['Video', b.videoUrl],
		['Chat link', b.chatUrl]
	]);

function textOr(s: string, fallback = 'Not provided'): Run[] {
	return s.trim() ? [{ text: s.trim() }] : [{ text: fallback, tone: 'muted' }];
}

function sorted<T extends { createdAt: number }>(xs: T[]): T[] {
	return [...xs].sort((a, b) => a.createdAt - b.createdAt);
}

function feedbackReport(req: ReportRequest, reporter: string, date: string): ReportDoc {
	const blocks: Block[] = [];
	req.projects.forEach((p, pi) => {
		if (pi) blocks.push({ t: 'pagebreak' });
		const items = sorted(req.feedback.filter((f) => f.projectId === p.id));
		const pros = items.filter((f) => f.kind === 'pro');
		const cons = items.filter((f) => f.kind === 'con');
		blocks.push({ t: 'title', text: 'Designer Feedback Report', subtitle: `Generated ${formatDate(date)}` });
		blocks.push({
			t: 'meta',
			rows: [
				{ label: 'Name', value: [{ text: reporter }] },
				{ label: 'Project Title', value: [{ text: p.name }] },
				{ label: 'Live Site', value: linkOrDash(p.liveUrl) },
				{ label: 'GitHub', value: linkOrDash(p.githubUrl) }
			]
		});
		if (req.includeSummary) {
			blocks.push({ t: 'heading', text: 'Summary' });
			const n = Math.max(pros.length, cons.length, 1);
			blocks.push({
				t: 'table',
				headers: [`Pros (${pros.length})`, `Cons (${cons.length})`],
				widths: [1, 1],
				rows: Array.from({ length: n }, (_, i) => [pros[i]?.title ?? (i === 0 ? '-' : ''), cons[i]?.title ?? (i === 0 ? '-' : '')])
			});
		}
		for (const [label, list] of [
			['Pros', pros],
			['Cons', cons]
		] as const) {
			blocks.push({ t: 'heading', text: label });
			if (!list.length) blocks.push({ t: 'note', text: `No ${label.toLowerCase()} recorded for this project.` });
			list.forEach((f, i) => {
				blocks.push({ t: 'item', runs: [{ text: `${i + 1}. ${f.title.trim() || 'Untitled'}`, bold: true }] });
				if (f.description.trim()) blocks.push({ t: 'para', runs: [{ text: f.description.trim() }] });
				const ev = feedbackEvidence(f);
				if (ev.length) blocks.push({ t: 'para', runs: ev });
			});
		}
	});
	const one = req.projects.length === 1 ? req.projects[0].name : `${req.projects.length} projects`;
	return { title: `Designer Feedback Report - ${one}`, author: reporter, fileBase: '', footer: `Designer Feedback Report  |  ${one}  |  ${reporter}`, blocks };
}

function bugReport(req: ReportRequest, reporter: string, date: string): ReportDoc {
	const statuses = req.bugStatuses?.length ? req.bugStatuses : null;
	const order = new Map(req.projects.map((p, i) => [p.id, i]));
	const bugs = sorted(req.bugs.filter((b) => order.has(b.projectId) && (!statuses || statuses.includes(b.status)))).sort(
		(a, b) => order.get(a.projectId)! - order.get(b.projectId)!
	);
	const name = (id: string) => req.projects.find((p) => p.id === id)?.name ?? 'Unknown project';
	const blocks: Block[] = [{ t: 'title', text: 'Designer Bug Report', subtitle: `Generated ${formatDate(date)}` }];
	const counts = SEVERITIES.map((s) => `${bugs.filter((b) => b.severity === s).length} ${s}`).join(', ');
	blocks.push({
		t: 'meta',
		rows: [
			{ label: 'Reported by', value: [{ text: reporter }] },
			{ label: 'Projects tested', value: [{ text: req.projects.map((p) => p.name).join(', ') || '-' }] },
			{ label: 'Total bugs', value: [{ text: `${bugs.length}${bugs.length ? ` (${counts})` : ''}` }] }
		]
	});
	const links = req.projects.filter((p) => p.liveUrl || p.githubUrl);
	if (links.length) {
		blocks.push({
			t: 'table',
			headers: ['Project', 'Live site', 'GitHub', 'Bugs'],
			widths: [2.2, 3.4, 3.4, 0.9],
			rows: links.map((p) => [
				p.name,
				p.liveUrl ? [linkRun(p.liveUrl)] : '-',
				p.githubUrl ? [linkRun(p.githubUrl)] : '-',
				String(bugs.filter((b) => b.projectId === p.id).length)
			])
		});
	}
	blocks.push({ t: 'heading', text: 'Bugs' });
	if (!bugs.length) blocks.push({ t: 'note', text: 'No bugs recorded for the selected project(s).' });
	bugs.forEach((b, i) => {
		const tone = b.severity === 'High' ? 'high' : b.severity === 'Medium' ? 'medium' : 'low';
		blocks.push({ t: 'item', keep: 120, runs: [{ text: `Bug ${i + 1}: ${b.title.trim() || 'Untitled'} (${name(b.projectId)})`, bold: true }] });
		blocks.push({
			t: 'para',
			runs: [
				{ text: 'Severity: ', bold: true },
				{ text: b.severity, bold: true, tone },
				{ text: '   |   ', tone: 'muted' },
				{ text: 'Status: ', bold: true },
				{ text: b.status }
			]
		});
		blocks.push({ t: 'para', runs: [{ text: 'Steps: ', bold: true }, ...textOr(b.steps)] });
		blocks.push({ t: 'para', runs: [{ text: 'Expected: ', bold: true }, ...textOr(b.expected)] });
		blocks.push({ t: 'para', runs: [{ text: 'Actual: ', bold: true }, ...textOr(b.actual)] });
		const ev = bugEvidence(b);
		blocks.push({ t: 'para', runs: ev.length ? ev : [{ text: 'Evidence: ', bold: true }, { text: 'None attached', tone: 'muted' }] });
	});
	const one = req.projects.length === 1 ? req.projects[0].name : `${req.projects.length} projects`;
	return { title: `Designer Bug Report - ${one}`, author: reporter, fileBase: '', footer: `Designer Bug Report  |  ${one}  |  ${reporter}`, blocks };
}

function compareReport(req: ReportRequest, reporter: string, date: string): ReportDoc {
	const ids = new Set(req.projects.map((p) => p.id));
	const items = sorted(req.feedback.filter((f) => ids.has(f.projectId)));
	const multi = req.projects.length > 1;
	const name = (id: string) => req.projects.find((p) => p.id === id)?.name ?? '';
	const what = (f: Feedback): Run[] => {
		const runs: Run[] = [];
		if (f.description.trim()) runs.push({ text: f.description.trim() });
		const link = f.chatUrl || f.mediaUrl;
		if (link) runs.push({ text: runs.length ? '\n' : '' }, linkRun(link, 'Evidence'));
		return runs.length ? runs : [{ text: '-', tone: 'muted' }];
	};
	const titleCell = (f: Feedback): Run[] => [{ text: f.title.trim() || 'Untitled', bold: true }, ...(multi ? [{ text: `\n${name(f.projectId)}`, tone: 'muted' as const }] : [])];
	const comparedCell = (f: Feedback): Run[] => (f.compared.trim() ? [{ text: f.compared.trim() }] : [{ text: 'Not compared yet', tone: 'muted' }]);
	const pros = items.filter((f) => f.kind === 'pro');
	const cons = items.filter((f) => f.kind === 'con');
	const blocks: Block[] = [
		{ t: 'title', text: 'Designer vs Codex & Cursor', subtitle: `Comparative report  |  Generated ${formatDate(date)}` },
		{
			t: 'meta',
			rows: [
				{ label: 'Name', value: [{ text: reporter }] },
				{ label: multi ? 'Projects' : 'Project Title', value: [{ text: req.projects.map((p) => p.name).join(', ') || '-' }] },
				...(multi
					? []
					: [
							{ label: 'Live Site', value: linkOrDash(req.projects[0]?.liveUrl ?? '') },
							{ label: 'GitHub', value: linkOrDash(req.projects[0]?.githubUrl ?? '') }
						])
			]
		},
		{ t: 'heading', text: `Pros (${pros.length})` },
		pros.length
			? { t: 'table', headers: ['Pro', 'What Designer did', 'Compared with Codex / Cursor'], widths: [2.2, 4, 3.6], rows: pros.map((f) => [titleCell(f), what(f), comparedCell(f)]) }
			: { t: 'note', text: 'No pros recorded.' },
		{ t: 'heading', text: `Cons (${cons.length})` },
		cons.length
			? { t: 'table', headers: ['Con', 'What happened in Designer', 'How Codex / Cursor handle it'], widths: [2.2, 4, 3.6], rows: cons.map((f) => [titleCell(f), what(f), comparedCell(f)]) }
			: { t: 'note', text: 'No cons recorded.' }
	];
	const compared = items.filter((f) => f.compared.trim()).length;
	blocks.push({ t: 'note', text: `${plural(compared, 'item')} of ${items.length} include a Codex / Cursor comparison. Comparisons are the tester's own observations.` });
	const one = req.projects.length === 1 ? req.projects[0].name : `${req.projects.length} projects`;
	return { title: `Designer vs Codex & Cursor - ${one}`, author: reporter, fileBase: '', footer: `Designer vs Codex & Cursor  |  ${one}  |  ${reporter}`, blocks };
}

export function buildReport(req: ReportRequest): ReportDoc {
	const reporter = reporterOf(req);
	const date = req.date && /^\d{4}-\d{2}-\d{2}$/.test(req.date) ? req.date : todayISO();
	const doc = req.kind === 'feedback' ? feedbackReport(req, reporter, date) : req.kind === 'bugs' ? bugReport(req, reporter, date) : compareReport(req, reporter, date);
	doc.fileBase = reportFileName(req.kind, req.projects, reporter, req.format).replace(/\.(pdf|docx)$/, '');
	return doc;
}
