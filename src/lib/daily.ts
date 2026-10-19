// Daily update helpers: minimum word count and the weekly summary text.
import type { DailyEntry } from './types.ts';
import { addDays, formatDate, weekday, weekStart, wordCount } from './utils.ts';

export const MIN_WORDS = 10;

export interface WeekSummary {
	start: string;
	end: string;
	days: Array<{ date: string; entry?: DailyEntry }>;
	written: number;
	words: number;
	text: string;
}

export function weekSummary(entries: DailyEntry[], anyDate: string, tester = ''): WeekSummary {
	const start = weekStart(anyDate);
	const end = addDays(start, 6);
	const map = new Map(entries.map((e) => [e.date, e]));
	const days = Array.from({ length: 7 }, (_, i) => {
		const date = addDays(start, i);
		return { date, entry: map.get(date) };
	});
	const withText = days.filter((d) => d.entry?.text.trim());
	const words = withText.reduce((s, d) => s + wordCount(d.entry!.text), 0);
	const head = `Weekly update${tester ? ` - ${tester}` : ''} (${formatDate(start)} to ${formatDate(end)})`;
	const body = withText.map((d) => `${weekday(d.date)} ${formatDate(d.date)}: ${d.entry!.text.trim().replace(/\s*\n+\s*/g, ' ')}`);
	const text = [head, '', ...(body.length ? body : ['No updates written this week.'])].join('\n');
	return { start, end, days, written: withText.length, words, text };
}
