<script lang="ts">
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import UrlInput from './UrlInput.svelte';
	import Icon from './Icon.svelte';
	import type { FeedbackDraft } from '$lib/types.ts';
	import { isValidUrl, normalizeUrl } from '$lib/utils.ts';

	let { initial, mode = 'add', onsave, oncancel }: { initial: FeedbackDraft; mode?: 'add' | 'edit'; onsave: (d: FeedbackDraft) => void; oncancel: () => void } = $props();

	let d = $state<FeedbackDraft>(untrack(() => ({ ...initial })));
	let showErrors = $state(false);
	const titleErr = $derived(showErrors && !d.title.trim());
	const word = $derived(d.kind === 'pro' ? 'pro' : 'con');

	function submit(e: Event) {
		e.preventDefault();
		showErrors = true;
		if (!d.title.trim() || !isValidUrl(d.chatUrl) || !isValidUrl(d.mediaUrl)) {
			queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid=feedback-form] [aria-invalid=true]')?.focus());
			return;
		}
		onsave({ ...d, title: d.title.trim(), chatUrl: normalizeUrl(d.chatUrl), mediaUrl: normalizeUrl(d.mediaUrl) });
	}
</script>

<Modal title={`${mode === 'add' ? 'Add' : 'Edit'} ${word}`} onclose={oncancel} wide testid="feedback-modal">
	<form class="form-grid" onsubmit={submit} novalidate data-testid="feedback-form" id="feedback-form">
		<div class="field full">
			<span class="label">Type</span>
			<div class="seg" role="group" aria-label="Pro or con">
				<button type="button" aria-pressed={d.kind === 'pro'} onclick={() => (d.kind = 'pro')} data-testid="ff-kind-pro"><Icon name="thumbUp" size={16} /> Pro</button>
				<button type="button" aria-pressed={d.kind === 'con'} onclick={() => (d.kind = 'con')} data-testid="ff-kind-con"><Icon name="thumbDown" size={16} /> Con</button>
			</div>
		</div>
		<label class="field full">
			<span>Title *</span>
			<input class="input" bind:value={d.title} aria-invalid={titleErr} placeholder={d.kind === 'pro' ? 'e.g. Deployed to Vercel in one go' : 'e.g. Long thinking before the first file'} data-testid="ff-title" maxlength="300" />
			{#if titleErr}<span class="err">Give the {word} a short title</span>{/if}
		</label>
		<label class="field full">
			<span>Description</span>
			<textarea class="input" rows="3" bind:value={d.description} placeholder={d.kind === 'pro' ? 'What did Designer do well?' : 'What went wrong or felt slow?'} data-testid="ff-description"></textarea>
		</label>
		<UrlInput label="Chat link (optional)" bind:value={d.chatUrl} {showErrors} testid="ff-chat" />
		<UrlInput label="Screenshot / video link (optional)" bind:value={d.mediaUrl} {showErrors} testid="ff-media" />
		<label class="field full">
			<span>Compared with Codex / Cursor (optional)</span>
			<textarea class="input" rows="2" bind:value={d.compared} placeholder={d.kind === 'pro' ? 'How did Codex / Cursor do on the same thing?' : 'How do Codex / Cursor handle it?'} data-testid="ff-compared"></textarea>
			<span class="hint">Used in the "Designer vs Codex &amp; Cursor" comparative report.</span>
		</label>
	</form>
	{#snippet footer()}
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
		<button type="submit" form="feedback-form" class="btn {d.kind === 'pro' ? 'green' : 'pink'}" data-testid="ff-save">{mode === 'add' ? `Add ${word}` : 'Save'}</button>
	{/snippet}
</Modal>
