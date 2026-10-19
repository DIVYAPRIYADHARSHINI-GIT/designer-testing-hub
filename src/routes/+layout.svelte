<script lang="ts">
	import '@fontsource/space-grotesk/400.css';
	import '@fontsource/space-grotesk/500.css';
	import '@fontsource/space-grotesk/700.css';
	import '@fontsource/space-mono/400.css';
	import '@fontsource/space-mono/700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Toasts from '$lib/components/Toasts.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { store, STORAGE_KEY } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';

	let { children } = $props();

	onMount(() => {
		ui.initTheme();
		store.load();
		document.getElementById('boot-loader')?.remove();
		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) store.reloadFromStorage(e.newValue);
			if (e.key === 'dth.theme' && (e.newValue === 'dark' || e.newValue === 'light')) ui.setTheme(e.newValue);
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});
</script>

<a class="skip" href="#main">Skip to content</a>
<div class="shell">
	<Sidebar />
	<div class="main-col">
		<header class="topbar" data-testid="topbar">
			<button type="button" class="btn sm icon-only" aria-label="Open menu" aria-expanded={ui.navOpen} onclick={() => (ui.navOpen = true)} data-testid="menu-btn"><Icon name="menu" /></button>
			<a href="/" class="tb-brand">Designer <span>Testing Hub</span></a>
			<button type="button" class="btn sm icon-only" aria-label="Toggle dark mode" onclick={() => ui.toggleTheme()} data-testid="theme-toggle-mobile"><Icon name={ui.theme === 'dark' ? 'sun' : 'moon'} /></button>
		</header>
		<main id="main" tabindex="-1">
			{#if store.ready}
				{@render children()}
			{:else}
				<div class="loading" data-testid="loading" aria-busy="true">
					<div class="skeleton" style="height:64px;width:min(420px,80%)"></div>
					<div class="skeleton" style="height:140px"></div>
					<div class="skeleton" style="height:240px"></div>
				</div>
			{/if}
		</main>
	</div>
</div>
<Toasts />
<ConfirmDialog />

<style>
	.skip {
		position: absolute;
		left: -999px;
		top: 8px;
		z-index: 100;
		background: var(--yellow);
		color: #111;
		padding: 8px 12px;
		border: var(--bw) solid #111;
		border-radius: 10px;
		font-weight: 700;
	}
	.skip:focus {
		left: 8px;
	}
	.shell {
		display: flex;
		min-height: 100vh;
	}
	.main-col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		/* the sidebar is position: fixed (full height, own scroll) */
		margin-left: 248px;
	}
	main {
		flex: 1;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 30px clamp(14px, 3vw, 34px) 60px;
		outline: none;
	}
	.topbar {
		display: none;
	}
	.loading {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	@media (max-width: 900px) {
		.main-col {
			margin-left: 0;
		}
		.topbar {
			display: flex;
			align-items: center;
			gap: 10px;
			position: sticky;
			top: 0;
			z-index: 30;
			padding: 10px 14px;
			background: var(--yellow);
			border-bottom: var(--bw) solid var(--line);
			color: #111;
		}
		.topbar :global(.btn) {
			--btn-bg: #fff;
			--btn-fg: #111;
			border-color: #111;
			box-shadow: 3px 3px 0 #111;
		}
		.tb-brand {
			flex: 1;
			font-weight: 700;
			font-size: 1.1rem;
			text-decoration: none;
			color: #111;
			letter-spacing: -0.02em;
		}
		.tb-brand span {
			background: #111;
			color: var(--yellow);
			padding: 0 6px;
			border-radius: 5px;
		}
		main {
			padding-top: 20px;
		}
	}
</style>
