// Marca, neste aparelho, que a apresentação do app (/boas-vindas) já foi vista.
// A suíte E2E grava a mesma chave no storage state (tests/e2e/global-setup.js).
export const ONBOARDING_KEY = 'osiris-boas-vindas-visto';

export function onboardingSeen() {
	try {
		return localStorage.getItem(ONBOARDING_KEY) === '1';
	} catch {
		// sem storage não dá para lembrar: melhor não mostrar a apresentação toda vez
		return true;
	}
}

export function markOnboardingSeen() {
	try {
		localStorage.setItem(ONBOARDING_KEY, '1');
	} catch {
		// ignora: só volta a aparecer
	}
}

/** Caminho interno seguro para voltar depois do login ou da apresentação. */
export function safeRedirectPath(path) {
	if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
	return path;
}
