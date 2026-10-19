<script lang="ts">
	import { ui } from '$lib/ui.svelte.ts';
	import Icon from './Icon.svelte';

	let cancelBtn = $state<HTMLButtonElement>();

	$effect(() => {
		// Focus the safe choice (Cancel) when the dialog opens. Reads only, writes nothing reactive.
		if (ui.confirm && cancelBtn) cancelBtn.focus();
	});

	function onkey(e: KeyboardEvent) {
		if (!ui.confirm) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			ui.answer(false);
		}
	}
</script>

<svelte:window onkeydown={onkey} />

{#if ui.confirm}
	<div class="overlay" role="presentation">
		<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg" data-testid="confirm-dialog">
			<div class="ico" class:danger={ui.confirm.danger} aria-hidden="true"><Icon name={ui.confirm.danger ? 'trash' : 'refresh'} size={28} /></div>
			<h2 id="cf-title">{ui.confirm.title}</h2>
			<p id="cf-msg">{ui.confirm.message}</p>
			<div class="btn-row">
				<button type="button" class="btn" bind:this={cancelBtn} onclick={() => ui.answer(false)} data-testid="confirm-cancel">Cancel</button>
				<button type="button" class="btn {ui.confirm.danger ? 'red' : 'yellow'}" onclick={() => ui.answer(true)} data-testid="confirm-ok">{ui.confirm.confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 18px;
		background: color-mix(in srgb, #111 60%, transparent);
	}
	.dlg {
		width: min(420px, 100%);
		background: var(--card);
		border: var(--bw) solid var(--line);
		border-radius: 18px;
		box-shadow: 8px 8px 0 var(--line);
		padding: 22px;
		text-align: center;
		animation: pop 0.16s cubic-bezier(0.3, 1.6, 0.6, 1);
	}
	.ico {
		width: 60px;
		height: 60px;
		margin: 0 auto 12px;
		display: grid;
		place-items: center;
		border: var(--bw) solid var(--line);
		border-radius: 50%;
		background: var(--yellow);
		color: #111;
	}
	.ico.danger {
		background: var(--red);
	}
	h2 {
		font-size: 1.35rem;
	}
	p {
		margin: 10px 0 18px;
		color: var(--ink-soft);
	}
	.btn-row {
		justify-content: center;
	}
	@keyframes pop {
		from {
			transform: scale(0.9) rotate(2deg);
			opacity: 0;
		}
	}
</style>
