// App-wide UI state: toasts, the confirmation dialog and the theme.
// Plain methods only (no $effect writing state) so nothing can loop.

export type Tone = 'ok' | 'err' | 'info';
interface Toast {
	id: number;
	text: string;
	tone: Tone;
}
interface ConfirmState {
	title: string;
	message: string;
	confirmLabel: string;
	danger: boolean;
	resolve: (ok: boolean) => void;
}

const THEME_KEY = 'dth.theme';

class UI {
	toasts = $state<Toast[]>([]);
	confirm = $state<ConfirmState | null>(null);
	theme = $state<'light' | 'dark'>('light');
	navOpen = $state(false);
	#seq = 0;

	toast(text: string, tone: Tone = 'ok') {
		const id = ++this.#seq;
		this.toasts = [...this.toasts.slice(-3), { id, text, tone }];
		setTimeout(() => this.dismiss(id), tone === 'err' ? 6000 : 3200);
	}
	dismiss(id: number) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/** Promise-based confirmation dialog: `if (await ui.ask({...})) ...` */
	ask(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
		this.confirm?.resolve(false);
		return new Promise((resolve) => {
			this.confirm = { confirmLabel: 'Delete', danger: true, ...opts, resolve };
		});
	}
	answer(ok: boolean) {
		const c = this.confirm;
		this.confirm = null;
		c?.resolve(ok);
	}

	initTheme() {
		const t = document.documentElement.dataset.theme;
		this.theme = t === 'dark' ? 'dark' : 'light';
	}
	setTheme(t: 'light' | 'dark') {
		this.theme = t;
		document.documentElement.dataset.theme = t;
		try {
			localStorage.setItem(THEME_KEY, t);
		} catch {
			/* private mode: theme just won't persist */
		}
	}
	toggleTheme() {
		this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
	}
}

export const ui = new UI();
