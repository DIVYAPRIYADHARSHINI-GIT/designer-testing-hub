// Load/validate stored or imported JSON (localStorage + backup files) and the
// pre-loaded sample data (tester "divyapriyadharshini", 5 real projects).
import type { AppData, Bug, DailyEntry, Feedback, Project } from './types.ts';
import { emptyData } from './types.ts';
import { cleanBug, cleanFeedback, cleanProject } from './report/validate.ts';
import { isISODate } from './utils.ts';

/** Coerces any parsed JSON into valid AppData; returns null when it isn't a Testing Hub backup. */
export function normalizeData(raw: unknown): AppData | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	if (!Array.isArray(o.projects)) return null;
	const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []) as Record<string, unknown>[];
	const projects = list(o.projects)
		.map(cleanProject)
		.filter((p) => p.id && p.name);
	const ids = new Set(projects.map((p) => p.id));
	const daily: DailyEntry[] = list(o.daily)
		.map((d) => ({ date: String(d.date ?? ''), text: String(d.text ?? '').slice(0, 20000), updatedAt: Number(d.updatedAt) || 0 }))
		.filter((d) => isISODate(d.date) && d.text.trim());
	const s = (o.settings && typeof o.settings === 'object' ? o.settings : {}) as Record<string, unknown>;
	return {
		version: 1,
		projects,
		bugs: list(o.bugs)
			.map(cleanBug)
			.filter((b) => b.id && ids.has(b.projectId)),
		feedback: list(o.feedback)
			.map(cleanFeedback)
			.filter((f) => f.id && ids.has(f.projectId)),
		daily: [...new Map(daily.map((d) => [d.date, d])).values()],
		settings: { tester: typeof s.tester === 'string' ? s.tester.slice(0, 200) : '' },
		sample: o.sample === true
	};
}

const GH = 'https://github.com/DIVYAPRIYADHARSHINI-GIT/';
const TESTER = 'divyapriyadharshini';

export function sampleData(): AppData {
	const base = Date.UTC(2026, 9, 13, 9, 0, 0);
	let t = base;
	const ts = () => (t += 60_000);
	const project = (p: Omit<Project, 'createdAt' | 'updatedAt' | 'tester'>): Project => {
		const at = ts();
		return { ...p, tester: TESTER, createdAt: at, updatedAt: at };
	};
	const projects: Project[] = [
		project({
			id: 'p-trafficsense',
			name: 'TrafficSense',
			referenceUrl: 'https://www.tomtom.com/traffic-index/',
			tier: 'Tier 2',
			why: 'Full-stack ML app: tests whether Designer can generate a realistic dataset, train a model and connect a FastAPI backend to a React dashboard in one run.',
			details:
				'Traffic prediction web app ("Predict the jam before you\'re in it."). 6-month hourly dataset for 6 roads (~26k rows) with commute peaks, lighter weekends and rain/holiday traffic. Random Forest model with a historical-average fallback, CSV upload + retrain, Dashboard / Predict / Insights / About pages, light and dark mode.',
			expected: 'Pick a road, day and hour and get the predicted congestion level and travel time, peak-hour insights and charts, plus CSV upload to retrain the model.',
			frontendStack: 'React + Vite + Tailwind + Recharts',
			frontendDrive: '',
			backendStack: 'FastAPI + Pandas + scikit-learn + SQLite',
			backendDrive: '',
			readmeUrl: GH + 'trafficsense#readme',
			githubUrl: GH + 'trafficsense',
			liveUrl: 'https://trafficsense-brown.vercel.app',
			status: 'Completed',
			checked: true,
			date: '2026-10-14'
		}),
		project({
			id: 'p-skyfare',
			name: 'SkyFare',
			referenceUrl: 'https://www.google.com/travel/flights',
			tier: 'Tier 2',
			why: 'Tests a large simulated dataset, an exported ML model served in TypeScript, 11 languages including RTL and a full mock booking flow.',
			details:
				'Smart flight fare tracker ("Fly smart. Pay less."): 28 airports, 8 fictional airlines and 12 months of daily fares per route. Search with filters, budget mode with a fare calendar, Book now / Wait advice from a gradient-boosting model, watchlist price alerts, mock booking with seat map and PDF e-ticket.',
			expected: 'Search a route, see the cheapest dates, get a Book now / Wait recommendation and complete a mock booking that ends with a downloadable e-ticket.',
			frontendStack: 'Next.js 16 + Tailwind 4 + Recharts',
			frontendDrive: '',
			backendStack: 'Next.js API routes + scikit-learn model exported to JSON',
			backendDrive: '',
			readmeUrl: GH + 'skyfare#readme',
			githubUrl: GH + 'skyfare',
			liveUrl: 'https://skyfare-seven.vercel.app',
			status: 'Completed',
			checked: true,
			date: '2026-10-16'
		}),
		project({
			id: 'p-brainarena',
			name: 'Brain Arena',
			referenceUrl: 'https://www.lumosity.com',
			tier: 'Tier 1',
			why: 'A playful UI-heavy build: five mini games, a reactive SVG mascot, synthesized sounds and three languages, with no backend at all.',
			details:
				'Fun brain-training website ("Warning: may cause sudden intelligence"): Quick Math, Memory Match, Word Hunt, Reaction Time and Quiz Blitz, daily challenge with streaks, local leaderboard, 14 badges, rank titles and easter eggs.',
			expected: 'All five games playable on desktop and mobile, scores saved locally, badges and streaks unlocked, English / Tamil / Hindi switch.',
			frontendStack: 'Next.js 16 + Tailwind 4 + Recharts',
			frontendDrive: '',
			backendStack: 'None (localStorage only)',
			backendDrive: '',
			readmeUrl: GH + 'brainarena#readme',
			githubUrl: GH + 'brainarena',
			liveUrl: 'https://brainarena-two.vercel.app',
			status: 'Completed',
			checked: true,
			date: '2026-10-17'
		}),
		project({
			id: 'p-jobpilot',
			name: 'JobPilot',
			referenceUrl: 'https://simplify.jobs',
			tier: 'Tier 3',
			why: 'Tests file parsing (PDF/DOCX resumes) without libraries, form auto-fill across different layouts and a drag-and-drop tracker.',
			details:
				'Auto job-application tracker ("Apply smarter, not harder."): mock JobHub board with 46 jobs, resume upload and parsing, match score, one-click auto-fill with confirm-before-submit, auto-apply limits, Kanban tracker, reminders, CSV + PDF export.',
			expected: 'Upload a resume, see match scores, auto-fill and submit applications on the mock portal and track every application on the Kanban board.',
			frontendStack: 'Next.js 16 + Tailwind 4 + Recharts',
			frontendDrive: '',
			backendStack: 'Next.js API routes (resume parsing, matching, mock portal)',
			backendDrive: '',
			readmeUrl: GH + 'jobpilot#readme',
			githubUrl: GH + 'jobpilot',
			liveUrl: 'https://jobpilot-zeta-tan.vercel.app',
			status: 'Completed',
			checked: false,
			date: '2026-10-18'
		}),
		project({
			id: 'p-powerwise',
			name: 'PowerWise',
			referenceUrl: 'https://sense.com',
			tier: 'Tier 3',
			why: 'Tests an honest ML workflow (model vs baseline on unseen homes), Indian tariff slabs, 17 languages and a server-generated PDF report.',
			details:
				'Smart electricity bill predictor ("Know your bill before it arrives."): 3-step home setup, next bill with range and slab breakdown, appliance breakdown, savings tips, what-if sliders, bill history, 12-month forecast, solar payback check and PDF report.',
			expected: 'Enter home and appliance details and get a realistic next-bill prediction with tips that show savings in rupees, plus a downloadable PDF report.',
			frontendStack: 'Next.js 16 + Tailwind 4 + Recharts',
			frontendDrive: '',
			backendStack: 'Next.js API routes + scikit-learn HistGradientBoosting (JSON)',
			backendDrive: '',
			readmeUrl: GH + 'powerwise#readme',
			githubUrl: GH + 'powerwise',
			liveUrl: 'https://powerwise-dusky.vercel.app',
			status: 'In progress',
			checked: false,
			date: '2026-10-19'
		})
	];

	const bug = (b: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'screenshotUrl' | 'videoUrl' | 'chatUrl'> & Partial<Bug>, n: number): Bug => {
		const at = ts();
		return { screenshotUrl: '', videoUrl: '', chatUrl: '', ...b, id: `b-sample-${n}`, createdAt: at, updatedAt: at };
	};
	const bugs: Bug[] = [
		bug(
			{
				projectId: 'p-trafficsense',
				title: 'Browser test hung without a timeout',
				steps: '1. Ask Designer to run the end-to-end test against the local dev server.\n2. Wait for the headless Chrome run to finish.',
				expected: 'The test fails fast with a clear error when a page does not load.',
				actual: 'Headless Chrome waited forever and the run had to be stopped by hand.',
				severity: 'High',
				status: 'Reported'
			},
			1
		),
		bug(
			{
				projectId: 'p-trafficsense',
				title: 'Page froze while retraining on a large CSV',
				steps: '1. Open Insights.\n2. Upload a 20k-row CSV and click Retrain.',
				expected: 'A loading state, then the new model metrics.',
				actual: 'The tab stopped responding for several seconds before the result appeared.',
				severity: 'Medium',
				status: 'Open',
				screenshotUrl: 'https://trafficsense-brown.vercel.app'
			},
			2
		),
		bug(
			{
				projectId: 'p-skyfare',
				title: 'Hydration warning on the fare calendar',
				steps: '1. Search BLR to DEL.\n2. Turn on Budget mode and open the fare calendar.',
				expected: 'No console errors.',
				actual: 'A hydration mismatch warning because dates were rendered in the server time zone.',
				severity: 'Low',
				status: 'Fixed',
				screenshotUrl: 'https://skyfare-seven.vercel.app'
			},
			3
		),
		bug(
			{
				projectId: 'p-brainarena',
				title: 'Vercel GitHub App could not see the new repo',
				steps: '1. Ask Designer to deploy to Vercel with GitHub auto-deploy.\n2. Push a new commit.',
				expected: 'The Vercel project is linked to the repo and every push deploys.',
				actual: 'Linking failed until the Vercel GitHub App was given access to the repo by hand.',
				severity: 'Medium',
				status: 'Reported',
				chatUrl: GH + 'brainarena'
			},
			4
		),
		bug(
			{
				projectId: 'p-jobpilot',
				title: 'Vercel GitHub App cannot see new repository',
				steps: '1. Create the GitHub repo with gh.\n2. Run vercel git connect.',
				expected: 'Auto-deploy is connected.',
				actual: 'Vercel reported it could not access the repository; the GitHub App permissions had to be updated.',
				severity: 'Medium',
				status: 'Fixed',
				chatUrl: GH + 'jobpilot'
			},
			5
		),
		bug(
			{
				projectId: 'p-jobpilot',
				title: 'Kanban drag and drop does not work on mobile',
				steps: '1. Open Tracker on a phone.\n2. Long-press a card and drag it to "Interview".',
				expected: 'The card moves to the new column.',
				actual: 'The page scrolls instead; the card cannot be moved without the status menu.',
				severity: 'Low',
				status: 'Open',
				screenshotUrl: 'https://jobpilot-zeta-tan.vercel.app/tracker'
			},
			6
		),
		bug(
			{
				projectId: 'p-powerwise',
				title: 'Headless browser tests hang with no timeout',
				steps: '1. Run the 227-check e2e suite.\n2. One page waits for translations that never load.',
				expected: 'The check fails after a few seconds and the suite continues.',
				actual: 'The whole suite stalled until it was killed.',
				severity: 'High',
				status: 'Open'
			},
			7
		),
		bug(
			{
				projectId: 'p-powerwise',
				title: 'English text flashes before translations load',
				steps: '1. Switch the language to Tamil.\n2. Reload the home page.',
				expected: 'The page appears directly in Tamil.',
				actual: 'English copy shows for a moment before switching.',
				severity: 'Low',
				status: 'Fixed',
				screenshotUrl: 'https://powerwise-dusky.vercel.app'
			},
			8
		)
	];

	let fn = 0;
	const fb = (projectId: string, kind: 'pro' | 'con', title: string, description: string, compared: string, mediaUrl = '', chatUrl = ''): Feedback => {
		const at = ts();
		return { id: `f-sample-${++fn}`, projectId, kind, title, description, compared, mediaUrl, chatUrl, createdAt: at, updatedAt: at };
	};
	const feedback: Feedback[] = [
		fb(
			'p-trafficsense',
			'pro',
			'Built the ML pipeline end to end',
			'Designer generated a realistic 26k-row dataset, trained the Random Forest, added a fallback model and wired it to the FastAPI routes without extra prompts.',
			'Codex needed separate prompts for data generation and training; in Cursor I had to run each script myself.',
			'https://trafficsense-brown.vercel.app'
		),
		fb(
			'p-trafficsense',
			'pro',
			'Wrote and passed its own API tests',
			'11 API tests were written and run before the first deploy.',
			'Cursor writes tests when asked but does not run them on its own.',
			'',
			GH + 'trafficsense'
		),
		fb(
			'p-trafficsense',
			'con',
			'Python and Node setup needed retries',
			'Installing the backend and frontend dependencies took several attempts before both servers ran.',
			'Cursor uses my own terminal so setup issues show up immediately; Codex hits the same issue but reports it sooner.'
		),
		fb(
			'p-skyfare',
			'pro',
			'Deployed with GitHub auto-deploy in one go',
			'Created the repo, pushed and linked Vercel so every push deploys.',
			'Codex and Cursor stop at the code; deployment is left to me.',
			'https://skyfare-seven.vercel.app'
		),
		fb('p-skyfare', 'pro', '11 languages including RTL Arabic', 'The whole UI, including the booking flow, works in 11 languages with right-to-left layout for Arabic.', ''),
		fb(
			'p-skyfare',
			'con',
			'Large generated data slowed the first build',
			'275k rows of simulated fares were bundled, which made the first production build slow.',
			'Cursor suggested a smaller sample when asked; Codex produced a similar large file.'
		),
		fb(
			'p-brainarena',
			'pro',
			'Playful mascot and sounds with no asset library',
			'Brainy the SVG mascot has 6 moods, and all sounds are synthesized with the Web Audio API.',
			'Both Codex and Cursor reached for icon or sound packages first.',
			'https://brainarena-two.vercel.app'
		),
		fb('p-brainarena', 'con', 'Needed manual GitHub App permission for Vercel', 'Auto-deploy only started after I gave the Vercel GitHub App access to the new repo.', 'Same limitation applies to any tool; Codex and Cursor do not attempt the deploy at all.'),
		fb(
			'p-jobpilot',
			'pro',
			'Dependency-free PDF and DOCX resume parsing',
			'Resume text extraction works for both PDF and DOCX without adding a parsing library.',
			'Cursor added pdf-parse and mammoth; Codex did the same.',
			'https://jobpilot-zeta-tan.vercel.app/profile'
		),
		fb('p-jobpilot', 'con', 'Very long single files', 'Some pages ended up as one very long component, which made review harder.', 'Cursor tends to split components when it edits; Codex is similar to Designer.'),
		fb(
			'p-powerwise',
			'pro',
			'Honest model accuracy vs a baseline',
			'Reported MAE 39 units and R2 0.93 on unseen homes against a baseline of MAE 132 / R2 0.28 instead of only showing the best number.',
			'Codex reported training accuracy only.',
			'https://powerwise-dusky.vercel.app/predict'
		),
		fb('p-powerwise', 'con', 'Long thinking before the first file', 'It planned for a long time before writing any code on the first prompt.', 'Cursor starts editing almost immediately.')
	];

	const daily: DailyEntry[] = [
		{ date: '2026-10-14', text: 'Finished TrafficSense with Designer: checked the ML pipeline, ran the API tests and logged the browser test timeout bug.', updatedAt: base },
		{ date: '2026-10-16', text: 'Tested SkyFare end to end on desktop and mobile, verified the Vercel auto-deploy and noted the hydration warning on the fare calendar.', updatedAt: base },
		{ date: '2026-10-17', text: 'Built Brain Arena with Designer, played all five games, checked Tamil and Hindi, and reported the Vercel GitHub App permission problem.', updatedAt: base },
		{ date: '2026-10-18', text: 'Tested JobPilot resume parsing, auto-fill and the Kanban tracker; logged the mobile drag and drop bug and compared with Cursor.', updatedAt: base }
	];

	return { ...emptyData(), projects, bugs, feedback, daily, settings: { tester: TESTER }, sample: true };
}
