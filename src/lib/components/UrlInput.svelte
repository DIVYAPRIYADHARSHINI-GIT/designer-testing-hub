<script lang="ts">
	// Link field with validation: empty is fine, otherwise a full http(s) link.
	// "github.com/x" is accepted and becomes https://github.com/x on save.
	import { isValidUrl } from '$lib/utils.ts';

	let {
		label,
		value = $bindable(''),
		placeholder = 'https://',
		hint = '',
		showErrors = false,
		testid
	}: { label: string; value?: string; placeholder?: string; hint?: string; showErrors?: boolean; testid?: string } = $props();

	let touched = $state(false);
	const invalid = $derived((touched || showErrors) && !isValidUrl(value));
	const id = 'u-' + Math.random().toString(36).slice(2, 8);
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input
		{id}
		class="input mono-in"
		type="text"
		inputmode="url"
		autocomplete="off"
		spellcheck="false"
		bind:value
		onblur={() => (touched = true)}
		aria-invalid={invalid}
		aria-describedby={invalid ? id + '-err' : undefined}
		{placeholder}
		data-testid={testid}
	/>
	{#if invalid}
		<span class="err" id={id + '-err'}>Enter a full link, e.g. https://example.com</span>
	{:else if hint}
		<span class="hint">{hint}</span>
	{/if}
</div>

<style>
	label {
		font-weight: 700;
		font-size: 0.88rem;
	}
</style>
