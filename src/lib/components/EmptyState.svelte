<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	let { icon = 'sparkle', title, text = '', children, testid = 'empty' }: { icon?: IconName; title: string; text?: string; children?: Snippet; testid?: string } = $props();
</script>

<div class="empty" data-testid={testid}>
	<div class="blob" aria-hidden="true"><Icon name={icon} size={34} stroke={2.6} /></div>
	<h3>{title}</h3>
	{#if text}<p class="muted">{text}</p>{/if}
	{#if children}<div class="btn-row">{@render children()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
		padding: 34px 18px;
		border: var(--bw) dashed var(--line);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--card) 70%, transparent);
	}
	.blob {
		width: 70px;
		height: 70px;
		display: grid;
		place-items: center;
		background: var(--yellow);
		color: #111;
		border: var(--bw) solid var(--line);
		border-radius: 46% 54% 42% 58% / 55% 45% 55% 45%;
		box-shadow: var(--shadow-sm);
		transform: rotate(-6deg);
	}
	p {
		max-width: 44ch;
	}
	.btn-row {
		justify-content: center;
		margin-top: 6px;
	}
</style>
