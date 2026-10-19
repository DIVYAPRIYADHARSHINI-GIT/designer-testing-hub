// Core data model for Designer Testing Hub. Mirrors the team's Google Sheet
// columns (Product name ... Date) plus per-project bugs, pros/cons and
// daily updates. Everything lives in localStorage (no database).

export type Status = 'In progress' | 'Completed';
export type Severity = 'High' | 'Medium' | 'Low';
export type BugStatus = 'Open' | 'Reported' | 'Fixed';
export type FeedbackKind = 'pro' | 'con';

export const STATUSES: Status[] = ['In progress', 'Completed'];
export const SEVERITIES: Severity[] = ['High', 'Medium', 'Low'];
export const BUG_STATUSES: BugStatus[] = ['Open', 'Reported', 'Fixed'];
export const TIER_SUGGESTIONS = ['Tier 1', 'Tier 2', 'Tier 3'];

export interface Project {
	id: string;
	name: string;
	referenceUrl: string;
	tester: string;
	tier: string;
	why: string;
	details: string;
	expected: string;
	frontendStack: string;
	frontendDrive: string;
	backendStack: string;
	backendDrive: string;
	readmeUrl: string;
	githubUrl: string;
	liveUrl: string;
	status: Status;
	checked: boolean;
	/** YYYY-MM-DD */
	date: string;
	createdAt: number;
	updatedAt: number;
}

export interface Bug {
	id: string;
	projectId: string;
	title: string;
	steps: string;
	expected: string;
	actual: string;
	severity: Severity;
	screenshotUrl: string;
	videoUrl: string;
	chatUrl: string;
	status: BugStatus;
	createdAt: number;
	updatedAt: number;
}

export interface Feedback {
	id: string;
	projectId: string;
	kind: FeedbackKind;
	title: string;
	description: string;
	chatUrl: string;
	mediaUrl: string;
	/** Optional "Compared with Codex / Cursor" note. */
	compared: string;
	createdAt: number;
	updatedAt: number;
}

export interface DailyEntry {
	/** YYYY-MM-DD */
	date: string;
	text: string;
	updatedAt: number;
}

export interface Settings {
	/** Default tester name for new projects and "Reported by" in reports. */
	tester: string;
}

export interface AppData {
	version: 1;
	projects: Project[];
	bugs: Bug[];
	feedback: Feedback[];
	daily: DailyEntry[];
	settings: Settings;
	/** True while the pre-loaded sample data is untouched by "Start fresh". */
	sample: boolean;
}

export type ProjectDraft = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type BugDraft = Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>;
export type FeedbackDraft = Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>;

export const LINK_FIELDS = ['referenceUrl', 'frontendDrive', 'backendDrive', 'readmeUrl', 'githubUrl', 'liveUrl'] as const;

export function emptyProject(tester = ''): ProjectDraft {
	return {
		name: '',
		referenceUrl: '',
		tester,
		tier: '',
		why: '',
		details: '',
		expected: '',
		frontendStack: '',
		frontendDrive: '',
		backendStack: '',
		backendDrive: '',
		readmeUrl: '',
		githubUrl: '',
		liveUrl: '',
		status: 'In progress',
		checked: false,
		date: ''
	};
}

export function emptyBug(projectId: string): BugDraft {
	return {
		projectId,
		title: '',
		steps: '',
		expected: '',
		actual: '',
		severity: 'Medium',
		screenshotUrl: '',
		videoUrl: '',
		chatUrl: '',
		status: 'Open'
	};
}

export function emptyFeedback(projectId: string, kind: FeedbackKind): FeedbackDraft {
	return { projectId, kind, title: '', description: '', chatUrl: '', mediaUrl: '', compared: '' };
}

export function emptyData(): AppData {
	return { version: 1, projects: [], bugs: [], feedback: [], daily: [], settings: { tester: '' }, sample: false };
}
