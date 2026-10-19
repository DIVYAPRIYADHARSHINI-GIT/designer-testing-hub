<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	import { isValidUrl, normalizeUrl, prettyUrl } from '$lib/utils.ts';

	let { url, label = '', icon = 'link', max = 40, testid }: { url: string; label?: string; icon?: IconName; max?: number; testid?: string } = $props();
	const href = $derived(normalizeUrl(url ?? ''));
	const ok = $derived(!!url && isValidUrl(url));
</script>

{#if ok}
	<a class="link" {href} target="_blank" rel="noopener noreferrer" title={href} data-testid={testid}>
		<Icon name={icon} size={15} stroke={2.6} />
		<span class="txt">{label || prettyUrl(href, max)}</span>
	</a>
{:else if url}
	<span class="mono muted" title="Not a valid link">{url}</span>
{:else}
	<span class="muted">—</span>
{/if}
