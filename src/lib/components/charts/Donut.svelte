<script lang="ts">
	// SVG donut with thick black outline + legend. No chart library.
	let {
		slices,
		center = '',
		caption = '',
		testid = 'donut'
	}: { slices: Array<{ label: string; value: number; color: string }>; center?: string; caption?: string; testid?: string } = $props();

	const total = $derived(slices.reduce((s, x) => s + x.value, 0));
	const R = 40;
	const C = 2 * Math.PI * R;
	const arcs = $derived.by(() => {
		let acc = 0;
		return slices.map((s) => {
			const len = total ? (s.value / total) * C : 0;
			const a = { ...s, len, off: -acc };
			acc += len;
			return a;
		});
	});
	const desc = $derived(slices.map((s) => `${s.label}: ${s.value}`).join(', '));
</script>

<div class="donut" data-testid={testid}>
	<svg viewBox="0 0 120 120" role="img" aria-label={desc}>
		<circle cx="60" cy="60" r={R} class="ring" />
		{#if total}
			{#each arcs as a (a.label)}
				{#if a.len > 0}
					<circle cx="60" cy="60" r={R} fill="none" stroke={a.color} stroke-width="22" stroke-dasharray="{a.len} {C - a.len}" stroke-dashoffset={a.off} transform="rotate(-90 60 60)"
						><title>{a.label}: {a.value}</title></circle
					>
				{/if}
			{/each}
		{/if}
		<circle cx="60" cy="60" r="51" class="edge" />
		<circle cx="60" cy="60" r="29" class="edge" />
		<text x="60" y="58" text-anchor="middle" class="big">{center || total}</text>
		{#if caption}<text x="60" y="74" text-anchor="middle" class="small">{caption}</text>{/if}
	</svg>
	<ul class="legend">
		{#each slices as s (s.label)}
			<li><i style="background:{s.color}"></i><span>{s.label}</span><b class="mono">{s.value}</b></li>
		{/each}
	</ul>
</div>

<style>
	.donut {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
	}
	svg {
		width: 150px;
		height: 150px;
		flex: none;
	}
	.ring {
		fill: none;
		stroke: var(--bg-2);
		stroke-width: 22;
	}
	.edge {
		fill: none;
		stroke: var(--line);
		stroke-width: 3;
	}
	.big {
		font: 700 22px var(--font);
		fill: var(--ink);
	}
	.small {
		font: 700 9px var(--mono);
		fill: var(--muted);
		text-transform: uppercase;
	}
	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-width: 120px;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		font-size: 0.9rem;
	}
	.legend span {
		flex: 1;
	}
	.legend i {
		width: 16px;
		height: 16px;
		border: 2px solid var(--line);
		border-radius: 5px;
		flex: none;
	}
</style>
