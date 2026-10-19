<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';
	import { copyText } from '$lib/client.ts';
	import { MIN_WORDS, weekSummary } from '$lib/daily.ts';
	import { addDays, formatDate, isISODate, todayISO, weekday, wordCount } from '$lib/utils.ts';

	const today = todayISO();
	let date = $state(today);
	let text = $state(store.dailyFor(today)?.text ?? '');
	let loadedFor = $state(today);
	let weekOf = $state(today);

	const words = $derived(wordCount(text));
	const enough = $derived(words >= MIN_WORDS);
	const saved = $derived(store.dailyFor(date)?.text ?? '');
	const dirty = $derived(text.trim() !== saved.trim());
	const week = $derived(weekSummary(store.data.daily, weekOf, store.tester));
	const history = $derived([...store.data.daily].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14));

	async function pickDate(next: string) {
		if (!isISODate(next) || next === loadedFor) return;
		if (dirty && text.trim()) {
			const ok = await ui.ask({ title: 'Discard unsaved text?', message: `Your update for ${formatDate(loadedFor)} isn't saved yet.`, confirmLabel: 'Discard', danger: true });
			if (!ok) {
				date = loadedFor;
				return;
			}
		}
		date = next;
		loadedFor = next;
		text = store.dailyFor(next)?.text ?? '';
		weekOf = next;
	}
	function save(e?: Event) {
		e?.preventDefault();
		if (!enough) {
			ui.toast(`Write at least ${MIN_WORDS} words (${MIN_WORDS - words} more to go)`, 'err');
			return;
		}
		if (store.saveDaily(date, text.trim())) ui.toast(`Saved update for ${formatDate(date)}`);
	}
	async function copyToday() {
		const t = text.trim() || saved;
		if (!t) return ui.toast('Nothing to copy yet', 'err');
		const ok = await copyText(t);
		ui.toast(ok ? 'Update copied' : 'Could not copy to the clipboard', ok ? 'ok' : 'err');
	}
	async function copyWeek() {
		const ok = await copyText(week.text);
		ui.toast(ok ? 'Weekly summary copied' : 'Could not copy to the clipboard', ok ? 'ok' : 'err');
	}
	async function remove(d: string) {
		if (!(await ui.ask({ title: 'Delete this update?', message: `The update for ${formatDate(d)} will be removed.`, confirmLabel: 'Delete update' }))) return;
		store.deleteDaily(d);
		if (d === date) text = '';
		ui.toast('Update deleted');
	}
	function onkey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
	}
</script>

<svelte:head><title>Daily Update · Designer Testing Hub</title></svelte:head>

<div class="page-head">
	<div>
		<h1 data-testid="page-title">Daily update</h1>
		<p class="sub">A short note each day, saved by date. Copy it for your standup, or copy the whole week.</p>
	</div>
</div>

<div class="layout">
	<form class="card yellow box" onsubmit={save} data-testid="daily-form">
		<div class="row top">
			<label for="daily-text"><h2>What did you work on?</h2></label>
			<span class="spacer"></span>
			<label class="date-pick">
				<span class="sr-only">Date</span>
				<button type="button" class="btn sm icon-only" aria-label="Previous day" onclick={() => pickDate(addDays(date, -1))} data-testid="daily-prev"><Icon name="arrowLeft" size={16} /></button>
				<input class="input" type="date" value={date} max={today} onchange={(e) => pickDate((e.currentTarget as HTMLInputElement).value)} data-testid="daily-date" />
				<button type="button" class="btn sm icon-only flip" aria-label="Next day" disabled={date >= today} onclick={() => pickDate(addDays(date, 1))} data-testid="daily-next"><Icon name="arrowLeft" size={16} /></button>
			</label>
		</div>
		<textarea id="daily-text" class="input" rows="7" bind:value={text} onkeydown={onkey} placeholder="e.g. Tested PowerWise with Designer: checked the bill prediction, logged 2 bugs and compared the PDF report with Cursor." data-testid="daily-text"></textarea>
		<div class="row foot">
			<span class="counter" class:ok={enough} data-testid="word-count" aria-live="polite">
				<b>{words}</b> / {MIN_WORDS} words {enough ? '✓' : `· ${MIN_WORDS - words} more`}
			</span>
			<div class="meter" aria-hidden="true"><i style="width:{Math.min(100, (words / MIN_WORDS) * 100)}%"></i></div>
			<span class="spacer"></span>
			{#if saved && !dirty}<span class="savedtag mono" data-testid="daily-saved">Saved ✓</span>{:else if dirty && saved}<span class="savedtag mono warn">Unsaved changes</span>{/if}
			<button type="button" class="btn" onclick={copyToday} data-testid="daily-copy"><Icon name="copy" size={17} /> Copy</button>
			<button type="submit" class="btn ink" disabled={!enough || !dirty} data-testid="daily-save"><Icon name="check" size={17} /> Save</button>
		</div>
		<p class="hint mono">{weekday(date)} · {formatDate(date)} · Ctrl/Cmd + Enter to save</p>
	</form>

	<section class="card week" data-testid="weekly-summary">
		<div class="card-title">
			<h2>Weekly summary</h2>
			<div class="row">
				<button type="button" class="btn sm icon-only" aria-label="Previous week" onclick={() => (weekOf = addDays(week.start, -7))} data-testid="week-prev"><Icon name="arrowLeft" size={16} /></button>
				<button type="button" class="btn sm icon-only flip" aria-label="Next week" disabled={week.end >= today} onclick={() => (weekOf = addDays(week.start, 7))} data-testid="week-next"><Icon name="arrowLeft" size={16} /></button>
			</div>
		</div>
		<p class="mono small">{formatDate(week.start)} – {formatDate(week.end)} · {week.written}/7 days · {week.words} words</p>
		<ul class="days">
			{#each week.days as d (d.date)}
				<li class:has={!!d.entry} class:today={d.date === today}>
					<button type="button" class="day" onclick={() => pickDate(d.date)} disabled={d.date > today} title={d.entry?.text ?? 'No update'}>
						<b>{weekday(d.date)}</b>
						<span class="mono">{Number(d.date.slice(8))}</span>
					</button>
				</li>
			{/each}
		</ul>
		<pre class="summary" data-testid="week-text">{week.text}</pre>
		<button type="button" class="btn blue" onclick={copyWeek} data-testid="week-copy"><Icon name="copy" size={17} /> Copy weekly summary</button>
	</section>
</div>

<section class="card hist" data-testid="daily-history">
	<div class="card-title"><h2>Recent updates</h2></div>
	{#if history.length}
		<ul>
			{#each history as h (h.date)}
				<li>
					<button type="button" class="hdate mono" onclick={() => pickDate(h.date)}>{weekday(h.date)} {formatDate(h.date)}</button>
					<p>{h.text}</p>
					<span class="mono muted small">{wordCount(h.text)} words</span>
					<button type="button" class="btn sm icon-only red" aria-label="Delete update for {formatDate(h.date)}" onclick={() => remove(h.date)} data-testid="daily-delete"><Icon name="trash" size={16} /></button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">No updates yet. Write your first one above.</p>
	{/if}
</section>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
		margin-bottom: 20px;
	}
	.box {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.box :global(.btn:not(.ink)) {
		--btn-bg: #fff;
		--btn-fg: #111;
		border-color: #111;
		box-shadow: 3px 3px 0 #111;
	}
	.box :global(.btn.ink) {
		--btn-bg: #111;
		--btn-fg: var(--yellow);
		border-color: #111;
		box-shadow: 3px 3px 0 #111;
	}
	.box .input {
		background: #fff;
		color: #111;
		border-color: #111;
	}
	.top {
		align-items: center;
	}
	.date-pick {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.date-pick .input {
		width: auto;
		min-height: 36px;
		padding: 4px 10px;
		font-family: var(--mono);
		font-size: 0.85rem;
	}
	.flip :global(svg) {
		transform: scaleX(-1);
	}
	textarea {
		font-size: 1.05rem;
		min-height: 170px;
	}
	.foot {
		align-items: center;
	}
	.counter {
		font-family: var(--mono);
		font-size: 0.88rem;
		background: #fff;
		color: #111;
		border: 2px solid #111;
		border-radius: 999px;
		padding: 4px 12px;
	}
	.counter.ok {
		background: var(--green);
	}
	.meter {
		width: 90px;
		height: 12px;
		border: 2px solid #111;
		border-radius: 999px;
		background: #fff;
		overflow: hidden;
	}
	.meter i {
		display: block;
		height: 100%;
		background: #111;
		transition: width 0.15s;
	}
	.savedtag {
		font-size: 0.8rem;
		font-weight: 700;
	}
	.savedtag.warn {
		color: #8a1c1c;
	}
	.hint {
		font-size: 0.75rem;
	}
	.small {
		font-size: 0.8rem;
	}
	.week {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.days {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 6px;
	}
	.day {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 0;
		font: 700 0.75rem var(--font);
		color: var(--ink);
		background: var(--bg-2);
		border: 2px solid var(--line);
		border-radius: 10px;
		cursor: pointer;
	}
	.day:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.has .day {
		background: var(--green);
		color: #111;
	}
	.today .day {
		box-shadow: 3px 3px 0 var(--line);
	}
	.summary {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font: 0.8rem/1.5 var(--mono);
		background: var(--bg-2);
		border: 2px dashed var(--line);
		border-radius: 10px;
		padding: 10px;
		max-height: 260px;
		overflow-y: auto;
	}
	.hist ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.hist li {
		display: grid;
		grid-template-columns: 150px 1fr auto auto;
		gap: 12px;
		align-items: start;
		padding: 12px 0;
		border-bottom: 2px dashed color-mix(in srgb, var(--line) 25%, transparent);
	}
	.hist li:last-child {
		border-bottom: 0;
	}
	.hdate {
		background: none;
		border: 0;
		padding: 0;
		font-weight: 700;
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.hdate:hover {
		text-decoration: underline;
	}
	.hist p {
		font-size: 0.92rem;
		overflow-wrap: anywhere;
	}
	@media (max-width: 980px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 600px) {
		.hist li {
			grid-template-columns: 1fr auto;
		}
		.hist li p {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.hist li .small {
			display: none;
		}
	}
</style>
