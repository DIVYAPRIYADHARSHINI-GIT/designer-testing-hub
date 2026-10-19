<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import BarChart from '$lib/components/charts/BarChart.svelte';
	import Donut from '$lib/components/charts/Donut.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { store } from '$lib/store.svelte.ts';
	import { dashboardStats } from '$lib/stats.ts';
	import { formatDate, plural } from '$lib/utils.ts';

	const s = $derived(dashboardStats(store.data));
	const recent = $derived([...store.projects].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt).slice(0, 5));
	const pct = $derived(s.total ? Math.round((s.completed / s.total) * 100) : 0);
	const sevColor = { High: 'var(--sev-high)', Medium: 'var(--sev-medium)', Low: 'var(--sev-low)' };
</script>

<svelte:head><title>Dashboard · Designer Testing Hub</title></svelte:head>

<section class="hero card yellow">
	<div>
		<span class="kicker">Designer AI · QA</span>
		<h1 data-testid="page-title">Test. Track. <span class="pink-hl">Report.</span></h1>
		<p class="lead">Every Designer test project, bug, pro and con in one place, with ready-to-send PDF reports in one click.</p>
	</div>
	<div class="btn-row">
		<a class="btn ink" href="/projects?new=1" data-testid="hero-add"><Icon name="plus" size={18} /> Add project</a>
		<a class="btn" href="/reports"><Icon name="report" size={18} /> Make a report</a>
	</div>
</section>

{#if !s.total}
	<EmptyState icon="projects" title="No projects yet" text="Add your first Designer test project or import your Google Sheet as CSV. You can also reload the sample data from Settings." testid="dash-empty">
		<a class="btn yellow" href="/projects?new=1"><Icon name="plus" size={18} /> Add project</a>
		<a class="btn" href="/settings#sheet"><Icon name="upload" size={18} /> Import CSV</a>
	</EmptyState>
{:else}
	<div class="kpis" data-testid="kpis">
		<a class="kpi card wobble" href="/projects" style="--tilt:-0.6deg" data-testid="kpi-total">
			<span class="k">Total projects</span>
			<b class="v">{s.total}</b>
			<span class="sub">{s.checked} checked ✓</span>
		</a>
		<a class="kpi card green wobble" href="/projects?status=Completed" style="--tilt:0.5deg" data-testid="kpi-completed">
			<span class="k">Completed</span>
			<b class="v">{s.completed}</b>
			<span class="sub">{pct}% done</span>
		</a>
		<a class="kpi card blue wobble" href="/projects?status=In%20progress" style="--tilt:-0.4deg" data-testid="kpi-progress">
			<span class="k">In progress</span>
			<b class="v">{s.inProgress}</b>
			<span class="sub">{plural(s.inProgress, 'project')} to finish</span>
		</a>
		<a class="kpi card pink wobble" href="/bugs" style="--tilt:0.7deg" data-testid="kpi-bugs">
			<span class="k">Bugs logged</span>
			<b class="v">{s.bugs}</b>
			<span class="sub">{s.openBugs} not fixed yet</span>
		</a>
	</div>

	<div class="progress card flat" aria-label="Completion {pct}%">
		<span class="label">Completed vs in progress</span>
		<div class="pbar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
			<div class="done" style="width:{pct}%"><span>{s.completed} completed</span></div>
			{#if s.inProgress}<div class="todo"><span>{s.inProgress} in progress</span></div>{/if}
		</div>
	</div>

	<div class="charts">
		<section class="card" data-testid="chart-severity">
			<div class="card-title"><h2>Bugs by severity</h2><a class="btn sm" href="/bugs">All bugs</a></div>
			<Donut slices={[{ label: 'High', value: s.bySeverity.High, color: sevColor.High }, { label: 'Medium', value: s.bySeverity.Medium, color: sevColor.Medium }, { label: 'Low', value: s.bySeverity.Low, color: sevColor.Low }]} caption="bugs" testid="donut-severity" />
		</section>
		<section class="card" data-testid="chart-proscons">
			<div class="card-title"><h2>Pros vs cons</h2></div>
			<Donut slices={[{ label: 'Pros', value: s.pros, color: 'var(--green)' }, { label: 'Cons', value: s.cons, color: 'var(--pink)' }]} caption="items" testid="donut-proscons" />
			<p class="muted small">{s.pros >= s.cons ? 'Designer is winning so far.' : 'More cons than pros: worth a bug report.'}</p>
		</section>
		<section class="card wide" data-testid="chart-per-project">
			<div class="card-title"><h2>Bugs per project</h2></div>
			{#if s.bugs}
				<BarChart
					rows={s.perProject.map((p) => ({ label: p.name, href: `/projects/${p.id}`, segments: [{ label: 'High', value: p.High, color: sevColor.High }, { label: 'Medium', value: p.Medium, color: sevColor.Medium }, { label: 'Low', value: p.Low, color: sevColor.Low }] }))}
					legend={[{ label: 'High', color: sevColor.High }, { label: 'Medium', color: sevColor.Medium }, { label: 'Low', color: sevColor.Low }]}
					unit="bugs"
					testid="bars-per-project"
				/>
			{:else}
				<p class="muted">No bugs logged yet. Nice!</p>
			{/if}
		</section>
		<section class="card wide" data-testid="chart-testers">
			<div class="card-title"><h2>Tester-wise progress</h2></div>
			<BarChart
				rows={s.testers.map((t) => ({ label: t.tester, href: `/projects?tester=${encodeURIComponent(t.tester)}`, segments: [{ label: 'Completed', value: t.completed, color: 'var(--green)' }, { label: 'In progress', value: t.inProgress, color: 'var(--blue)' }] }))}
				legend={[{ label: 'Completed', color: 'var(--green)' }, { label: 'In progress', color: 'var(--blue)' }]}
				unit="projects"
				testid="bars-testers"
			/>
		</section>
	</div>

	<section class="card recent">
		<div class="card-title"><h2>Latest projects</h2><a class="btn sm" href="/projects">See all</a></div>
		<ul>
			{#each recent as p (p.id)}
				<li>
					<a href="/projects/{p.id}" class="rp">
						<b>{p.name}</b>
						<span class="mono muted">{formatDate(p.date)}</span>
					</a>
					<span class="tag {p.status === 'Completed' ? 'green' : 'blue'}">{p.status}</span>
					{#if p.checked}<span class="stamp">Checked ✓</span>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 18px;
		padding: 26px;
		margin-bottom: 22px;
	}
	.hero h1 {
		margin: 12px 0 8px;
	}
	.pink-hl {
		background: var(--pink);
		border: var(--bw) solid #111;
		border-radius: 12px;
		padding: 0 10px;
		display: inline-block;
		transform: rotate(-2deg);
		box-shadow: 4px 4px 0 #111;
	}
	.lead {
		max-width: 52ch;
		font-weight: 500;
	}
	.hero .kicker {
		background: #111;
		color: var(--yellow);
	}
	.hero :global(.btn:not(.ink)) {
		--btn-bg: #fff;
		--btn-fg: #111;
		border-color: #111;
		box-shadow: 3px 3px 0 #111;
	}
	.hero :global(.btn.ink) {
		--btn-bg: #111;
		--btn-fg: var(--yellow);
		border-color: #111;
		box-shadow: 3px 3px 0 #111;
	}
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 18px;
		margin-bottom: 18px;
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-decoration: none;
		transform: rotate(var(--tilt));
	}
	.kpi .k {
		font-weight: 700;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.kpi .v {
		font-size: 3rem;
		line-height: 1.05;
		letter-spacing: -0.04em;
	}
	.kpi .sub {
		font-family: var(--mono);
		font-size: 0.78rem;
	}
	.progress {
		margin-bottom: 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.pbar {
		display: flex;
		height: 36px;
		border: var(--bw) solid var(--line);
		border-radius: 999px;
		overflow: hidden;
		background: var(--blue);
		box-shadow: var(--shadow-sm);
	}
	.pbar > div {
		display: flex;
		align-items: center;
		padding: 0 12px;
		font-weight: 700;
		font-size: 0.82rem;
		color: #111;
		white-space: nowrap;
		overflow: hidden;
	}
	.done {
		background: var(--green);
		border-right: var(--bw) solid var(--line);
	}
	.done[style='width:0%'] {
		border-right: 0;
		padding: 0;
	}
	.todo {
		flex: 1;
		justify-content: flex-end;
	}
	.charts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		margin-bottom: 18px;
	}
	.small {
		font-size: 0.85rem;
		margin-top: 12px;
	}
	.recent ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.recent li {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 10px 0;
		border-bottom: 2px dashed color-mix(in srgb, var(--line) 25%, transparent);
	}
	.recent li:last-child {
		border-bottom: 0;
	}
	.rp {
		flex: 1;
		display: flex;
		gap: 12px;
		align-items: baseline;
		flex-wrap: wrap;
		text-decoration: none;
		min-width: 0;
	}
	.rp:hover b {
		text-decoration: underline;
	}
	@media (max-width: 1100px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		.charts {
			grid-template-columns: minmax(0, 1fr);
		}
		.kpi .v {
			font-size: 2.4rem;
		}
		.hero {
			padding: 20px;
		}
	}
	@media (max-width: 420px) {
		.kpis {
			gap: 12px;
		}
	}
</style>
