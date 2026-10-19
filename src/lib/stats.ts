// Dashboard numbers, computed once per data change via $derived.
import type { AppData } from './types.ts';
import { SEVERITIES } from './types.ts';

export function dashboardStats(d: Pick<AppData, 'projects' | 'bugs' | 'feedback'>) {
	const completed = d.projects.filter((p) => p.status === 'Completed').length;
	const checked = d.projects.filter((p) => p.checked).length;
	const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, d.bugs.filter((b) => b.severity === s).length])) as Record<(typeof SEVERITIES)[number], number>;
	const openBugs = d.bugs.filter((b) => b.status !== 'Fixed').length;
	const pros = d.feedback.filter((f) => f.kind === 'pro').length;
	const cons = d.feedback.length - pros;

	const perProject = d.projects
		.map((p) => {
			const bugs = d.bugs.filter((b) => b.projectId === p.id);
			return { id: p.id, name: p.name, High: bugs.filter((b) => b.severity === 'High').length, Medium: bugs.filter((b) => b.severity === 'Medium').length, Low: bugs.filter((b) => b.severity === 'Low').length, total: bugs.length };
		})
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

	const testerMap = new Map<string, { tester: string; completed: number; inProgress: number; bugs: number }>();
	for (const p of d.projects) {
		const key = p.tester.trim() || 'Unassigned';
		const t = testerMap.get(key.toLowerCase()) ?? { tester: key, completed: 0, inProgress: 0, bugs: 0 };
		if (p.status === 'Completed') t.completed++;
		else t.inProgress++;
		t.bugs += d.bugs.filter((b) => b.projectId === p.id).length;
		testerMap.set(key.toLowerCase(), t);
	}
	const testers = [...testerMap.values()].sort((a, b) => b.completed + b.inProgress - (a.completed + a.inProgress) || a.tester.localeCompare(b.tester));

	return {
		total: d.projects.length,
		completed,
		inProgress: d.projects.length - completed,
		checked,
		bugs: d.bugs.length,
		openBugs,
		bySeverity,
		pros,
		cons,
		perProject,
		testers
	};
}
