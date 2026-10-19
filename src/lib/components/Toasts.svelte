<script lang="ts">
	import { ui } from '$lib/ui.svelte.ts';
	import Icon from './Icon.svelte';
</script>

<div class="toasts" aria-live="polite" aria-atomic="false">
	{#each ui.toasts as t (t.id)}
		<div class="toast {t.tone}" role={t.tone === 'err' ? 'alert' : 'status'} data-testid="toast">
			<Icon name={t.tone === 'err' ? 'close' : t.tone === 'info' ? 'sparkle' : 'check'} size={18} stroke={3} />
			<span>{t.text}</span>
			<button type="button" class="x" aria-label="Dismiss" onclick={() => ui.dismiss(t.id)}><Icon name="close" size={14} stroke={3} /></button>
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		right: 18px;
		bottom: 18px;
		z-index: 90;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: min(380px, calc(100vw - 36px));
		pointer-events: none;
	}
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 12px 12px 14px;
		font-weight: 700;
		font-size: 0.92rem;
		color: #111;
		background: var(--green);
		border: var(--bw) solid var(--line);
		border-radius: 14px;
		box-shadow: var(--shadow-sm);
		animation: slide 0.2s cubic-bezier(0.3, 1.5, 0.6, 1);
	}
	.toast.err {
		background: var(--red);
	}
	.toast.info {
		background: var(--blue);
	}
	.toast span {
		flex: 1;
		overflow-wrap: anywhere;
	}
	.x {
		background: transparent;
		border: 2px solid #111;
		border-radius: 50%;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		cursor: pointer;
		color: #111;
		flex: none;
	}
	@keyframes slide {
		from {
			transform: translateY(14px) rotate(-2deg);
			opacity: 0;
		}
	}
	@media (max-width: 560px) {
		.toasts {
			left: 12px;
			right: 12px;
			bottom: 12px;
			max-width: none;
		}
	}
</style>
