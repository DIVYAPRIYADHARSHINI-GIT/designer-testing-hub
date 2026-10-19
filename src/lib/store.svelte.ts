// Single source of truth, persisted to localStorage on every explicit
// mutation (no autosave effects, so no reactive loops). Cross-tab changes
// are picked up through the `storage` event.
import type { AppData, Bug, BugDraft, Feedback, FeedbackDraft, Project, ProjectDraft } from './types.ts';
import { emptyData } from './types.ts';
import { normalizeData, sampleData } from './data.ts';
import { ui } from './ui.svelte.ts';
import { uid } from './utils.ts';

export const STORAGE_KEY = 'dth.data.v1';

class Store {
	data = $state<AppData>(emptyData());
	ready = $state(false);

	get projects() {
		return this.data.projects;
	}
	get bugs() {
		return this.data.bugs;
	}
	get feedback() {
		return this.data.feedback;
	}
	get tester() {
		return this.data.settings.tester;
	}

	load() {
		let next: AppData | null = null;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) next = normalizeData(JSON.parse(raw));
			if (raw && !next) ui.toast('Saved data was unreadable, so sample data was loaded instead.', 'err');
		} catch {
			next = null;
		}
		this.data = next ?? sampleData();
		if (!next) this.persist(true);
		this.ready = true;
	}

	/** Re-read after another tab changed the data. */
	reloadFromStorage(raw: string | null) {
		if (!raw) return;
		try {
			const next = normalizeData(JSON.parse(raw));
			if (next) this.data = next;
		} catch {
			/* ignore partial writes */
		}
	}

	persist(silent = false): boolean {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.data)));
			return true;
		} catch {
			if (!silent) ui.toast('Could not save: browser storage is full or blocked. Export a JSON backup.', 'err');
			return false;
		}
	}

	snapshot(): AppData {
		return $state.snapshot(this.data) as AppData;
	}

	// ---------- projects ----------
	projectById(id: string): Project | undefined {
		return this.data.projects.find((p) => p.id === id);
	}
	addProject(d: ProjectDraft): string {
		const now = Date.now();
		const id = uid('p-');
		this.data.projects.push({ ...d, id, createdAt: now, updatedAt: now });
		this.persist();
		return id;
	}
	updateProject(id: string, d: Partial<ProjectDraft>) {
		const p = this.projectById(id);
		if (!p) return;
		Object.assign(p, d, { updatedAt: Date.now() });
		this.persist();
	}
	deleteProject(id: string) {
		this.data.projects = this.data.projects.filter((p) => p.id !== id);
		this.data.bugs = this.data.bugs.filter((b) => b.projectId !== id);
		this.data.feedback = this.data.feedback.filter((f) => f.projectId !== id);
		this.persist();
	}

	/** CSV import: adds new projects, or updates ones with the same name + tester (only mapped columns). */
	importDrafts(drafts: ProjectDraft[], updateExisting: boolean, mapped?: Array<keyof ProjectDraft>): { added: number; updated: number } {
		const allowed = mapped ? new Set<string>(mapped) : null;
		let added = 0;
		let updated = 0;
		const now = Date.now();
		const key = (name: string, tester: string) => `${name.trim().toLowerCase()}|${tester.trim().toLowerCase()}`;
		for (const d of drafts) {
			const existing = updateExisting ? this.data.projects.find((p) => key(p.name, p.tester) === key(d.name, d.tester)) : undefined;
			if (existing) {
				for (const [k, v] of Object.entries(d) as Array<[keyof ProjectDraft, ProjectDraft[keyof ProjectDraft]]>) {
					if (allowed && !allowed.has(k)) continue;
					// Only overwrite with non-empty sheet cells, so blank cells never wipe app data.
					if (typeof v === 'string' ? v.trim() : true) (existing as unknown as Record<string, unknown>)[k] = v;
				}
				existing.updatedAt = now;
				updated++;
			} else {
				this.data.projects.push({ ...d, id: uid('p-'), createdAt: now + added, updatedAt: now + added });
				added++;
			}
		}
		this.persist();
		return { added, updated };
	}

	// ---------- bugs ----------
	bugsFor(projectId: string): Bug[] {
		return this.data.bugs.filter((b) => b.projectId === projectId);
	}
	addBug(d: BugDraft) {
		const now = Date.now();
		this.data.bugs.push({ ...d, id: uid('b-'), createdAt: now, updatedAt: now });
		this.persist();
	}
	updateBug(id: string, d: Partial<BugDraft>) {
		const b = this.data.bugs.find((x) => x.id === id);
		if (!b) return;
		Object.assign(b, d, { updatedAt: Date.now() });
		this.persist();
	}
	deleteBug(id: string) {
		this.data.bugs = this.data.bugs.filter((b) => b.id !== id);
		this.persist();
	}

	// ---------- pros & cons ----------
	feedbackFor(projectId: string): Feedback[] {
		return this.data.feedback.filter((f) => f.projectId === projectId);
	}
	addFeedback(d: FeedbackDraft) {
		const now = Date.now();
		this.data.feedback.push({ ...d, id: uid('f-'), createdAt: now, updatedAt: now });
		this.persist();
	}
	updateFeedback(id: string, d: Partial<FeedbackDraft>) {
		const f = this.data.feedback.find((x) => x.id === id);
		if (!f) return;
		Object.assign(f, d, { updatedAt: Date.now() });
		this.persist();
	}
	deleteFeedback(id: string) {
		this.data.feedback = this.data.feedback.filter((f) => f.id !== id);
		this.persist();
	}

	// ---------- daily update ----------
	dailyFor(date: string) {
		return this.data.daily.find((d) => d.date === date);
	}
	saveDaily(date: string, text: string) {
		const e = this.dailyFor(date);
		if (e) {
			e.text = text;
			e.updatedAt = Date.now();
		} else this.data.daily.push({ date, text, updatedAt: Date.now() });
		return this.persist();
	}
	deleteDaily(date: string) {
		this.data.daily = this.data.daily.filter((d) => d.date !== date);
		this.persist();
	}

	// ---------- settings / data ----------
	setTester(name: string) {
		this.data.settings.tester = name.trim();
		this.persist();
	}
	replaceAll(next: AppData) {
		this.data = next;
		this.persist();
	}
	startFresh() {
		this.data = { ...emptyData(), settings: { tester: this.data.settings.tester } };
		this.persist();
	}
	loadSample() {
		this.data = sampleData();
		this.persist();
	}
}

export const store = new Store();
