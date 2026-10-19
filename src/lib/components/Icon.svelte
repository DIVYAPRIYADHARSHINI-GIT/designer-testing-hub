<script lang="ts" module>
	// Custom hand-drawn SVG icon set (24x24, thick strokes) - no icon library.
	export type IconName =
		| 'dashboard'
		| 'projects'
		| 'bug'
		| 'report'
		| 'daily'
		| 'settings'
		| 'plus'
		| 'edit'
		| 'trash'
		| 'search'
		| 'grid'
		| 'list'
		| 'link'
		| 'github'
		| 'globe'
		| 'copy'
		| 'download'
		| 'upload'
		| 'sun'
		| 'moon'
		| 'menu'
		| 'close'
		| 'check'
		| 'thumbUp'
		| 'thumbDown'
		| 'file'
		| 'sheet'
		| 'arrowLeft'
		| 'sparkle'
		| 'calendar'
		| 'video'
		| 'image'
		| 'chat'
		| 'sort'
		| 'filter'
		| 'refresh';

	const P: Record<IconName, string> = {
		dashboard: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
		projects: 'M3 7l2-3h5l2 3h9v13H3zM3 7h18',
		bug: 'M8 8a4 4 0 0 1 8 0v1H8zM6 9h12v5a6 6 0 0 1-12 0zM12 9v11M3 13h3M18 13h3M4 8l2 2M20 8l-2 2M4 19l2-2M20 19l-2-2',
		report: 'M6 2h9l5 5v15H6zM15 2v5h5M9 13h8M9 17h8M9 9h3',
		daily: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3M4 20h16',
		settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
		plus: 'M12 4v16M4 12h16',
		edit: 'M4 20l1-5L16 4l4 4L9 19zM14 6l4 4',
		trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
		search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM15 15l6 6',
		grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
		list: 'M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1',
		link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
		github: 'M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V22',
		globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
		copy: 'M8 8h12v12H8zM4 16V4h12',
		download: 'M12 3v12M6 10l6 6 6-6M4 20h16',
		upload: 'M12 16V4M6 9l6-6 6 6M4 20h16',
		sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
		moon: 'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z',
		menu: 'M3 6h18M3 12h18M3 18h18',
		close: 'M5 5l14 14M19 5L5 19',
		check: 'M4 12l5 5L20 6',
		thumbUp: 'M7 11v10H3V11zM7 11l4-8a3 3 0 0 1 3 3v4h6l-2 11H7',
		thumbDown: 'M7 13V3H3v10zM7 13l4 8a3 3 0 0 0 3-3v-4h6L18 3H7',
		file: 'M6 2h9l5 5v15H6zM15 2v5h5',
		sheet: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
		arrowLeft: 'M20 12H4M10 6l-6 6 6 6',
		sparkle: 'M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z',
		calendar: 'M3 5h18v16H3zM3 10h18M8 2v5M16 2v5',
		video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
		image: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 8h.01',
		chat: 'M4 4h16v12H9l-5 4z',
		sort: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4',
		filter: 'M3 4h18l-7 9v6l-4 2v-8z',
		refresh: 'M20 11a8 8 0 0 0-14-5l-2 2M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4'
	};
</script>

<script lang="ts">
	let { name, size = 20, stroke = 2.4, class: cls = '' }: { name: IconName; size?: number; stroke?: number; class?: string } = $props();
</script>

<svg
	class="icon {cls}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"><path d={P[name]} /></svg
>

<style>
	.icon {
		flex: none;
		display: inline-block;
		vertical-align: middle;
	}
</style>
