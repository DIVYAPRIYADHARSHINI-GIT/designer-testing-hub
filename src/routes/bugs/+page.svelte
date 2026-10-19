<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import BugCard from '$lib/components/BugCard.svelte';
	import BugForm from '$lib/components/BugForm.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { Bug, BugDraft } from '$lib/types.ts';
	import { BUG_STATUSES, SEVERITIES, emptyBug } from '$lib/types.ts';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';
	import { groupBugs } from '$lib/group.ts';
	import { plural } from '$lib/utils.ts';

	let search = $state('');
	let severity = $state('');
	let status = $state('');
	let project = $state('');
	let tester = $state('');
	let sort = $state<'newest' | 'oldest' | 'severity' | 'project'>('severity');
	let form = $state<{ mode: 'add' | 'edit'; id?: string; draft: BugDraft } | null>(null);

	const RANK = { High: 0, Medium: 1, Low: 2 } as const;
	const projName = (id: string) => store.projectById(id)?.name ?? '';
	const testers = $derived([...new Set(store.projects.map((p) => p.tester).filter(Boolean))].sort());

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const list = store.bugs.filter((b) => {
			if (severity && b.severity !== severity) return false;
			if (status && b.status !== status) return false;
			if (project && b.projectId !== project) return false;
			if (tester && store.projectById(b.projectId)?.tester !== tester) return false;
			if (q && ![b.title, b.steps, b.expected, b.actual, projName(b.projectId)].join(' ').toLowerCase().includes(q)) return false;
			return true;
		});
		return list.sort((a, b) =>
			sort === 'newest'
				? b.createdAt - a.createdAt
				: sort === 'oldest'
					? a.createdAt - b.createdAt
					: sort === 'project'
						? projName(a.projectId).localeCompare(projName(b.projectId)) || RANK[a.severity] - RANK[b.severity]
						: RANK[a.severity] - RANK[b.severity] || b.createdAt - a.createdAt
		);
	});
	const groups = $derived(groupBugs(store.bugs).slice(0, 6));
	const anyFilter = $derived(!!(search || severity || status || project || tester));
	const counts = $derived(Object.fromEntries(SEVERITIES.map((s) => [s, filtered.filter((b) => b.severity === s).length])));

	function clear() {
		search = severity = status = project = tester = '';
	}
	function strip(b: Bug): BugDraft {
		const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = b;
		return rest;
	}
	function save(d: BugDraft) {
		if (!form) return;
		if (form.mode === 'add') store.addBug(d);
		else if (form.id) store.updateBug(form.id, d);
		ui.toast(form.mode === 'add' ? `Bug added to ${projName(d.projectId)}` : 'Bug saved');
		form = null;
	}
	async function remove(b: Bug) {
		if (await ui.ask({ title: 'Delete this bug?', message: `"${b.title}" (${projName(b.projectId)}) will be removed.`, confirmLabel: 'Delete bug' })) {
			store.deleteBug(b.id);
			ui.toast('Bug deleted');
		}
	}
	function showGroup(title: string) {
		search = title;
		severity = status = project = tester = '';
	}
</script>

<svelte:head><title>Bugs · Designer Testing Hub</title></svelte:head>

<div class="page-head">
	<div>
		<h1 data-testid="page-title">Bugs</h1>
		<p class="sub">{plural(store.bugs.length, 'bug')} across {plural(store.projects.length, 'project')}.</p>
	</div>
	<div class="btn-row">
		<a class="btn" href="/reports#bugs"><Icon name="report" size={18} /> Bug report PDF</a>
		<button type="button" class="btn pink" onclick={() => (form = { mode: 'add', draft: emptyBug(project || store.projects[0]?.id || '') })} disabled={!store.projects.length} data-testid="add-bug"><Icon name="plus" size={18} /> Add bug</button>
	</div>
</div>

{#if !store.bugs.length}
	<EmptyState icon="bug" title="No bugs logged" text={store.projects.length ? 'Open a project and log the first bug you find while testing Designer.' : 'Add a project first, then log bugs against it.'} testid="bugs-empty">
		{#if store.projects.length}
			<button type="button" class="btn pink" onclick={() => (form = { mode: 'add', draft: emptyBug(store.projects[0].id) })}><Icon name="plus" size={18} /> Add bug</button>
		{:else}
			<a class="btn yellow" href="/projects?new=1"><Icon name="plus" size={18} /> Add project</a>
		{/if}
	</EmptyState>
{:else}
	<section class="common card" data-testid="common-bugs">
		<div class="card-title">
			<h2>Most common bugs</h2>
			<span class="muted small">Similar titles grouped together</span>
		</div>
		<ol>
			{#each groups as g, i (g.title + i)}
				<li>
					<span class="rank mono">{i + 1}</span>
					<button type="button" class="gtitle" onclick={() => showGroup(g.title)} title="Show these bugs" data-testid="common-bug">{g.title}</button>
					<span class="tag {g.worst.toLowerCase()}">{g.worst}</span>
					<span class="times mono" data-testid="common-count">×{g.count}</span>
					<span class="muted small projs">{g.projectIds.map(projName).filter(Boolean).join(', ')}</span>
				</li>
			{/each}
		</ol>
	</section>

	<div class="toolbar card flat" data-testid="bug-filters">
		<label class="search">
			<span class="sr-only">Search bugs</span>
			<Icon name="search" size={18} />
			<input class="input" type="search" placeholder="Search bugs..." bind:value={search} data-testid="bug-search" />
		</label>
		<label class="f"><span class="sr-only">Severity</span>
			<select class="input" bind:value={severity} data-testid="bug-filter-severity">
				<option value="">All severities</option>
				{#each SEVERITIES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Status</span>
			<select class="input" bind:value={status} data-testid="bug-filter-status">
				<option value="">All statuses</option>
				{#each BUG_STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Project</span>
			<select class="input" bind:value={project} data-testid="bug-filter-project">
				<option value="">All projects</option>
				{#each store.projects as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Tester</span>
			<select class="input" bind:value={tester} data-testid="bug-filter-tester">
				<option value="">All testers</option>
				{#each testers as t (t)}<option value={t}>{t}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Sort</span>
			<select class="input" bind:value={sort} data-testid="bug-sort">
				<option value="severity">Sort: Severity</option>
				<option value="newest">Sort: Newest</option>
				<option value="oldest">Sort: Oldest</option>
				<option value="project">Sort: Project</option>
			</select>
		</label>
	</div>
	<p class="count muted" data-testid="bug-count">
		Showing {filtered.length} of {store.bugs.length} · <span class="sev high">{counts.High} High</span> · <span class="sev medium">{counts.Medium} Medium</span> · <span class="sev low">{counts.Low} Low</span>
		{#if anyFilter}· <button type="button" class="linkish" onclick={clear} data-testid="bug-clear">Clear filters</button>{/if}
	</p>

	{#if filtered.length}
		<div class="bug-grid" data-testid="all-bugs">
			{#each filtered as b (b.id)}
				<BugCard bug={b} onedit={(x) => (form = { mode: 'edit', id: x.id, draft: strip(x) })} ondelete={remove} />
			{/each}
		</div>
	{:else}
		<EmptyState icon="search" title="No bugs match" text="Try another filter." testid="bugs-no-match"><button type="button" class="btn" onclick={clear}>Clear filters</button></EmptyState>
	{/if}
{/if}

{#if form}
	<BugForm initial={form.draft} mode={form.mode} pickProject={form.mode === 'add'} onsave={save} oncancel={() => (form = null)} />
{/if}

<style>
	.common {
		margin-bottom: 18px;
	}
	.common ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.common li {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 8px 0;
		border-bottom: 2px dashed color-mix(in srgb, var(--line) 25%, transparent);
	}
	.common li:last-child {
		border-bottom: 0;
	}
	.rank {
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		background: var(--yellow);
		color: #111;
		border: 2px solid var(--line);
		border-radius: 8px;
		font-weight: 700;
		flex: none;
	}
	.gtitle {
		background: none;
		border: 0;
		padding: 0;
		font: 700 1rem var(--font);
		color: var(--ink);
		cursor: pointer;
		text-align: left;
		flex: 1 1 200px;
	}
	.gtitle:hover {
		text-decoration: underline;
	}
	.times {
		font-weight: 700;
		font-size: 1.1rem;
	}
	.small {
		font-size: 0.82rem;
	}
	.projs {
		flex-basis: 100%;
		padding-left: 40px;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		padding: 12px;
		margin-bottom: 10px;
	}
	.search {
		flex: 1 1 220px;
		position: relative;
		display: flex;
		align-items: center;
	}
	.search :global(svg) {
		position: absolute;
		left: 12px;
		pointer-events: none;
	}
	.search input {
		padding-left: 38px;
	}
	.f {
		flex: 0 1 160px;
		min-width: 130px;
	}
	.count {
		font-size: 0.85rem;
		font-weight: 700;
		margin: 0 0 22px 4px;
	}
	.sev.high {
		color: var(--sev-high);
	}
	.sev.medium {
		color: var(--sev-medium);
	}
	.sev.low {
		color: color-mix(in srgb, var(--sev-low) 70%, var(--ink));
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--ink);
		text-decoration: underline;
		cursor: pointer;
	}
	.bug-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 28px 20px;
	}
	@media (max-width: 600px) {
		.f {
			flex: 1 1 calc(50% - 10px);
		}
	}
</style>
