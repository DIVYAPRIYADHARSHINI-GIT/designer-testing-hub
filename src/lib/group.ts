// "Most common bugs": groups bugs whose titles share most of their key words
// (stop words removed, light stemming), e.g. "Browser test hung without
// timeout" and "Headless browser tests hang with no timeout".
import type { Bug, Severity } from './types.ts';

const STOP = new Set(
	'a an the to of in on for and or is was are were be been not no with without after before when while by at from it its this that did does do doesnt didnt cant cannot wont too very new into than then so but if as up out has have had only just also our my your'.split(' ')
);

const STEM_FIX: Record<string, string> = { hang: 'hung', hangs: 'hung', hanging: 'hung', froze: 'freez', frozen: 'freez', broke: 'break', broken: 'break', fails: 'fail', failed: 'fail', failing: 'fail' };

export function keywords(title: string): string[] {
	const words = title
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.split(/\s+/)
		.filter((w) => w && !STOP.has(w));
	const out = words.map((w) => {
		if (STEM_FIX[w]) return STEM_FIX[w];
		if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
		if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
		if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
		if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
		return w;
	});
	return [...new Set(out)];
}

export function similar(a: string[], b: string[]): boolean {
	if (!a.length || !b.length) return false;
	const sb = new Set(b);
	const overlap = a.filter((w) => sb.has(w)).length;
	const union = new Set([...a, ...b]).size;
	return overlap / union >= 0.5 || (overlap >= 2 && overlap / Math.min(a.length, b.length) >= 0.6);
}

export interface BugGroup {
	title: string;
	count: number;
	bugs: Bug[];
	projectIds: string[];
	worst: Severity;
}

const RANK: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };

export function groupBugs(bugs: Bug[]): BugGroup[] {
	const groups: Array<{ keys: string[]; bugs: Bug[] }> = [];
	for (const bug of bugs) {
		const k = keywords(bug.title);
		const g = groups.find((x) => similar(x.keys, k));
		if (g) {
			g.bugs.push(bug);
			g.keys = [...new Set([...g.keys, ...k])].slice(0, 12);
		} else groups.push({ keys: k, bugs: [bug] });
	}
	return groups
		.map((g) => {
			const shortest = [...g.bugs].sort((a, b) => a.title.length - b.title.length)[0];
			return {
				title: shortest.title,
				count: g.bugs.length,
				bugs: g.bugs,
				projectIds: [...new Set(g.bugs.map((b) => b.projectId))],
				worst: g.bugs.reduce<Severity>((w, b) => (RANK[b.severity] > RANK[w] ? b.severity : w), 'Low')
			};
		})
		.sort((a, b) => b.count - a.count || RANK[b.worst] - RANK[a.worst] || a.title.localeCompare(b.title));
}
