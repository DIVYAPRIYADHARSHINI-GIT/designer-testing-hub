<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import LinkOut from '$lib/components/LinkOut.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ProjectForm from '$lib/components/ProjectForm.svelte';
	import BugForm from '$lib/components/BugForm.svelte';
	import BugCard from '$lib/components/BugCard.svelte';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';
	import FeedbackCard from '$lib/components/FeedbackCard.svelte';
	import ReportButtons from '$lib/components/ReportButtons.svelte';
	import type { Bug, BugDraft, Feedback, FeedbackDraft, FeedbackKind, ProjectDraft } from '$lib/types.ts';
	import { emptyBug, emptyFeedback } from '$lib/types.ts';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';
	import { copyRow } from '$lib/sheet.ts';
	import { formatDate, plural } from '$lib/utils.ts';

	const id = $derived(page.params.id ?? '');
	const p = $derived(store.projectById(id));
	const bugs = $derived(store.bugs.filter((b) => b.projectId === id).sort((a, b) => a.createdAt - b.createdAt));
	const pros = $derived(store.feedback.filter((f) => f.projectId === id && f.kind === 'pro').sort((a, b) => a.createdAt - b.createdAt));
	const cons = $derived(store.feedback.filter((f) => f.projectId === id && f.kind === 'con').sort((a, b) => a.createdAt - b.createdAt));
	const openBugs = $derived(bugs.filter((b) => b.status !== 'Fixed').length);

	let tab = $state<'bugs' | 'proscons' | 'reports'>('bugs');
	let editProject = $state(false);
	let bugForm = $state<{ mode: 'add' | 'edit'; id?: string; draft: BugDraft } | null>(null);
	let fbForm = $state<{ mode: 'add' | 'edit'; id?: string; draft: FeedbackDraft } | null>(null);
	let includeSummary = $state(true);

	function strip<T extends { id: string; createdAt: number; updatedAt: number }>(x: T) {
		const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = x;
		return rest;
	}
	function saveProject(d: ProjectDraft) {
		store.updateProject(id, d);
		editProject = false;
		ui.toast(`Saved ${d.name}`);
	}
	async function removeProject() {
		if (!p) return;
		const ok = await ui.ask({
			title: `Delete ${p.name}?`,
			message: `This removes the project${bugs.length || pros.length + cons.length ? ` with ${plural(bugs.length, 'bug')} and ${plural(pros.length + cons.length, 'pro/con', 'pros/cons')}` : ''}. This can't be undone.`,
			confirmLabel: 'Delete project'
		});
		if (!ok) return;
		const name = p.name;
		store.deleteProject(id);
		ui.toast(`Deleted ${name}`);
		goto('/projects');
	}
	function saveBug(d: BugDraft) {
		if (!bugForm) return;
		if (bugForm.mode === 'add') store.addBug(d);
		else if (bugForm.id) store.updateBug(bugForm.id, d);
		ui.toast(bugForm.mode === 'add' ? `Bug added: ${d.title}` : 'Bug saved');
		bugForm = null;
	}
	async function removeBug(b: Bug) {
		if (await ui.ask({ title: 'Delete this bug?', message: `"${b.title}" will be removed from ${p?.name ?? 'the project'}.`, confirmLabel: 'Delete bug' })) {
			store.deleteBug(b.id);
			ui.toast('Bug deleted');
		}
	}
	function addFb(kind: FeedbackKind) {
		fbForm = { mode: 'add', draft: emptyFeedback(id, kind) };
	}
	function saveFb(d: FeedbackDraft) {
		if (!fbForm) return;
		if (fbForm.mode === 'add') store.addFeedback(d);
		else if (fbForm.id) store.updateFeedback(fbForm.id, d);
		ui.toast(`${d.kind === 'pro' ? 'Pro' : 'Con'} ${fbForm.mode === 'add' ? 'added' : 'saved'}`);
		fbForm = null;
	}
	async function removeFb(f: Feedback) {
		if (await ui.ask({ title: `Delete this ${f.kind}?`, message: `"${f.title}" will be removed.`, confirmLabel: `Delete ${f.kind}` })) {
			store.deleteFeedback(f.id);
			ui.toast(`${f.kind === 'pro' ? 'Pro' : 'Con'} deleted`);
		}
	}
	async function copy() {
		if (!p) return;
		const ok = await copyRow(p);
		ui.toast(ok ? 'Row copied - paste it into Google Sheets' : 'Could not copy to the clipboard', ok ? 'ok' : 'err');
	}
	function toggleChecked() {
		if (!p) return;
		store.updateProject(id, { checked: !p.checked });
	}
</script>

<svelte:head><title>{p ? p.name : 'Project'} · Designer Testing Hub</title></svelte:head>

{#if !p}
	<EmptyState icon="search" title="Project not found" text="It may have been deleted, or the data lives in another browser. Import a JSON backup from Settings to move data between browsers." testid="project-missing">
		<a class="btn yellow" href="/projects"><Icon name="arrowLeft" size={18} /> All projects</a>
	</EmptyState>
{:else}
	<a class="back" href="/projects"><Icon name="arrowLeft" size={16} /> All projects</a>

	<section class="head card" data-testid="project-head">
		<div class="title-row">
			<div class="tt">
				<div class="row">
					<span class="tag {p.status === 'Completed' ? 'green' : 'blue'}" data-testid="project-status">{p.status}</span>
					{#if p.tier}<span class="tag purple">{p.tier}</span>{/if}
					<span class="mono muted small">@{p.tester} · {formatDate(p.date)}</span>
				</div>
				<h1 data-testid="page-title">{p.name}</h1>
			</div>
			<button type="button" class="stamp-btn" onclick={toggleChecked} aria-pressed={p.checked} title="Toggle checked" data-testid="toggle-checked">
				{#if p.checked}<span class="stamp big">Checked ✓</span>{:else}<span class="stamp pending big">Not checked</span>{/if}
			</button>
		</div>
		<div class="links">
			{#if p.liveUrl}<LinkOut url={p.liveUrl} icon="globe" testid="link-live" />{/if}
			{#if p.githubUrl}<LinkOut url={p.githubUrl} icon="github" testid="link-github" />{/if}
			{#if p.readmeUrl}<LinkOut url={p.readmeUrl} label="Readme" icon="file" />{/if}
			{#if p.referenceUrl}<LinkOut url={p.referenceUrl} label="Reference site" icon="link" />{/if}
		</div>
		<div class="btn-row">
			<button type="button" class="btn sm" onclick={() => (editProject = true)} data-testid="edit-project"><Icon name="edit" size={16} /> Edit</button>
			<button type="button" class="btn sm" onclick={copy} data-testid="copy-row"><Icon name="sheet" size={16} /> Copy row for Google Sheets</button>
			<button type="button" class="btn sm red" onclick={removeProject} data-testid="delete-project"><Icon name="trash" size={16} /> Delete</button>
		</div>
	</section>

	<div class="info">
		<section class="card flat">
			<h3>Why it's interesting</h3>
			<p class="pre">{p.why || '—'}</p>
		</section>
		<section class="card flat">
			<h3>Product details</h3>
			<p class="pre">{p.details || '—'}</p>
		</section>
		<section class="card flat">
			<h3>Expected output</h3>
			<p class="pre">{p.expected || '—'}</p>
		</section>
		<section class="card flat">
			<h3>Stack</h3>
			<dl class="stack-dl">
				<dt>Frontend</dt>
				<dd>{p.frontendStack || '—'} {#if p.frontendDrive}<LinkOut url={p.frontendDrive} label="Drive" icon="link" />{/if}</dd>
				<dt>Backend</dt>
				<dd>{p.backendStack || '—'} {#if p.backendDrive}<LinkOut url={p.backendDrive} label="Drive" icon="link" />{/if}</dd>
			</dl>
		</section>
	</div>

	<div class="tabs" role="tablist" aria-label="Project sections">
		<button type="button" role="tab" aria-selected={tab === 'bugs'} class:on={tab === 'bugs'} onclick={() => (tab = 'bugs')} data-testid="tab-bugs"><Icon name="bug" size={18} /> Bugs <span class="n">{bugs.length}</span></button>
		<button type="button" role="tab" aria-selected={tab === 'proscons'} class:on={tab === 'proscons'} onclick={() => (tab = 'proscons')} data-testid="tab-proscons"><Icon name="thumbUp" size={18} /> Pros &amp; cons <span class="n">{pros.length + cons.length}</span></button>
		<button type="button" role="tab" aria-selected={tab === 'reports'} class:on={tab === 'reports'} onclick={() => (tab = 'reports')} data-testid="tab-reports"><Icon name="report" size={18} /> Reports</button>
	</div>

	{#if tab === 'bugs'}
		<section class="panel" role="tabpanel" data-testid="panel-bugs">
			<div class="card-title">
				<h2>Bugs <span class="muted small">{openBugs} not fixed</span></h2>
				<button type="button" class="btn pink" onclick={() => (bugForm = { mode: 'add', draft: emptyBug(id) })} data-testid="add-bug"><Icon name="plus" size={18} /> Add bug</button>
			</div>
			{#if bugs.length}
				<div class="bug-grid" data-testid="bug-list">
					{#each bugs as b (b.id)}
						<BugCard bug={b} showProject={false} onedit={(x) => (bugForm = { mode: 'edit', id: x.id, draft: strip(x) })} ondelete={removeBug} />
					{/each}
				</div>
			{:else}
				<EmptyState icon="bug" title="No bugs yet" text="Found something broken while testing? Log it with steps, expected vs actual and evidence links." testid="bugs-empty">
					<button type="button" class="btn pink" onclick={() => (bugForm = { mode: 'add', draft: emptyBug(id) })}><Icon name="plus" size={18} /> Add the first bug</button>
				</EmptyState>
			{/if}
		</section>
	{:else if tab === 'proscons'}
		<section class="panel pc" role="tabpanel" data-testid="panel-proscons">
			<div class="col">
				<div class="card-title">
					<h2>Pros <span class="muted small">{pros.length}</span></h2>
					<button type="button" class="btn green sm" onclick={() => addFb('pro')} data-testid="add-pro"><Icon name="plus" size={16} /> Add pro</button>
				</div>
				<div class="stack" data-testid="pros-list">
					{#each pros as f (f.id)}<FeedbackCard item={f} onedit={(x) => (fbForm = { mode: 'edit', id: x.id, draft: strip(x) })} ondelete={removeFb} />{/each}
					{#if !pros.length}<EmptyState icon="thumbUp" title="No pros yet" text="What did Designer do really well?" testid="pros-empty" />{/if}
				</div>
			</div>
			<div class="col">
				<div class="card-title">
					<h2>Cons <span class="muted small">{cons.length}</span></h2>
					<button type="button" class="btn pink sm" onclick={() => addFb('con')} data-testid="add-con"><Icon name="plus" size={16} /> Add con</button>
				</div>
				<div class="stack" data-testid="cons-list">
					{#each cons as f (f.id)}<FeedbackCard item={f} onedit={(x) => (fbForm = { mode: 'edit', id: x.id, draft: strip(x) })} ondelete={removeFb} />{/each}
					{#if !cons.length}<EmptyState icon="thumbDown" title="No cons yet" text="Anything slow, confusing or broken?" testid="cons-empty" />{/if}
				</div>
			</div>
		</section>
	{:else}
		<section class="panel reports" role="tabpanel" data-testid="panel-reports">
			<article class="card rcard">
				<span class="tag green">PDF · DOCX</span>
				<h3>Designer Feedback Report</h3>
				<p class="muted">Name, project title, live site, GitHub, then every pro and con with evidence links.</p>
				<label class="check"><input type="checkbox" bind:checked={includeSummary} data-testid="include-summary" /> Include summary table</label>
				<ReportButtons kind="feedback" projects={[p]} {includeSummary} label="Feedback PDF" color="green" testid="project-feedback" />
			</article>
			<article class="card rcard">
				<span class="tag pink">PDF · DOCX</span>
				<h3>Designer Bug Report</h3>
				<p class="muted">Every bug as "Bug N: title (project)" with steps, expected, actual and evidence links.</p>
				<ReportButtons kind="bugs" projects={[p]} label="Bug report PDF" color="pink" testid="project-bugs" />
			</article>
			<article class="card rcard">
				<span class="tag blue">PDF · DOCX</span>
				<h3>Designer vs Codex &amp; Cursor</h3>
				<p class="muted">Pros and cons tables with your Codex / Cursor comparison notes.</p>
				<ReportButtons kind="compare" projects={[p]} label="Comparative PDF" color="blue" testid="project-compare" />
			</article>
		</section>
	{/if}
{/if}

{#if editProject && p}
	<ProjectForm initial={strip(p)} mode="edit" onsave={saveProject} oncancel={() => (editProject = false)} />
{/if}
{#if bugForm}
	<BugForm initial={bugForm.draft} mode={bugForm.mode} onsave={saveBug} oncancel={() => (bugForm = null)} />
{/if}
{#if fbForm}
	<FeedbackForm initial={fbForm.draft} mode={fbForm.mode} onsave={saveFb} oncancel={() => (fbForm = null)} />
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		text-decoration: none;
		margin-bottom: 14px;
	}
	.back:hover {
		text-decoration: underline;
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 18px;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}
	.tt h1 {
		margin-top: 10px;
		overflow-wrap: anywhere;
	}
	.small {
		font-size: 0.8rem;
	}
	.stamp-btn {
		background: none;
		border: 0;
		padding: 8px;
		cursor: pointer;
	}
	.stamp.big {
		font-size: 1.05rem;
		padding: 6px 14px 5px;
		border-width: 4px;
	}
	.stamp-btn:hover .stamp {
		transform: rotate(-3deg) scale(1.05);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	.info {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 24px;
	}
	.info h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 8px;
	}
	.info p {
		font-size: 0.93rem;
		color: var(--ink-soft);
	}
	.stack-dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 12px;
		font-size: 0.93rem;
	}
	.stack-dl dt {
		font-weight: 700;
	}
	.stack-dl dd {
		margin: 0;
		color: var(--ink-soft);
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.tabs {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 18px;
	}
	.tabs button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font: 700 1rem var(--font);
		color: var(--ink);
		background: var(--card);
		border: var(--bw) solid var(--line);
		border-radius: 14px 14px 4px 4px;
		padding: 10px 16px;
		min-height: 46px;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: transform 0.08s;
	}
	.tabs button:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.tabs button.on {
		background: var(--yellow);
		color: #111;
		transform: translateY(-3px);
	}
	.tabs .n {
		font-family: var(--mono);
		font-size: 0.78rem;
		background: var(--ink);
		color: var(--bg);
		border-radius: 999px;
		padding: 1px 8px;
	}
	.tabs button.on .n {
		background: #111;
		color: var(--yellow);
	}
	.bug-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 26px 20px;
		padding-top: 10px;
	}
	.pc {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 24px;
	}
	.reports {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	.rcard {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: flex-start;
	}
	.rcard p {
		font-size: 0.9rem;
		flex: 1;
	}
	@media (max-width: 1050px) {
		.reports {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 760px) {
		.info,
		.pc {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
