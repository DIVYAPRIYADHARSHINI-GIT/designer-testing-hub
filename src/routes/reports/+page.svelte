<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ReportButtons from '$lib/components/ReportButtons.svelte';
	import { store } from '$lib/store.svelte.ts';
	import { reportFileName, reporterOf } from '$lib/report/build.ts';
	import { BUG_STATUSES } from '$lib/types.ts';
	import { plural } from '$lib/utils.ts';

	// 1. Feedback: one project
	let fbProject = $state('');
	let includeSummary = $state(true);
	// 2. Bugs: one or more projects
	let bugSel = $state<string[]>([]);
	let bugStatuses = $state<Array<'Open' | 'Reported' | 'Fixed'>>([...BUG_STATUSES]);
	// 3. Compare: one or more projects
	let cmpSel = $state<string[]>([]);

	const projects = $derived(store.projects);
	const fbP = $derived(store.projectById(fbProject) ?? projects[0]);
	const bugPs = $derived(projects.filter((p) => bugSel.includes(p.id)));
	const cmpPs = $derived(projects.filter((p) => cmpSel.includes(p.id)));
	const reporter = $derived(store.tester);

	const fbCounts = $derived.by(() => {
		const items = store.feedback.filter((f) => f.projectId === fbP?.id);
		return { pros: items.filter((f) => f.kind === 'pro').length, cons: items.filter((f) => f.kind === 'con').length };
	});
	const bugCount = $derived(store.bugs.filter((b) => bugSel.includes(b.projectId) && bugStatuses.includes(b.status)).length);
	const cmpItems = $derived(store.feedback.filter((f) => cmpSel.includes(f.projectId)));
	const name = (kind: 'feedback' | 'bugs' | 'compare', ps: typeof projects) => reportFileName(kind, ps, reporterOf({ reporter, projects: ps }), 'pdf');

	function toggle(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}
	function toggleStatus(s: 'Open' | 'Reported' | 'Fixed') {
		bugStatuses = bugStatuses.includes(s) ? bugStatuses.filter((x) => x !== s) : [...bugStatuses, s];
	}
</script>

<svelte:head><title>Reports · Designer Testing Hub</title></svelte:head>

<div class="page-head">
	<div>
		<h1 data-testid="page-title">Reports</h1>
		<p class="sub">Clean, professional PDFs with clickable links, ready to send. DOCX too.</p>
	</div>
	{#if reporter}<span class="tag yellow mono">Reported by: {reporter}</span>{:else}<a class="btn sm" href="/settings">Set your tester name</a>{/if}
</div>

{#if !projects.length}
	<EmptyState icon="report" title="Nothing to report yet" text="Add a project with some bugs, pros and cons, then come back for one-click reports." testid="reports-empty">
		<a class="btn yellow" href="/projects?new=1"><Icon name="plus" size={18} /> Add project</a>
	</EmptyState>
{:else}
	<div class="grid-r">
		<!-- 1. Feedback report -->
		<section class="card rep" id="feedback" data-testid="report-feedback">
			<div class="num green">1</div>
			<h2>Designer Feedback Report</h2>
			<p class="muted">Per project: Name, Project Title, Live Site, GitHub, then Pros and Cons (bold title + description, evidence link).</p>
			<label class="field">
				<span>Project</span>
				<select class="input" value={fbP?.id} onchange={(e) => (fbProject = (e.currentTarget as HTMLSelectElement).value)} data-testid="fb-project">
					{#each projects as p (p.id)}<option value={p.id}>{p.name} ({p.tester})</option>{/each}
				</select>
			</label>
			<label class="check"><input type="checkbox" bind:checked={includeSummary} data-testid="fb-summary" /> Include summary table</label>
			<p class="meta mono">{plural(fbCounts.pros, 'pro')} · {plural(fbCounts.cons, 'con')}</p>
			<p class="fname mono" data-testid="fb-filename">{fbP ? name('feedback', [fbP]) : ''}</p>
			<ReportButtons kind="feedback" projects={fbP ? [fbP] : []} {includeSummary} label="Download PDF" color="green" testid="rep-feedback" />
		</section>

		<!-- 2. Bug report -->
		<section class="card rep" id="bugs" data-testid="report-bugs">
			<div class="num pink">2</div>
			<h2>Designer Bug Report</h2>
			<p class="muted">"Reported by", "Projects tested", then each bug as "Bug N: title (project)" with steps, expected, actual and evidence.</p>
			<fieldset>
				<legend>Projects <button type="button" class="mini-link" onclick={() => (bugSel = bugSel.length === projects.length ? [] : projects.map((p) => p.id))} data-testid="bug-select-all">{bugSel.length === projects.length ? 'None' : 'All'}</button></legend>
				<div class="picks">
					{#each projects as p (p.id)}
						<label class="pick" class:on={bugSel.includes(p.id)}><input type="checkbox" checked={bugSel.includes(p.id)} onchange={() => (bugSel = toggle(bugSel, p.id))} data-testid="bug-pick" /> {p.name}</label>
					{/each}
				</div>
			</fieldset>
			<fieldset>
				<legend>Bug status</legend>
				<div class="picks">
					{#each BUG_STATUSES as s (s)}
						<label class="pick" class:on={bugStatuses.includes(s)}><input type="checkbox" checked={bugStatuses.includes(s)} onchange={() => toggleStatus(s)} data-testid="bug-status-pick" /> {s}</label>
					{/each}
				</div>
			</fieldset>
			<p class="meta mono">{plural(bugCount, 'bug')} in {plural(bugPs.length, 'project')}</p>
			<p class="fname mono" data-testid="bug-filename">{bugPs.length ? name('bugs', bugPs) : 'Select at least one project'}</p>
			<ReportButtons kind="bugs" projects={bugPs} bugStatuses={bugStatuses.length ? bugStatuses : undefined} label="Download PDF" color="pink" testid="rep-bugs" />
		</section>

		<!-- 3. Comparative report -->
		<section class="card rep" id="compare" data-testid="report-compare">
			<div class="num blue">3</div>
			<h2>Designer vs Codex &amp; Cursor</h2>
			<p class="muted">Pros table (Pro, What Designer did, Compared with Codex/Cursor) and Cons table (Con, What happened in Designer, How Codex/Cursor handle it).</p>
			<fieldset>
				<legend>Projects <button type="button" class="mini-link" onclick={() => (cmpSel = cmpSel.length === projects.length ? [] : projects.map((p) => p.id))} data-testid="cmp-select-all">{cmpSel.length === projects.length ? 'None' : 'All'}</button></legend>
				<div class="picks">
					{#each projects as p (p.id)}
						<label class="pick" class:on={cmpSel.includes(p.id)}><input type="checkbox" checked={cmpSel.includes(p.id)} onchange={() => (cmpSel = toggle(cmpSel, p.id))} data-testid="cmp-pick" /> {p.name}</label>
					{/each}
				</div>
			</fieldset>
			<p class="meta mono">{plural(cmpItems.length, 'pro/con', 'pros/cons')} · {cmpItems.filter((f) => f.compared.trim()).length} compared</p>
			<p class="fname mono" data-testid="cmp-filename">{cmpPs.length ? name('compare', cmpPs) : 'Select at least one project'}</p>
			<ReportButtons kind="compare" projects={cmpPs} label="Download PDF" color="blue" testid="rep-compare" />
		</section>
	</div>
	<p class="muted note">Reports are generated on the server (SvelteKit route) from the data in this browser; nothing is stored on the server. Links in the PDF and DOCX are clickable.</p>
{/if}

<style>
	.grid-r {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
		align-items: start;
	}
	.rep {
		display: flex;
		flex-direction: column;
		gap: 12px;
		position: relative;
		padding-top: 26px;
	}
	.num {
		position: absolute;
		top: -18px;
		left: 16px;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		font: 700 1.3rem var(--font);
		color: #111;
		border: var(--bw) solid var(--line);
		border-radius: 50%;
		box-shadow: var(--shadow-sm);
	}
	.num.green {
		background: var(--green);
	}
	.num.pink {
		background: var(--pink);
	}
	.num.blue {
		background: var(--blue);
	}
	.rep > p.muted {
		font-size: 0.9rem;
	}
	fieldset {
		border: 2px dashed var(--line);
		border-radius: 12px;
		padding: 10px 12px 12px;
		margin: 0;
		min-width: 0;
	}
	legend {
		font-weight: 700;
		font-size: 0.88rem;
		padding: 0 6px;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.mini-link {
		font: 700 0.75rem var(--mono);
		background: var(--ink);
		color: var(--bg);
		border: 0;
		border-radius: 6px;
		padding: 2px 8px;
		cursor: pointer;
	}
	.picks {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.pick {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		padding: 6px 12px;
		min-height: 38px;
		border: 2px solid var(--line);
		border-radius: 999px;
		cursor: pointer;
		background: var(--card);
		user-select: none;
	}
	.pick input {
		width: 16px;
		height: 16px;
		accent-color: #111;
		margin: 0;
	}
	.pick.on {
		background: var(--yellow);
		color: #111;
	}
	.meta {
		font-size: 0.8rem;
		font-weight: 700;
	}
	.fname {
		font-size: 0.74rem;
		background: var(--bg-2);
		border: 2px solid var(--line);
		border-radius: 8px;
		padding: 6px 8px;
		overflow-wrap: anywhere;
	}
	.note {
		margin-top: 22px;
		font-size: 0.85rem;
	}
	@media (max-width: 1100px) {
		.grid-r {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 720px) {
		.grid-r {
			grid-template-columns: minmax(0, 1fr);
			gap: 30px;
		}
	}
</style>
