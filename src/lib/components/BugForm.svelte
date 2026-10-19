<script lang="ts">
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import UrlInput from './UrlInput.svelte';
	import type { BugDraft } from '$lib/types.ts';
	import { BUG_STATUSES, SEVERITIES } from '$lib/types.ts';
	import { isValidUrl, normalizeUrl } from '$lib/utils.ts';
	import { store } from '$lib/store.svelte.ts';

	let {
		initial,
		mode = 'add',
		pickProject = false,
		onsave,
		oncancel
	}: { initial: BugDraft; mode?: 'add' | 'edit'; pickProject?: boolean; onsave: (d: BugDraft) => void; oncancel: () => void } = $props();

	let d = $state<BugDraft>(untrack(() => ({ ...initial })));
	let showErrors = $state(false);
	const titleErr = $derived(showErrors && !d.title.trim());
	const projErr = $derived(showErrors && !store.projectById(d.projectId));
	const projectName = $derived(store.projectById(d.projectId)?.name ?? '');

	function submit(e: Event) {
		e.preventDefault();
		showErrors = true;
		const links = [d.screenshotUrl, d.videoUrl, d.chatUrl];
		if (!d.title.trim() || !store.projectById(d.projectId) || !links.every(isValidUrl)) {
			queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid=bug-form] [aria-invalid=true]')?.focus());
			return;
		}
		onsave({
			...d,
			title: d.title.trim(),
			screenshotUrl: normalizeUrl(d.screenshotUrl),
			videoUrl: normalizeUrl(d.videoUrl),
			chatUrl: normalizeUrl(d.chatUrl)
		});
	}
</script>

<Modal title={mode === 'add' ? `Add bug${projectName && !pickProject ? ' to ' + projectName : ''}` : 'Edit bug'} onclose={oncancel} wide testid="bug-modal">
	<form class="form-grid" onsubmit={submit} novalidate data-testid="bug-form" id="bug-form">
		{#if pickProject}
			<label class="field full">
				<span>Project *</span>
				<select class="input" bind:value={d.projectId} aria-invalid={projErr} data-testid="bf-project">
					<option value="" disabled>Choose a project</option>
					{#each store.projects as p (p.id)}<option value={p.id}>{p.name} ({p.tester})</option>{/each}
				</select>
				{#if projErr}<span class="err">Choose a project</span>{/if}
			</label>
		{/if}
		<label class="field full">
			<span>Bug title *</span>
			<input class="input" bind:value={d.title} aria-invalid={titleErr} placeholder="e.g. Login button does nothing on mobile" data-testid="bf-title" maxlength="300" />
			{#if titleErr}<span class="err">Give the bug a short title</span>{/if}
		</label>
		<div class="field">
			<span class="label">Severity</span>
			<div class="seg" role="group" aria-label="Severity">
				{#each SEVERITIES as s (s)}
					<button type="button" aria-pressed={d.severity === s} onclick={() => (d.severity = s)} data-testid="bf-sev-{s}"><i class="dot {s.toLowerCase()}"></i>{s}</button>
				{/each}
			</div>
		</div>
		<label class="field">
			<span>Status</span>
			<select class="input" bind:value={d.status} data-testid="bf-status">
				{#each BUG_STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label class="field full">
			<span>Steps to reproduce</span>
			<textarea class="input" rows="3" bind:value={d.steps} placeholder={'1. Open ...\n2. Click ...'} data-testid="bf-steps"></textarea>
		</label>
		<label class="field">
			<span>Expected</span>
			<textarea class="input" rows="3" bind:value={d.expected} placeholder="What should happen" data-testid="bf-expected"></textarea>
		</label>
		<label class="field">
			<span>Actual</span>
			<textarea class="input" rows="3" bind:value={d.actual} placeholder="What actually happened" data-testid="bf-actual"></textarea>
		</label>
		<UrlInput label="Screenshot link" bind:value={d.screenshotUrl} {showErrors} testid="bf-screenshot" />
		<UrlInput label="Video link" bind:value={d.videoUrl} {showErrors} testid="bf-video" />
		<div class="full"><UrlInput label="Chat link" bind:value={d.chatUrl} {showErrors} hint="Link to the Designer chat where it happened" testid="bf-chat" /></div>
	</form>
	{#snippet footer()}
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
		<button type="submit" form="bug-form" class="btn pink" data-testid="bf-save">{mode === 'add' ? 'Add bug' : 'Save bug'}</button>
	{/snippet}
</Modal>

<style>
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--line);
		display: inline-block;
	}
	.dot.high {
		background: var(--sev-high);
	}
	.dot.medium {
		background: var(--sev-medium);
	}
	.dot.low {
		background: var(--sev-low);
	}
	.seg {
		flex-wrap: wrap;
		align-self: flex-start;
	}
</style>
