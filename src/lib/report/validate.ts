// Server-side sanitising of report requests: coerce every field to the
// expected type and cap sizes so a bad payload can never crash a route.
import type { Bug, Feedback, Project } from '../types.ts';
import { BUG_STATUSES, SEVERITIES, STATUSES } from '../types.ts';
import type { ReportRequest } from './build.ts';

const str = (v: unknown, max = 8000) => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const arr = (v: unknown, max: number): Record<string, unknown>[] =>
	Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, max) : [];

export function cleanProject(o: Record<string, unknown>): Project {
	return {
		id: str(o.id, 80),
		name: str(o.name, 300),
		referenceUrl: str(o.referenceUrl, 2000),
		tester: str(o.tester, 200),
		tier: str(o.tier, 80),
		why: str(o.why),
		details: str(o.details),
		expected: str(o.expected),
		frontendStack: str(o.frontendStack, 500),
		frontendDrive: str(o.frontendDrive, 2000),
		backendStack: str(o.backendStack, 500),
		backendDrive: str(o.backendDrive, 2000),
		readmeUrl: str(o.readmeUrl, 2000),
		githubUrl: str(o.githubUrl, 2000),
		liveUrl: str(o.liveUrl, 2000),
		status: pick(o.status, STATUSES, 'In progress'),
		checked: o.checked === true,
		date: str(o.date, 10),
		createdAt: num(o.createdAt),
		updatedAt: num(o.updatedAt)
	};
}

export function cleanBug(o: Record<string, unknown>): Bug {
	return {
		id: str(o.id, 80),
		projectId: str(o.projectId, 80),
		title: str(o.title, 500),
		steps: str(o.steps),
		expected: str(o.expected),
		actual: str(o.actual),
		severity: pick(o.severity, SEVERITIES, 'Medium'),
		screenshotUrl: str(o.screenshotUrl, 2000),
		videoUrl: str(o.videoUrl, 2000),
		chatUrl: str(o.chatUrl, 2000),
		status: pick(o.status, BUG_STATUSES, 'Open'),
		createdAt: num(o.createdAt),
		updatedAt: num(o.updatedAt)
	};
}

export function cleanFeedback(o: Record<string, unknown>): Feedback {
	return {
		id: str(o.id, 80),
		projectId: str(o.projectId, 80),
		kind: o.kind === 'con' ? 'con' : 'pro',
		title: str(o.title, 500),
		description: str(o.description),
		chatUrl: str(o.chatUrl, 2000),
		mediaUrl: str(o.mediaUrl, 2000),
		compared: str(o.compared, 4000),
		createdAt: num(o.createdAt),
		updatedAt: num(o.updatedAt)
	};
}

export function cleanReportRequest(body: unknown): ReportRequest | string {
	if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
	const o = body as Record<string, unknown>;
	const kind = pick(o.kind, ['feedback', 'bugs', 'compare'] as const, 'feedback');
	if (o.kind !== kind) return 'Unknown report type. Use feedback, bugs or compare.';
	const format = pick(o.format, ['pdf', 'docx'] as const, 'pdf');
	const projects = arr(o.projects, 200).map(cleanProject).filter((p) => p.id && p.name);
	if (!projects.length) return 'Select at least one project.';
	return {
		kind,
		format,
		projects,
		bugs: arr(o.bugs, 2000).map(cleanBug),
		feedback: arr(o.feedback, 2000).map(cleanFeedback),
		reporter: str(o.reporter, 200),
		includeSummary: o.includeSummary === true,
		bugStatuses: Array.isArray(o.bugStatuses) ? o.bugStatuses.filter((s): s is Bug['status'] => BUG_STATUSES.includes(s as Bug['status'])) : undefined,
		date: str(o.date, 10)
	};
}
