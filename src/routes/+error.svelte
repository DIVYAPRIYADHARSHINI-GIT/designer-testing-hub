<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head><title>{page.status} · Designer Testing Hub</title></svelte:head>

<section class="err card yellow" data-testid="error-page">
	<span class="code mono">{page.status}</span>
	<h1 data-testid="page-title">{page.status === 404 ? 'This page went untested.' : 'Something broke.'}</h1>
	<p>{page.status === 404 ? "We couldn't find that page. Maybe it was never built?" : (page.error?.message ?? 'Unexpected error')}</p>
	<div class="btn-row">
		<a class="btn ink" href="/"><Icon name="dashboard" size={18} /> Back to dashboard</a>
		<a class="btn" href="/bugs"><Icon name="bug" size={18} /> Log it as a bug</a>
	</div>
</section>

<style>
	.err {
		max-width: 640px;
		margin: 40px auto;
		padding: 30px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		transform: rotate(-1deg);
	}
	.code {
		font-size: 4.5rem;
		font-weight: 700;
		line-height: 1;
	}
</style>
