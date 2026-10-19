<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import { ui } from '$lib/ui.svelte.ts';

	let {
		title,
		onclose,
		children,
		footer,
		wide = false,
		testid = 'modal'
	}: { title: string; onclose: () => void; children: Snippet; footer?: Snippet; wide?: boolean; testid?: string } = $props();

	let box: HTMLDivElement;
	const titleId = 'm-' + Math.random().toString(36).slice(2, 8);

	onMount(() => {
		const prev = document.activeElement as HTMLElement | null;
		document.body.style.overflow = 'hidden';
		// Focus the first field (or the dialog) so keyboard users land inside.
		const first = box.querySelector<HTMLElement>('input:not([type=hidden]):not([type=checkbox]), select, textarea');
		(first ?? box).focus({ preventScroll: true });
		return () => {
			document.body.style.overflow = '';
			prev?.focus?.({ preventScroll: true });
		};
	});

	function onkey(e: KeyboardEvent) {
		if (e.key === 'Escape' && !ui.confirm) {
			e.preventDefault();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onkey} />

<div class="overlay" role="presentation">
	<div class="modal" class:wide role="dialog" aria-modal="true" aria-labelledby={titleId} tabindex="-1" bind:this={box} data-testid={testid}>
		<div class="head">
			<h2 id={titleId}>{title}</h2>
			<button type="button" class="btn sm icon-only" aria-label="Close" onclick={onclose} data-testid="modal-close"><Icon name="close" /></button>
		</div>
		<div class="body">{@render children()}</div>
		{#if footer}<div class="foot">{@render footer()}</div>{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 18px;
		background: color-mix(in srgb, #111 55%, transparent);
		overflow-y: auto;
		animation: fade 0.12s ease-out;
	}
	.modal {
		width: min(560px, 100%);
		max-height: calc(100dvh - 36px);
		display: flex;
		flex-direction: column;
		background: var(--card);
		border: var(--bw) solid var(--line);
		border-radius: 18px;
		box-shadow: 8px 8px 0 var(--line);
		animation: pop 0.16s cubic-bezier(0.3, 1.6, 0.6, 1);
		outline: none;
	}
	.modal.wide {
		width: min(860px, 100%);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 18px;
		border-bottom: var(--bw) solid var(--line);
		background: var(--yellow);
		color: #111;
		border-radius: 15px 15px 0 0;
	}
	.head h2 {
		font-size: 1.35rem;
	}
	.body {
		padding: 18px;
		overflow-y: auto;
		min-height: 0;
	}
	.foot {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 10px;
		padding: 14px 18px;
		border-top: var(--bw) solid var(--line);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes pop {
		from {
			transform: scale(0.92) rotate(-1deg);
			opacity: 0;
		}
	}
	@media (max-width: 560px) {
		.overlay {
			padding: 8px;
			align-items: end;
		}
		.modal {
			max-height: calc(100dvh - 16px);
		}
	}
</style>
