<script lang="ts">
	// Horizontal stacked bar chart in plain SVG (percentage geometry, so it
	// scales to any width without distorting text). No chart library.
	export interface Segment {
		value: number;
		color: string;
		label: string;
	}
	export interface BarRow {
		label: string;
		href?: string;
		segments: Segment[];
	}
	let { rows, legend = [], testid = 'bar-chart', unit = '' }: { rows: BarRow[]; legend?: Array<{ label: string; color: string }>; testid?: string; unit?: string } = $props();

	const totals = $derived(rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)));
	const max = $derived(Math.max(1, ...totals));
	const desc = $derived(rows.map((r, i) => `${r.label}: ${totals[i]}${unit ? ' ' + unit : ''}`).join(', '));

	function offsets(segs: Segment[]) {
		let acc = 0;
		return segs.map((s) => {
			const x = acc;
			acc += s.value;
			return { ...s, x: (x / max) * 100, w: (s.value / max) * 100 };
		});
	}
</script>

<div class="chart" role="img" aria-label={desc} data-testid={testid}>
	{#each rows as row, i (row.label + i)}
		<div class="row">
			<div class="lbl" title={row.label}>
				{#if row.href}<a href={row.href}>{row.label}</a>{:else}{row.label}{/if}
			</div>
			<svg class="bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
				<rect x="0" y="0" width="100" height="10" class="track" />
				{#each offsets(row.segments) as s (s.label)}
					{#if s.w > 0}<rect x={s.x} y="0" width={s.w} height="10" fill={s.color}><title>{s.label}: {s.value}</title></rect>{/if}
				{/each}
			</svg>
			<div class="val mono">{totals[i]}</div>
		</div>
	{/each}
	{#if legend.length}
		<div class="legend">
			{#each legend as l (l.label)}<span><i style="background:{l.color}"></i>{l.label}</span>{/each}
		</div>
	{/if}
</div>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(70px, 30%) 1fr 2.4em;
		align-items: center;
		gap: 10px;
	}
	.lbl {
		font-weight: 700;
		font-size: 0.88rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lbl a {
		text-decoration: none;
	}
	.lbl a:hover {
		text-decoration: underline;
	}
	.bar {
		width: 100%;
		height: 24px;
		display: block;
		border: var(--bw) solid var(--line);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 2px 2px 0 var(--line);
	}
	.track {
		fill: var(--bg-2);
	}
	.val {
		font-weight: 700;
		text-align: right;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 4px;
		font-size: 0.82rem;
		font-weight: 700;
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.legend i {
		width: 14px;
		height: 14px;
		border: 2px solid var(--line);
		border-radius: 4px;
		display: inline-block;
	}
</style>
