import { getContext, setContext } from 'svelte';

const TOASTER_CONTEXT = Symbol('osiris-toaster');

export function provideToaster(toaster) {
	setContext(TOASTER_CONTEXT, toaster);
	return toaster;
}

export function useToaster() {
	const toaster = getContext(TOASTER_CONTEXT);

	if (!toaster) {
		throw new Error('O toaster global deve ser inicializado no layout raiz.');
	}

	return toaster;
}
