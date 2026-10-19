<script lang="ts">
	// Add / edit a project. Fields match the team's Google Sheet columns.
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import UrlInput from './UrlInput.svelte';
	import type { ProjectDraft } from '$lib/types.ts';
	import { LINK_FIELDS, STATUSES, TIER_SUGGESTIONS } from '$lib/types.ts';
	import { isISODate, isValidUrl, normalizeUrl, todayISO } from '$lib/utils.ts';
	import { store } from '$lib/store.svelte.ts';

	let {
		initial,
		mode = 'add',
		onsave,
		oncancel
	}: { initial: ProjectDraft; mode?: 'add' | 'edit'; onsave: (d: ProjectDraft) => void; oncancel: () => void } = $props();

	let d = $state<ProjectDraft>(untrack(() => ({ ...initial, date: initial.date || todayISO() })));
	let showErrors = $state(false);

	const testers = $derived([...new Set([store.tester, ...store.projects.map((p) => p.tester)].filter(Boolean))].sort());
	const tiers = $derived([...new Set([...TIER_SUGGESTIONS, ...store.projects.map((p) => p.tier)].filter(Boolean))].sort());
	const nameErr = $derived(showErrors && !d.name.trim());
	const testerErr = $derived(showErrors && !d.tester.trim());
	const dateErr = $derived(showErrors && !!d.date && !isISODate(d.date));

	function submit(e: Event) {
		e.preventDefault();
		showErrors = true;
		const linksOk = LINK_FIELDS.every((k) => isValidUrl(d[k]));
		if (!d.name.trim() || !d.tester.trim() || !linksOk || (d.date && !isISODate(d.date))) {
			queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid=project-form] [aria-invalid=true]')?.focus());
			return;
		}
		const out: ProjectDraft = { ...d, name: d.name.trim(), tester: d.tester.trim(), tier: d.tier.trim() };
		for (const k of LINK_FIELDS) out[k] = normalizeUrl(out[k]);
		onsave(out);
	}
</script>

<Modal title={mode === 'add' ? 'Add project' : `Edit ${initial.name || 'project'}`} onclose={oncancel} wide testid="project-modal">
	<form class="form-grid" onsubmit={submit} novalidate data-testid="project-form" id="project-form">
		<label class="field">
			<span>Product name *</span>
			<input class="input" bind:value={d.name} aria-invalid={nameErr} placeholder="e.g. PowerWise" data-testid="pf-name" maxlength="200" />
			{#if nameErr}<span class="err">Product name is required</span>{/if}
		</label>
		<label class="field">
			<span>Tester name *</span>
			<input class="input" bind:value={d.tester} aria-invalid={testerErr} list="pf-testers" placeholder="Your name" data-testid="pf-tester" maxlength="120" />
			<datalist id="pf-testers">{#each testers as t (t)}<option value={t}></option>{/each}</datalist>
			{#if testerErr}<span class="err">Tester name is required</span>{/if}
		</label>
		<label class="field">
			<span>Tier</span>
			<input class="input" bind:value={d.tier} list="pf-tiers" placeholder="Tier 1 / Tier 2 / Tier 3" data-testid="pf-tier" maxlength="60" />
			<datalist id="pf-tiers">{#each tiers as t (t)}<option value={t}></option>{/each}</datalist>
		</label>
		<label class="field">
			<span>Date</span>
			<input class="input" type="date" bind:value={d.date} aria-invalid={dateErr} data-testid="pf-date" />
		</label>
		<label class="field">
			<span>Status</span>
			<select class="input" bind:value={d.status} data-testid="pf-status">
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<div class="field">
			<span class="label">Checked</span>
			<label class="check" style="min-height:44px"><input type="checkbox" bind:checked={d.checked} data-testid="pf-checked" /> Yes, this project has been checked</label>
		</div>
		<div class="full"><UrlInput label="Reference website link" bind:value={d.referenceUrl} {showErrors} testid="pf-reference" hint="The site or product this project is inspired by" /></div>
		<label class="field full">
			<span>Why it's interesting</span>
			<textarea class="input" rows="2" bind:value={d.why} data-testid="pf-why" placeholder="What does this project test in Designer?"></textarea>
		</label>
		<label class="field full">
			<span>Product details</span>
			<textarea class="input" rows="3" bind:value={d.details} data-testid="pf-details" placeholder="Features, pages, data..."></textarea>
		</label>
		<label class="field full">
			<span>Expected output</span>
			<textarea class="input" rows="2" bind:value={d.expected} data-testid="pf-expected" placeholder="What should the finished app do?"></textarea>
		</label>
		<label class="field">
			<span>Frontend stack</span>
			<input class="input" bind:value={d.frontendStack} placeholder="React + Tailwind" data-testid="pf-fe-stack" />
		</label>
		<UrlInput label="Frontend Drive link" bind:value={d.frontendDrive} {showErrors} placeholder="https://drive.google.com/..." testid="pf-fe-drive" />
		<label class="field">
			<span>Backend stack</span>
			<input class="input" bind:value={d.backendStack} placeholder="FastAPI + SQLite" data-testid="pf-be-stack" />
		</label>
		<UrlInput label="Backend Drive link" bind:value={d.backendDrive} {showErrors} placeholder="https://drive.google.com/..." testid="pf-be-drive" />
		<UrlInput label="Readme link" bind:value={d.readmeUrl} {showErrors} testid="pf-readme" />
		<UrlInput label="GitHub link" bind:value={d.githubUrl} {showErrors} placeholder="https://github.com/..." testid="pf-github" />
		<div class="full"><UrlInput label="Live link" bind:value={d.liveUrl} {showErrors} placeholder="https://your-app.vercel.app" testid="pf-live" /></div>
	</form>
	{#snippet footer()}
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
		<button type="submit" form="project-form" class="btn yellow" data-testid="pf-save">{mode === 'add' ? 'Add project' : 'Save changes'}</button>
	{/snippet}
</Modal>
