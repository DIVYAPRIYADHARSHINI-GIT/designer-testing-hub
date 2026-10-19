<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';
	import { downloadText, postJson } from '$lib/client.ts';
	import { exportCsv } from '$lib/sheet.ts';
	import { FIELD_LABELS, SHEET_HEADERS, importCsv, type ImportResult } from '$lib/csv.ts';
	import { normalizeData } from '$lib/data.ts';
	import { plural, todayISO } from '$lib/utils.ts';

	let tester = $state(store.tester);
	let preview = $state<(ImportResult & { fileName: string }) | null>(null);
	let updateExisting = $state(true);
	let busy = $state(false);
	let csvInput = $state<HTMLInputElement>();
	let jsonInput = $state<HTMLInputElement>();
	let dragging = $state(false);

	const counts = $derived(`${plural(store.projects.length, 'project')}, ${plural(store.bugs.length, 'bug')}, ${plural(store.feedback.length, 'pro/con', 'pros/cons')}, ${plural(store.data.daily.length, 'daily update')}`);

	function saveTester(e: Event) {
		e.preventDefault();
		store.setTester(tester);
		ui.toast(tester.trim() ? `Tester name set to ${tester.trim()}` : 'Tester name cleared');
	}

	async function readCsv(file: File) {
		if (file.size > 5_000_000) return ui.toast('CSV is too large (max 5 MB)', 'err');
		busy = true;
		try {
			const csv = await file.text();
			let res: ImportResult;
			try {
				res = await postJson<ImportResult>('/api/csv/import', { csv, tester: store.tester });
			} catch (e) {
				// Server unreachable: same parser, in the browser.
				if (e instanceof Error && /CSV|rows|empty/i.test(e.message)) throw e;
				res = importCsv(csv, store.tester);
			}
			preview = { ...res, fileName: file.name };
			if (!res.drafts.length) ui.toast(res.warnings[0] ?? 'No projects found in that file', 'err');
		} catch (e) {
			ui.toast(e instanceof Error ? e.message : 'Could not read that CSV', 'err');
		} finally {
			busy = false;
			if (csvInput) csvInput.value = '';
		}
	}
	function onCsvPick(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (f) readCsv(f);
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const f = e.dataTransfer?.files?.[0];
		if (f) readCsv(f);
	}
	function confirmImport() {
		if (!preview?.drafts.length) return;
		const { added, updated } = store.importDrafts(preview.drafts, updateExisting, preview.mapped);
		ui.toast(`Imported: ${plural(added, 'new project')}${updated ? `, ${updated} updated` : ''}`);
		preview = null;
	}
	async function doExportCsv() {
		ui.toast(`Downloaded ${await exportCsv(store.projects)}`);
	}
	function downloadTemplate() {
		downloadText('\uFEFF' + SHEET_HEADERS.join(',') + '\r\n', 'Designer_Testing_Sheet_Template.csv', 'text/csv;charset=utf-8');
	}

	function exportJson() {
		const snap = store.snapshot();
		downloadText(JSON.stringify({ app: 'designer-testing-hub', exportedAt: new Date().toISOString(), ...snap }, null, 2), `Designer_Testing_Hub_Backup_${todayISO()}.json`, 'application/json');
		ui.toast('Backup downloaded');
	}
	async function importJson(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		input.value = '';
		if (!f) return;
		if (f.size > 20_000_000) return ui.toast('Backup file is too large', 'err');
		let data;
		try {
			data = normalizeData(JSON.parse(await f.text()));
		} catch {
			data = null;
		}
		if (!data) return ui.toast("That file isn't a Testing Hub JSON backup", 'err');
		const ok = await ui.ask({
			title: 'Replace all data?',
			message: `The backup has ${plural(data.projects.length, 'project')}, ${plural(data.bugs.length, 'bug')} and ${plural(data.feedback.length, 'pro/con', 'pros/cons')}. Your current data (${counts}) will be replaced.`,
			confirmLabel: 'Replace data'
		});
		if (!ok) return;
		store.replaceAll(data);
		tester = store.tester;
		ui.toast('Backup restored');
	}
	async function startFresh() {
		const ok = await ui.ask({ title: 'Start fresh?', message: `This deletes everything in this browser (${counts}). Export a JSON backup first if you want to keep it.`, confirmLabel: 'Delete everything' });
		if (!ok) return;
		store.startFresh();
		ui.toast('All clear - start adding your projects');
	}
	async function loadSample() {
		const ok = await ui.ask({ title: 'Load sample data?', message: `This replaces your current data (${counts}) with the 5 sample projects.`, confirmLabel: 'Load sample', danger: false });
		if (!ok) return;
		store.loadSample();
		tester = store.tester;
		ui.toast('Sample data loaded');
	}
</script>

<svelte:head><title>Settings · Designer Testing Hub</title></svelte:head>

<div class="page-head">
	<div>
		<h1 data-testid="page-title">Settings</h1>
		<p class="sub">Your name, Google Sheets sync, backups and theme. Data is stored only in this browser.</p>
	</div>
</div>

<div class="grid-s">
	<form class="card" onsubmit={saveTester} data-testid="settings-tester">
		<h2>Tester</h2>
		<p class="muted">Used for new projects and as "Name" / "Reported by" in reports.</p>
		<div class="row">
			<label class="field grow"><span class="sr-only">Tester name</span><input class="input" bind:value={tester} placeholder="Your name" maxlength="120" data-testid="tester-input" /></label>
			<button type="submit" class="btn yellow" data-testid="tester-save">Save</button>
		</div>
	</form>

	<section class="card" data-testid="settings-theme">
		<h2>Theme</h2>
		<p class="muted">Bold light mode or dark brutalist mode with neon colours.</p>
		<div class="seg" role="group" aria-label="Theme">
			<button type="button" aria-pressed={ui.theme === 'light'} onclick={() => ui.setTheme('light')} data-testid="theme-light"><Icon name="sun" size={16} /> Light</button>
			<button type="button" aria-pressed={ui.theme === 'dark'} onclick={() => ui.setTheme('dark')} data-testid="theme-dark"><Icon name="moon" size={16} /> Dark</button>
		</div>
	</section>

	<section class="card wide" id="sheet" data-testid="settings-sheet">
		<h2>Google Sheets sync</h2>
		<p class="muted">In Google Sheets choose <b>File → Download → Comma-separated values (.csv)</b>, then import it here. Columns are matched automatically by header name.</p>
		<div
			class="drop"
			class:dragging
			role="button"
			tabindex="0"
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={onDrop}
			onclick={() => csvInput?.click()}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), csvInput?.click())}
			data-testid="csv-drop"
		>
			{#if busy}<span class="spinner"></span> Reading CSV...{:else}<Icon name="upload" size={26} /> <b>Drop a CSV here</b> or click to choose a file{/if}
		</div>
		<input bind:this={csvInput} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" class="sr-only" onchange={onCsvPick} data-testid="csv-input" />
		<div class="btn-row" style="margin-top:14px">
			<button type="button" class="btn blue" onclick={doExportCsv} disabled={!store.projects.length} data-testid="settings-export-csv"><Icon name="download" size={18} /> Export all projects as CSV</button>
			<button type="button" class="btn sm" onclick={downloadTemplate} data-testid="csv-template"><Icon name="sheet" size={16} /> Blank sheet template</button>
		</div>
		<p class="muted small">Tip: on any project, "Copy row for Google Sheets" copies it as tab-separated text, so you can paste it straight into a sheet row.</p>
	</section>

	<section class="card" data-testid="settings-backup">
		<h2>JSON backup</h2>
		<p class="muted">Move everything (projects, bugs, pros/cons, daily updates) to another browser.</p>
		<p class="mono small">{counts}</p>
		<div class="btn-row">
			<button type="button" class="btn green" onclick={exportJson} data-testid="json-export"><Icon name="download" size={18} /> Export JSON</button>
			<button type="button" class="btn" onclick={() => jsonInput?.click()} data-testid="json-import-btn"><Icon name="upload" size={18} /> Import JSON</button>
			<input bind:this={jsonInput} type="file" accept=".json,application/json" class="sr-only" onchange={importJson} data-testid="json-input" />
		</div>
	</section>

	<section class="card danger" data-testid="settings-data">
		<h2>Data</h2>
		<p class="muted">{store.data.sample ? 'You are looking at the pre-loaded sample data.' : 'Your own data.'}</p>
		<div class="btn-row">
			<button type="button" class="btn red" onclick={startFresh} data-testid="start-fresh"><Icon name="trash" size={18} /> Start fresh</button>
			<button type="button" class="btn" onclick={loadSample} data-testid="load-sample"><Icon name="refresh" size={18} /> Load sample data</button>
		</div>
	</section>
</div>

{#if preview}
	{@const p = preview}
	<div class="overlay" role="presentation">
		<div class="card dlg" role="dialog" aria-modal="true" aria-labelledby="imp-title" data-testid="import-preview">
			<h2 id="imp-title">Import {plural(p.drafts.length, 'project')}?</h2>
			<p class="mono small">{p.fileName}{p.skipped ? ` · ${p.skipped} empty rows skipped` : ''}</p>
			<h3>Column mapping</h3>
			<ul class="map" data-testid="import-mapping">
				{#each p.columns as c, i (i)}
					<li class:unmapped={!c.field}><span class="mono">{c.header || '(blank)'}</span> <b>→</b> {c.field ? FIELD_LABELS[c.field] : 'ignored'}</li>
				{/each}
			</ul>
			{#if p.warnings.length}
				<ul class="warn">{#each p.warnings as w (w)}<li>{w}</li>{/each}</ul>
			{/if}
			{#if p.drafts.length}
				<div class="table-wrap prev">
					<table class="tbl">
						<thead><tr><th>Product</th><th>Tester</th><th>Status</th><th>Live</th></tr></thead>
						<tbody>
							{#each p.drafts.slice(0, 6) as d, i (i)}
								<tr><td><b>{d.name}</b></td><td class="mono">{d.tester || '—'}</td><td>{d.status}</td><td class="mono small">{d.liveUrl || '—'}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if p.drafts.length > 6}<p class="muted small">+ {p.drafts.length - 6} more</p>{/if}
				<label class="check"><input type="checkbox" bind:checked={updateExisting} data-testid="import-update" /> Update projects that already exist (same name + tester)</label>
			{/if}
			<div class="btn-row end">
				<button type="button" class="btn" onclick={() => (preview = null)} data-testid="import-cancel">Cancel</button>
				<button type="button" class="btn yellow" onclick={confirmImport} disabled={!p.drafts.length} data-testid="import-confirm"><Icon name="upload" size={18} /> Import</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.grid-s {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	.grid-s > * {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.grow {
		flex: 1 1 200px;
	}
	.small {
		font-size: 0.8rem;
	}
	.seg {
		align-self: flex-start;
	}
	.drop {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
		text-align: center;
		min-height: 110px;
		padding: 18px;
		border: var(--bw) dashed var(--line);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--blue) 12%, var(--card));
		cursor: pointer;
		font-weight: 500;
	}
	.drop:hover,
	.drop.dragging {
		background: color-mix(in srgb, var(--blue) 30%, var(--card));
		transform: rotate(-0.4deg);
	}
	.danger {
		background: repeating-linear-gradient(-45deg, var(--card), var(--card) 14px, color-mix(in srgb, var(--red) 8%, var(--card)) 14px, color-mix(in srgb, var(--red) 8%, var(--card)) 28px);
	}
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 14px;
		background: color-mix(in srgb, #111 55%, transparent);
	}
	.dlg {
		width: min(760px, 100%);
		max-height: calc(100dvh - 28px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: 8px 8px 0 var(--line);
	}
	.dlg h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.map {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 6px;
		font-size: 0.85rem;
	}
	.map li {
		border: 2px solid var(--line);
		border-radius: 8px;
		padding: 4px 8px;
		background: color-mix(in srgb, var(--green) 25%, var(--card));
		overflow-wrap: anywhere;
	}
	.map li.unmapped {
		background: var(--bg-2);
		color: var(--muted);
	}
	.warn {
		margin: 0;
		padding: 10px 10px 10px 28px;
		border: 2px solid var(--line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--orange) 25%, var(--card));
		font-size: 0.85rem;
	}
	.prev {
		box-shadow: none;
	}
	.end {
		justify-content: flex-end;
	}
	@media (max-width: 760px) {
		.grid-s {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
