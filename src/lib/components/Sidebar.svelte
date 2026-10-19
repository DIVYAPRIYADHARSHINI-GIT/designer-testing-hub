<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from './Icon.svelte';
	import { ui } from '$lib/ui.svelte.ts';
	import { store } from '$lib/store.svelte.ts';

	const NAV: Array<{ href: string; label: string; icon: IconName; color: string }> = [
		{ href: '/', label: 'Dashboard', icon: 'dashboard', color: 'var(--yellow)' },
		{ href: '/projects', label: 'Projects', icon: 'projects', color: 'var(--blue)' },
		{ href: '/bugs', label: 'Bugs', icon: 'bug', color: 'var(--pink)' },
		{ href: '/reports', label: 'Reports', icon: 'report', color: 'var(--green)' },
		{ href: '/daily', label: 'Daily Update', icon: 'daily', color: 'var(--orange)' },
		{ href: '/settings', label: 'Settings', icon: 'settings', color: 'var(--purple)' }
	];

	const path = $derived(page.url.pathname);
	const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
	const openBugs = $derived(store.bugs.filter((b) => b.status !== 'Fixed').length);
</script>

<aside class="side" class:open={ui.navOpen} data-testid="sidebar">
	<a class="brand" href="/" onclick={() => (ui.navOpen = false)}>
		<span class="logo" aria-hidden="true">
			<svg viewBox="0 0 48 48" width="40" height="40"
				><rect x="4" y="4" width="40" height="40" rx="10" fill="var(--yellow)" stroke="#111" stroke-width="4" /><path
					d="M13 24l7 7 15-15"
					fill="none"
					stroke="#111"
					stroke-width="6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/></svg
			>
		</span>
		<span class="name"><b>Designer</b><b>Testing Hub</b></span>
	</a>
	<p class="tagline mono">Test. Track. Report.</p>
	<nav aria-label="Main">
		<ul>
			{#each NAV as n (n.href)}
				<li>
					<a href={n.href} class:active={active(n.href)} aria-current={active(n.href) ? 'page' : undefined} style="--c:{n.color}" onclick={() => (ui.navOpen = false)} data-testid="nav-{n.label.toLowerCase().replace(/\s+/g, '-')}">
						<span class="ic"><Icon name={n.icon} size={20} /></span>
						<span class="lbl">{n.label}</span>
						{#if n.href === '/bugs' && openBugs}<span class="count mono" title="Open / reported bugs">{openBugs}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
	<div class="bottom">
		<button type="button" class="btn sm theme" onclick={() => ui.toggleTheme()} aria-label="Switch to {ui.theme === 'dark' ? 'light' : 'dark'} mode" data-testid="theme-toggle">
			<Icon name={ui.theme === 'dark' ? 'sun' : 'moon'} size={17} />
			{ui.theme === 'dark' ? 'Light mode' : 'Dark mode'}
		</button>
		{#if store.tester}<p class="who mono" title="Tester (Settings)">@{store.tester}</p>{/if}
	</div>
</aside>
{#if ui.navOpen}
	<button type="button" class="scrim" aria-label="Close menu" onclick={() => (ui.navOpen = false)}></button>
{/if}

<style>
	.side {
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		width: 248px;
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px 16px;
		background: var(--card);
		border-right: var(--bw) solid var(--line);
		overflow-y: auto;
		z-index: 40;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}
	.logo {
		display: grid;
		transform: rotate(-6deg);
		filter: drop-shadow(3px 3px 0 var(--line));
	}
	.name {
		display: flex;
		flex-direction: column;
		line-height: 1;
		font-size: 1.08rem;
		letter-spacing: -0.02em;
	}
	.tagline {
		font-size: 0.72rem;
		margin: 6px 0 14px;
		padding: 4px 8px;
		background: var(--ink);
		color: var(--bg);
		border-radius: 6px;
		align-self: flex-start;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 46px;
		padding: 6px 10px;
		font-weight: 700;
		text-decoration: none;
		border: var(--bw) solid transparent;
		border-radius: 12px;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}
	nav a:hover {
		border-color: var(--line);
		box-shadow: var(--shadow-sm);
		transform: translate(-1px, -1px) rotate(-0.6deg);
	}
	nav a:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	nav a.active {
		background: var(--c);
		color: #111;
		border-color: var(--line);
		box-shadow: var(--shadow-sm);
	}
	.ic {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border: 2px solid var(--line);
		border-radius: 9px;
		background: var(--c);
		color: #111;
		flex: none;
	}
	.active .ic {
		background: var(--card);
		color: var(--ink);
	}
	.lbl {
		flex: 1;
	}
	.count {
		font-size: 0.75rem;
		font-weight: 700;
		background: var(--ink);
		color: var(--bg);
		border-radius: 999px;
		padding: 1px 8px;
	}
	.bottom {
		margin-top: auto;
		padding-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.theme {
		justify-content: flex-start;
	}
	.who {
		font-size: 0.78rem;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.scrim {
		display: none;
	}

	@media (max-width: 900px) {
		.side {
			transform: translateX(-105%);
			visibility: hidden;
			transition:
				transform 0.2s ease,
				visibility 0s linear 0.2s;
			box-shadow: 8px 0 0 var(--line);
		}
		.side.open {
			transform: none;
			visibility: visible;
			transition: transform 0.2s ease;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 35;
			border: 0;
			background: color-mix(in srgb, #111 50%, transparent);
		}
	}
</style>
