<script lang="ts">
	// Sticker-style bug card: severity colour tag + tape, status switcher, evidence links.
	import Icon from './Icon.svelte';
	import LinkOut from './LinkOut.svelte';
	import type { Bug, BugStatus } from '$lib/types.ts';
	import { BUG_STATUSES } from '$lib/types.ts';
	import { store } from '$lib/store.svelte.ts';

	let {
		bug,
		showProject = true,
		onedit,
		ondelete
	}: { bug: Bug; showProject?: boolean; onedit: (b: Bug) => void; ondelete: (b: Bug) => void } = $props();

	let open = $state(false);
	const project = $derived(store.projectById(bug.projectId));
	// Stable little tilt per card, from its id.
	const tilt = $derived(((bug.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 7) - 3) * 0.35);
	const hasEvidence = $derived(!!(bug.screenshotUrl || bug.videoUrl || bug.chatUrl));

	function setStatus(e: Event) {
		store.updateBug(bug.id, { status: (e.currentTarget as HTMLSelectElement).value as BugStatus });
	}
</script>

<article class="sticker wobble sev-{bug.severity}" style="--tilt:{tilt}deg" data-testid="bug-card" data-bug-id={bug.id}>
	<div class="top">
		<span class="tag {bug.severity.toLowerCase()}" data-testid="bug-severity">{bug.severity}</span>
		<span class="tag status-{bug.status.toLowerCase()}">{bug.status === 'Fixed' ? '✓ ' : ''}{bug.status}</span>
		<span class="spacer"></span>
		<span class="mono id muted" title="Bug ID {bug.id}">#{bug.id.replace(/^b-/, '').slice(0, 8)}</span>
	</div>
	<h3 class="title">{bug.title}</h3>
	{#if showProject && project}
		<a class="proj" href="/projects/{project.id}"><Icon name="projects" size={15} /> {project.name}</a>
	{/if}

	{#if open}
		<dl class="detail">
			<dt>Steps</dt>
			<dd class="pre">{bug.steps || '—'}</dd>
			<dt>Expected</dt>
			<dd class="pre">{bug.expected || '—'}</dd>
			<dt>Actual</dt>
			<dd class="pre">{bug.actual || '—'}</dd>
		</dl>
	{:else if bug.actual}
		<p class="snippet">{bug.actual}</p>
	{/if}

	{#if hasEvidence}
		<div class="evidence">
			{#if bug.screenshotUrl}<LinkOut url={bug.screenshotUrl} label="Screenshot" icon="image" />{/if}
			{#if bug.videoUrl}<LinkOut url={bug.videoUrl} label="Video" icon="video" />{/if}
			{#if bug.chatUrl}<LinkOut url={bug.chatUrl} label="Chat" icon="chat" />{/if}
		</div>
	{/if}

	<div class="actions">
		<button type="button" class="btn sm" onclick={() => (open = !open)} aria-expanded={open} data-testid="bug-toggle">{open ? 'Less' : 'Details'}</button>
		<label class="sr-only" for="st-{bug.id}">Status</label>
		<select id="st-{bug.id}" class="input mini" value={bug.status} onchange={setStatus} data-testid="bug-status">
			{#each BUG_STATUSES as s (s)}<option value={s}>{s}</option>{/each}
		</select>
		<span class="spacer"></span>
		<button type="button" class="btn sm icon-only" aria-label="Edit bug" title="Edit" onclick={() => onedit(bug)} data-testid="bug-edit"><Icon name="edit" size={17} /></button>
		<button type="button" class="btn sm icon-only red" aria-label="Delete bug" title="Delete" onclick={() => ondelete(bug)} data-testid="bug-delete"><Icon name="trash" size={17} /></button>
	</div>
</article>

<style>
	.top {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 4px;
	}
	.id {
		font-size: 0.72rem;
	}
	.title {
		margin: 10px 0 6px;
		font-size: 1.08rem;
		overflow-wrap: anywhere;
	}
	.proj {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		text-decoration: none;
		background: var(--bg-2);
		border: 2px solid var(--line);
		border-radius: 8px;
		padding: 2px 8px;
	}
	.proj:hover {
		background: var(--blue);
		color: #111;
	}
	.snippet {
		margin-top: 8px;
		color: var(--ink-soft);
		font-size: 0.9rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.detail {
		margin: 10px 0 0;
		font-size: 0.9rem;
	}
	.detail dt {
		font-weight: 700;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-top: 8px;
	}
	.detail dd {
		margin: 2px 0 0;
		color: var(--ink-soft);
	}
	.evidence {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 12px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 2px dashed color-mix(in srgb, var(--line) 35%, transparent);
	}
	.mini {
		width: auto;
		min-height: 36px;
		padding: 4px 30px 4px 10px;
		font-size: 0.82rem;
		font-weight: 700;
		border-radius: 999px;
	}
	.status-open {
		background: var(--card);
	}
	.status-reported {
		background: var(--blue);
		color: #111;
	}
	.status-fixed {
		background: var(--green);
		color: #111;
	}
</style>
