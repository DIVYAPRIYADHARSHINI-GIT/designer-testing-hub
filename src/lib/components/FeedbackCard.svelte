<script lang="ts">
	import Icon from './Icon.svelte';
	import LinkOut from './LinkOut.svelte';
	import type { Feedback } from '$lib/types.ts';

	let { item, onedit, ondelete }: { item: Feedback; onedit: (f: Feedback) => void; ondelete: (f: Feedback) => void } = $props();
</script>

<article class="fb {item.kind}" data-testid="feedback-card" data-kind={item.kind}>
	<div class="head">
		<span class="badge" aria-hidden="true"><Icon name={item.kind === 'pro' ? 'thumbUp' : 'thumbDown'} size={16} /></span>
		<h4>{item.title}</h4>
	</div>
	{#if item.description}<p class="desc pre">{item.description}</p>{/if}
	{#if item.compared}
		<div class="cmp">
			<span class="kicker">vs Codex / Cursor</span>
			<p class="pre">{item.compared}</p>
		</div>
	{/if}
	<div class="foot">
		{#if item.chatUrl}<LinkOut url={item.chatUrl} label="Chat" icon="chat" />{/if}
		{#if item.mediaUrl}<LinkOut url={item.mediaUrl} label="Screenshot / video" icon="image" />{/if}
		<span class="spacer"></span>
		<button type="button" class="btn sm icon-only" aria-label="Edit {item.kind}" title="Edit" onclick={() => onedit(item)} data-testid="feedback-edit"><Icon name="edit" size={16} /></button>
		<button type="button" class="btn sm icon-only red" aria-label="Delete {item.kind}" title="Delete" onclick={() => ondelete(item)} data-testid="feedback-delete"><Icon name="trash" size={16} /></button>
	</div>
</article>

<style>
	.fb {
		border: var(--bw) solid var(--line);
		border-radius: 14px;
		padding: 14px;
		background: var(--card);
		box-shadow: var(--shadow-sm);
		border-left-width: 10px;
		min-width: 0;
	}
	.fb.pro {
		border-left-color: var(--green);
	}
	.fb.con {
		border-left-color: var(--pink);
	}
	.head {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.badge {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex: none;
		border: 2px solid var(--line);
		border-radius: 50%;
		color: #111;
	}
	.pro .badge {
		background: var(--green);
	}
	.con .badge {
		background: var(--pink);
	}
	h4 {
		font-size: 1rem;
		margin-top: 4px;
		overflow-wrap: anywhere;
	}
	.desc {
		margin-top: 8px;
		color: var(--ink-soft);
		font-size: 0.92rem;
	}
	.cmp {
		margin-top: 10px;
		padding: 10px;
		border: 2px dashed var(--line);
		border-radius: 10px;
		font-size: 0.88rem;
	}
	.cmp p {
		margin-top: 6px;
	}
	.foot {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 12px;
	}
</style>
