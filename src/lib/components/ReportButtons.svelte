<script lang="ts">
	// One-click report download (PDF primary, DOCX secondary) with a busy state.
	import Icon from './Icon.svelte';
	import type { ReportFormat, ReportKind } from '$lib/report/build.ts';
	import type { Project } from '$lib/types.ts';
	import { downloadReport } from '$lib/client.ts';
	import { store } from '$lib/store.svelte.ts';
	import { ui } from '$lib/ui.svelte.ts';

	let {
		kind,
		projects,
		includeSummary = false,
		bugStatuses,
		label,
		color = 'yellow',
		docx = true,
		size = '',
		testid
	}: {
		kind: ReportKind;
		projects: Project[];
		includeSummary?: boolean;
		bugStatuses?: Array<'Open' | 'Reported' | 'Fixed'>;
		label: string;
		color?: string;
		docx?: boolean;
		size?: string;
		testid?: string;
	} = $props();

	let busy = $state<ReportFormat | null>(null);

	async function go(format: ReportFormat) {
		if (busy || !projects.length) return;
		busy = format;
		try {
			const ids = new Set(projects.map((p) => p.id));
			const snap = store.snapshot();
			const name = await downloadReport({
				kind,
				format,
				projects: snap.projects.filter((p) => ids.has(p.id)).sort((a, b) => projects.findIndex((x) => x.id === a.id) - projects.findIndex((x) => x.id === b.id)),
				bugs: snap.bugs.filter((b) => ids.has(b.projectId)),
				feedback: snap.feedback.filter((f) => ids.has(f.projectId)),
				reporter: store.tester || undefined,
				includeSummary,
				bugStatuses
			});
			ui.toast(`Downloaded ${name}`);
		} catch (e) {
			ui.toast(e instanceof Error ? e.message : 'Could not generate the report', 'err');
		} finally {
			busy = null;
		}
	}
</script>

<div class="rb">
	<button type="button" class="btn {color} {size}" onclick={() => go('pdf')} disabled={!!busy || !projects.length} aria-busy={busy === 'pdf'} data-testid={testid ? `${testid}-pdf` : undefined}>
		{#if busy === 'pdf'}<span class="spinner" aria-hidden="true"></span> Generating...{:else}<Icon name="download" size={18} /> {label}{/if}
	</button>
	{#if docx}
		<button type="button" class="btn {size || 'sm'}" onclick={() => go('docx')} disabled={!!busy || !projects.length} aria-busy={busy === 'docx'} title="Download as Word (DOCX)" data-testid={testid ? `${testid}-docx` : undefined}>
			{#if busy === 'docx'}<span class="spinner" aria-hidden="true"></span>{:else}<Icon name="file" size={16} />{/if} DOCX
		</button>
	{/if}
</div>

<style>
	.rb {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
</style>
