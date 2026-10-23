// Logs de uso (eventos) e de erros, gravados em public.app_events (o app só insere; a análise é
// feita no Supabase pelo schema analytics, ver docs/logs.md).
// Privacidade: nada de e-mail, telefone, texto de mensagens ou o que a pessoa digita. O usuário
// é identificado pelo token no banco; aqui só existe um id de sessão (por aba).
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { supabase } from '$lib/supabase';

const SESSION_KEY = 'osiris-sessao';
const FLUSH_MS = 4000;
const MAX_ERRORS_PER_SESSION = 50;
const MAX_STRING = 200;

/** @type {Array<Record<string, any>>} */
let queue = [];
let flushTimer = null;
let accessToken = null;
let started = false;
let errorCount = 0;
const recentErrors = new Map();

function sessionId() {
	try {
		let id = sessionStorage.getItem(SESSION_KEY);
		if (!id) {
			id = crypto.randomUUID();
			sessionStorage.setItem(SESSION_KEY, id);
		}
		return id;
	} catch {
		// sem storage: uma sessão por carregamento da página
		return (globalThis.__osirisSessao ??= crypto.randomUUID());
	}
}

function environment() {
	const host = location.hostname;
	if (host === 'osiris-agro.vercel.app') return 'prod';
	if (host.endsWith('.vercel.app')) return 'preview';
	return 'dev';
}

/** Remove e-mails e números longos (telefone, CPF) de textos que vão para o log. */
function scrub(text) {
	return String(text)
		.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
		.replace(/\d[\d\s().-]{7,}\d/g, '[número]')
		.slice(0, MAX_STRING);
}

/** Só valores simples, textos curtos e sem dados pessoais. */
function cleanProps(props) {
	const out = {};
	for (const [key, value] of Object.entries(props ?? {})) {
		if (value === undefined || value === null) continue;
		if (typeof value === 'number' || typeof value === 'boolean') out[key] = value;
		else out[key] = scrub(value);
	}
	return out;
}

function currentRoute() {
	return { path: location.pathname.slice(0, 300), route: null };
}

function enqueue(kind, name, props = {}, route = null) {
	if (typeof window === 'undefined') return;
	const { path } = currentRoute();
	queue.push({
		kind,
		name: String(name).slice(0, 80),
		path,
		route: route ? String(route).slice(0, 120) : null,
		session_id: sessionId(),
		env: environment(),
		props: cleanProps(props),
		// relógio monotônico: não depende do relógio do aparelho estar certo
		at: performance.now()
	});
	if (queue.length >= 20) flush();
	else if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
}

/**
 * Tira o lote da fila. Os eventos esperam até 4 s na fila: cada um vai com o atraso até o envio
 * (client_delay_ms) e o banco grava a hora de chegada menos esse atraso, não a hora do lote.
 */
function takeBatch() {
	const now = performance.now();
	const batch = queue.map(({ at, ...row }) => ({
		...row,
		client_delay_ms: Math.min(3600000, Math.max(0, Math.round(now - at)))
	}));
	queue = [];
	return batch;
}

async function flush() {
	clearTimeout(flushTimer);
	flushTimer = null;
	if (queue.length === 0) return;
	const batch = takeBatch();
	// falha de log não pode virar erro na tela nem gerar outro log
	try {
		await supabase.from('app_events').insert(batch);
	} catch {
		// ignora
	}
}

/** Ao fechar ou trocar de aba: envia o que falta com keepalive (o fetch normal seria cancelado). */
function flushOnExit() {
	if (queue.length === 0) return;
	const batch = takeBatch();
	try {
		fetch(`${PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/app_events`, {
			method: 'POST',
			keepalive: true,
			headers: {
				apikey: PUBLIC_SUPABASE_ANON_KEY,
				Authorization: `Bearer ${accessToken ?? PUBLIC_SUPABASE_ANON_KEY}`,
				'Content-Type': 'application/json',
				Prefer: 'return=minimal'
			},
			body: JSON.stringify(batch)
		});
	} catch {
		// ignora
	}
}

/**
 * Registra uma ação de uso. Nome em snake_case ("anuncio_publicado"); props só com dados
 * não pessoais (categoria, etapa, tipo...).
 */
export function track(name, props = {}) {
	enqueue('event', name, props);
}

/** Registra um erro (falha de salvar, exceção). Repetições iguais em 10 s viram um registro só. */
export function trackError(name, error, props = {}) {
	if (errorCount >= MAX_ERRORS_PER_SESSION) return;
	const message = scrub(error?.message ?? error ?? '');
	const key = `${name}|${message}`;
	const now = Date.now();
	if (now - (recentErrors.get(key) ?? 0) < 10000) return;
	recentErrors.set(key, now);
	errorCount += 1;
	enqueue('error', name, { message, code: error?.code ?? undefined, ...props });
}

/** Visualização de página; route é o id da rota do SvelteKit ("/anuncio/[tipo]/[id]"). */
export function trackPageView(route, props = {}) {
	enqueue('event', 'page_view', props, route);
}

function describeConsoleArgs(args) {
	return args
		.map((arg) => {
			if (arg instanceof Error) return arg.message;
			if (arg && typeof arg === 'object') return arg.message ?? arg.error_description ?? JSON.stringify(arg).slice(0, 120);
			return String(arg);
		})
		.join(' ');
}

/** Liga a captura automática de erros. Chamar uma vez, no layout raiz. */
export function startTelemetry() {
	if (started || typeof window === 'undefined') return;
	started = true;

	supabase.auth.onAuthStateChange((_event, session) => {
		accessToken = session?.access_token ?? null;
	});

	window.addEventListener('error', (event) => {
		trackError('js_error', event.error ?? event.message, { source: scrub(event.filename ?? ''), line: event.lineno });
	});
	window.addEventListener('unhandledrejection', (event) => {
		trackError('promise_rejeitada', event.reason);
	});

	// as telas já avisam falhas com console.error("Erro ao ...", error): vira log também
	const originalError = console.error.bind(console);
	console.error = (...args) => {
		originalError(...args);
		try {
			trackError('console', describeConsoleArgs(args));
		} catch {
			// ignora
		}
	};

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flushOnExit();
	});
	window.addEventListener('pagehide', flushOnExit);
}
