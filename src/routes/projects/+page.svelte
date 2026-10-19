<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import LinkOut from '$lib/components/LinkOut.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ProjectForm from '$lib/components/ProjectForm.svelte';
	import type { Project, ProjectDraft } from '$lib/types.ts';
	import { emptyProject, STATUSES } from '$lib/types.ts';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';
	import { copyRow, exportCsv } from '$lib/sheet.ts';
	import { formatDate, plural } from '$lib/utils.ts';

	type SortKey = 'date' | 'name' | 'tester' | 'tier' | 'status' | 'bugs';
	const VIEW_KEY = 'dth.projects.view';

	// Filters start from the URL once (dashboard links), then are plain local state.
	const q0 = page.url.searchParams;
	let search = $state(q0.get('q') ?? '');
	let tester = $state(q0.get('tester') ?? '');
	let status = $state(q0.get('status') ?? '');
	let tier = $state(q0.get('tier') ?? '');
	let hasBugs = $state(q0.get('bugs') ?? '');
	let sortKey = $state<SortKey>('date');
	let sortDir = $state<1 | -1>(-1);
	let view = $state<'table' | 'cards'>('table');
	let editing = $state<{ mode: 'add' | 'edit'; id?: string; draft: ProjectDraft } | null>(null);

	onMount(() => {
		try {
			const v = localStorage.getItem(VIEW_KEY);
			if (v === 'cards' || v === 'table') view = v;
			else if (window.innerWidth < 760) view = 'cards';
		} catch {
			/* ignore */
		}
		if (q0.get('new') === '1') openAdd();
	});

	function setView(v: 'table' | 'cards') {
		view = v;
		try {
			localStorage.setItem(VIEW_KEY, v);
		} catch {
			/* ignore */
		}
	}

	const bugCount = $derived.by(() => {
		const m = new Map<string, number>();
		for (const b of store.bugs) m.set(b.projectId, (m.get(b.projectId) ?? 0) + 1);
		return m;
	});
	const fbCount = $derived.by(() => {
		const m = new Map<string, { pro: number; con: number }>();
		for (const f of store.feedback) {
			const c = m.get(f.projectId) ?? { pro: 0, con: 0 };
			c[f.kind]++;
			m.set(f.projectId, c);
		}
		return m;
	});
	const testers = $derived([...new Set(store.projects.map((p) => p.tester).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
	const tiers = $derived([...new Set(store.projects.map((p) => p.tier).filter(Boolean))].sort((a, b) => a.localeCompare(b)));

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const list = store.projects.filter((p) => {
			if (tester && p.tester !== tester) return false;
			if (status && p.status !== status) return false;
			if (tier && p.tier !== tier) return false;
			const n = bugCount.get(p.id) ?? 0;
			if (hasBugs === 'yes' && !n) return false;
			if (hasBugs === 'no' && n) return false;
			if (q) {
				const hay = [p.name, p.tester, p.tier, p.why, p.details, p.expected, p.frontendStack, p.backendStack, p.liveUrl, p.githubUrl].join(' ').toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
		const val = (p: Project): string | number => (sortKey === 'bugs' ? (bugCount.get(p.id) ?? 0) : sortKey === 'date' ? p.date || '' : (p[sortKey] ?? '').toString().toLowerCase());
		return list.sort((a, b) => {
			const x = val(a);
			const y = val(b);
			const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
			return c * sortDir || a.name.localeCompare(b.name);
		});
	});
	const anyFilter = $derived(!!(search || tester || status || tier || hasBugs));

	function clearFilters() {
		search = tester = status = tier = hasBugs = '';
	}
	function sortBy(k: SortKey) {
		if (sortKey === k) sortDir = sortDir === 1 ? -1 : 1;
		else {
			sortKey = k;
			sortDir = k === 'date' || k === 'bugs' ? -1 : 1;
		}
	}
	function openAdd() {
		editing = { mode: 'add', draft: emptyProject(store.tester) };
	}
	function openEdit(p: Project) {
		const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = p;
		editing = { mode: 'edit', id: p.id, draft };
	}
	function save(d: ProjectDraft) {
		if (!editing) return;
		if (editing.mode === 'add') {
			const id = store.addProject(d);
			ui.toast(`Added ${d.name}`);
			editing = null;
			goto(`/projects/${id}`);
		} else if (editing.id) {
			store.updateProject(editing.id, d);
			ui.toast(`Saved ${d.name}`);
			editing = null;
		}
	}
	function closeForm() {
		editing = null;
		if (page.url.searchParams.has('new')) goto('/projects', { replaceState: true, keepFocus: true, noScroll: true });
	}
	async function remove(p: Project) {
		const n = bugCount.get(p.id) ?? 0;
		const f = fbCount.get(p.id);
		const extra = [n ? plural(n, 'bug') : '', f && f.pro + f.con ? plural(f.pro + f.con, 'pro/con', 'pros/cons') : ''].filter(Boolean).join(' and ');
		const ok = await ui.ask({ title: `Delete ${p.name}?`, message: `This removes the project${extra ? ` and its ${extra}` : ''}. This can't be undone.`, confirmLabel: 'Delete project' });
		if (!ok) return;
		store.deleteProject(p.id);
		ui.toast(`Deleted ${p.name}`);
	}
	async function copy(p: Project) {
		const ok = await copyRow(p);
		ui.toast(ok ? `Copied ${p.name} row - paste it into Google Sheets` : 'Could not copy to the clipboard', ok ? 'ok' : 'err');
	}
	async function doExport() {
		const name = await exportCsv(filtered.length && anyFilter ? filtered : store.projects);
		ui.toast(`Downloaded ${name}`);
	}
	const sortIcon = (k: SortKey) => (sortKey === k ? (sortDir === 1 ? '▲' : '▼') : '');
</script>

<svelte:head><title>Projects · Designer Testing Hub</title></svelte:head>

<div class="page-head">
	<div>
		<h1 data-testid="page-title">Projects</h1>
		<p class="sub">{plural(store.projects.length, 'project')} tested with Designer. Click a project to add bugs, pros and cons.</p>
	</div>
	<div class="btn-row">
		<button type="button" class="btn" onclick={doExport} disabled={!store.projects.length} data-testid="export-csv"><Icon name="download" size={18} /> Export CSV</button>
		<a class="btn" href="/settings#sheet" data-testid="import-link"><Icon name="upload" size={18} /> Import CSV</a>
		<button type="button" class="btn yellow" onclick={openAdd} data-testid="add-project"><Icon name="plus" size={18} /> Add project</button>
	</div>
</div>

{#if store.projects.length}
	<div class="toolbar card flat" data-testid="filters">
		<label class="search">
			<span class="sr-only">Search projects</span>
			<Icon name="search" size={18} />
			<input class="input" type="search" placeholder="Search name, stack, details..." bind:value={search} data-testid="search" />
		</label>
		<label class="f"><span class="sr-only">Tester</span>
			<select class="input" bind:value={tester} data-testid="filter-tester">
				<option value="">All testers</option>
				{#each testers as t (t)}<option value={t}>{t}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Status</span>
			<select class="input" bind:value={status} data-testid="filter-status">
				<option value="">All statuses</option>
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Tier</span>
			<select class="input" bind:value={tier} data-testid="filter-tier">
				<option value="">All tiers</option>
				{#each tiers as t (t)}<option value={t}>{t}</option>{/each}
			</select>
		</label>
		<label class="f"><span class="sr-only">Has bugs</span>
			<select class="input" bind:value={hasBugs} data-testid="filter-bugs">
				<option value="">Bugs: any</option>
				<option value="yes">Has bugs</option>
				<option value="no">No bugs</option>
			</select>
		</label>
		<label class="f"><span class="sr-only">Sort by</span>
			<select class="input" value={sortKey} onchange={(e) => sortBy((e.currentTarget as HTMLSelectElement).value as SortKey)} data-testid="sort">
				<option value="date">Sort: Date</option>
				<option value="name">Sort: Name</option>
				<option value="tester">Sort: Tester</option>
				<option value="tier">Sort: Tier</option>
				<option value="status">Sort: Status</option>
				<option value="bugs">Sort: Bugs</option>
			</select>
		</label>
		<button type="button" class="btn sm icon-only" onclick={() => (sortDir = sortDir === 1 ? -1 : 1)} aria-label="Sort direction: {sortDir === 1 ? 'ascending' : 'descending'}" title="Flip sort direction" data-testid="sort-dir"><Icon name="sort" size={17} /></button>
		<div class="seg" role="group" aria-label="View">
			<button type="button" aria-pressed={view === 'table'} onclick={() => setView('table')} data-testid="view-table"><Icon name="list" size={16} /> Table</button>
			<button type="button" aria-pressed={view === 'cards'} onclick={() => setView('cards')} data-testid="view-cards"><Icon name="grid" size={16} /> Cards</button>
		</div>
	</div>
	<p class="count muted" data-testid="result-count">
		Showing {filtered.length} of {store.projects.length}
		{#if anyFilter}· <button type="button" class="linkish" onclick={clearFilters} data-testid="clear-filters">Clear filters</button>{/if}
	</p>
{/if}

{#if !store.projects.length}
	<EmptyState icon="projects" title="No projects yet" text="Add the projects you are testing with Designer, or import them from your Google Sheet." testid="projects-empty">
		<button type="button" class="btn yellow" onclick={openAdd}><Icon name="plus" size={18} /> Add project</button>
		<a class="btn" href="/settings#sheet"><Icon name="upload" size={18} /> Import CSV</a>
	</EmptyState>
{:else if !filtered.length}
	<EmptyState icon="search" title="Nothing matches" text="Try a different search or clear the filters." testid="projects-no-match">
		<button type="button" class="btn" onclick={clearFilters}>Clear filters</button>
	</EmptyState>
{:else if view === 'table'}
	<div class="table-wrap" data-testid="projects-table">
		<table class="tbl">
			<thead>
				<tr>
					<th><button type="button" class="th" onclick={() => sortBy('name')}>Product {sortIcon('name')}</button></th>
					<th><button type="button" class="th" onclick={() => sortBy('tester')}>Tester {sortIcon('tester')}</button></th>
					<th><button type="button" class="th" onclick={() => sortBy('tier')}>Tier {sortIcon('tier')}</button></th>
					<th>Links</th>
					<th>Stack</th>
					<th><button type="button" class="th" onclick={() => sortBy('status')}>Status {sortIcon('status')}</button></th>
					<th><button type="button" class="th" onclick={() => sortBy('bugs')}>Bugs {sortIcon('bugs')}</button></th>
					<th><button type="button" class="th" onclick={() => sortBy('date')}>Date {sortIcon('date')}</button></th>
					<th><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as p (p.id)}
					<tr data-testid="project-row" data-project-id={p.id}>
						<td class="name-cell">
							<a href="/projects/{p.id}" class="pname">{p.name}</a>
							{#if p.referenceUrl}<div class="ref"><LinkOut url={p.referenceUrl} label="Reference" icon="globe" /></div>{/if}
						</td>
						<td class="mono">{p.tester || '—'}</td>
						<td>{#if p.tier}<span class="tag purple">{p.tier}</span>{:else}—{/if}</td>
						<td class="links">
							{#if p.liveUrl}<LinkOut url={p.liveUrl} label="Live" icon="globe" />{/if}
							{#if p.githubUrl}<LinkOut url={p.githubUrl} label="GitHub" icon="github" />{/if}
							{#if p.readmeUrl}<LinkOut url={p.readmeUrl} label="Readme" icon="file" />{/if}
							{#if !p.liveUrl && !p.githubUrl && !p.readmeUrl}<span class="muted">—</span>{/if}
						</td>
						<td class="stack-cell">
							{#if p.frontendStack}<div><b>FE</b> {p.frontendStack}</div>{/if}
							{#if p.backendStack}<div><b>BE</b> {p.backendStack}</div>{/if}
						</td>
						<td>
							<span class="tag {p.status === 'Completed' ? 'green' : 'blue'}">{p.status}</span>
							{#if p.checked}<div class="stamp-wrap"><span class="stamp" data-testid="checked-stamp">Checked ✓</span></div>{/if}
						</td>
						<td><span class="bugn" class:has={(bugCount.get(p.id) ?? 0) > 0}>{bugCount.get(p.id) ?? 0}</span></td>
						<td class="mono nowrap">{formatDate(p.date)}</td>
						<td class="acts">
							<button type="button" class="btn sm icon-only" title="Copy row for Google Sheets" aria-label="Copy {p.name} row for Google Sheets" onclick={() => copy(p)} data-testid="copy-row"><Icon name="sheet" size={17} /></button>
							<button type="button" class="btn sm icon-only" title="Edit" aria-label="Edit {p.name}" onclick={() => openEdit(p)} data-testid="edit-project"><Icon name="edit" size={17} /></button>
							<button type="button" class="btn sm icon-only red" title="Delete" aria-label="Delete {p.name}" onclick={() => remove(p)} data-testid="delete-project"><Icon name="trash" size={17} /></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="cards" data-testid="projects-cards">
		{#each filtered as p, i (p.id)}
			{@const fc = fbCount.get(p.id) ?? { pro: 0, con: 0 }}
			<article class="pcard card wobble" style="--tilt:{((i % 3) - 1) * 0.4}deg" data-testid="project-card" data-project-id={p.id}>
				<div class="pc-top">
					<span class="tag {p.status === 'Completed' ? 'green' : 'blue'}">{p.status}</span>
					{#if p.tier}<span class="tag purple">{p.tier}</span>{/if}
					<span class="spacer"></span>
					{#if p.checked}<span class="stamp">Checked ✓</span>{:else}<span class="stamp pending">Not checked</span>{/if}
				</div>
				<h2><a href="/projects/{p.id}">{p.name}</a></h2>
				<p class="mono muted small">@{p.tester || 'unassigned'} · {formatDate(p.date)}</p>
				{#if p.details || p.why}<p class="desc">{p.details || p.why}</p>{/if}
				<div class="pc-links">
					{#if p.liveUrl}<LinkOut url={p.liveUrl} icon="globe" max={30} />{/if}
					{#if p.githubUrl}<LinkOut url={p.githubUrl} label="GitHub" icon="github" />{/if}
					{#if p.readmeUrl}<LinkOut url={p.readmeUrl} label="Readme" icon="file" />{/if}
				</div>
				<div class="pc-stats">
					<span class="tag pink"><Icon name="bug" size={14} /> {bugCount.get(p.id) ?? 0}</span>
					<span class="tag green"><Icon name="thumbUp" size={14} /> {fc.pro}</span>
					<span class="tag"><Icon name="thumbDown" size={14} /> {fc.con}</span>
				</div>
				<div class="pc-acts">
					<a class="btn sm yellow" href="/projects/{p.id}">Open</a>
					<span class="spacer"></span>
					<button type="button" class="btn sm icon-only" title="Copy row for Google Sheets" aria-label="Copy {p.name} row for Google Sheets" onclick={() => copy(p)} data-testid="copy-row"><Icon name="sheet" size={17} /></button>
					<button type="button" class="btn sm icon-only" title="Edit" aria-label="Edit {p.name}" onclick={() => openEdit(p)} data-testid="edit-project"><Icon name="edit" size={17} /></button>
					<button type="button" class="btn sm icon-only red" title="Delete" aria-label="Delete {p.name}" onclick={() => remove(p)} data-testid="delete-project"><Icon name="trash" size={17} /></button>
				</div>
			</article>
		{/each}
	</div>
{/if}

{#if editing}
	<ProjectForm initial={editing.draft} mode={editing.mode} onsave={save} oncancel={closeForm} />
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		padding: 12px;
		margin-bottom: 10px;
	}
	.search {
		flex: 1 1 240px;
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
		margin: 0 0 14px 4px;
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
	.th {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: inherit;
		text-transform: inherit;
		letter-spacing: inherit;
		cursor: pointer;
	}
	.pname {
		font-weight: 700;
		font-size: 1rem;
		text-decoration: none;
	}
	.pname:hover {
		text-decoration: underline;
	}
	.ref {
		margin-top: 6px;
	}
	.name-cell {
		min-width: 150px;
	}
	.links {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 92px;
	}
	.stack-cell {
		font-size: 0.8rem;
		min-width: 150px;
		max-width: 210px;
		color: var(--ink-soft);
	}
	.tbl td.mono {
		overflow-wrap: anywhere;
		max-width: 130px;
	}
	.stack-cell b {
		font-family: var(--mono);
		font-size: 0.72rem;
		background: var(--ink);
		color: var(--bg);
		border-radius: 4px;
		padding: 0 4px;
		margin-right: 4px;
	}
	.stamp-wrap {
		margin-top: 10px;
	}
	.bugn {
		display: inline-grid;
		place-items: center;
		min-width: 30px;
		height: 30px;
		border: 2px solid var(--line);
		border-radius: 50%;
		font-weight: 700;
		font-family: var(--mono);
	}
	.bugn.has {
		background: var(--pink);
		color: #111;
	}
	.nowrap {
		white-space: nowrap;
	}
	.acts {
		white-space: nowrap;
		width: 1%;
	}
	.acts .btn + .btn {
		margin-left: 6px;
	}
	.links :global(.link) {
		white-space: nowrap;
	}
	@media (max-width: 1280px) {
		.acts {
			white-space: normal;
		}
		.acts .btn {
			display: flex;
		}
		.acts .btn + .btn {
			margin: 6px 0 0;
		}
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 22px;
	}
	.pcard {
		display: flex;
		flex-direction: column;
		gap: 10px;
		transform: rotate(var(--tilt));
	}
	.pc-top {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
	}
	.pcard h2 a {
		text-decoration: none;
	}
	.pcard h2 a:hover {
		text-decoration: underline;
	}
	.small {
		font-size: 0.8rem;
	}
	.desc {
		font-size: 0.9rem;
		color: var(--ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.pc-links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.pc-stats {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.pc-acts {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-top: auto;
		padding-top: 10px;
		border-top: 2px dashed color-mix(in srgb, var(--line) 30%, transparent);
	}
	@media (max-width: 600px) {
		.f {
			flex: 1 1 calc(50% - 10px);
		}
	}
</style>
