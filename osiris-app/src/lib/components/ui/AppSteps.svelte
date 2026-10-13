<script>
	import { Steps } from '@skeletonlabs/skeleton-svelte';

	/**
	 * Indicador de etapas do Osiris sobre o Steps do Skeleton, para assistentes (anunciar, novo serviço).
	 * labels: nome curto de cada etapa. O avanço fica com a tela (que valida cada etapa);
	 * aqui o usuário só pode voltar para uma etapa já feita, tocando nela.
	 * Sem `linear` de propósito: no Zag, `linear` ignora todo clique nas etapas, até para voltar.
	 * O avanço por clique fica bloqueado pelos triggers desabilitados e pela checagem abaixo.
	 */
	let { step = $bindable(0), labels = [], label = '', class: className = '' } = $props();
</script>

<Steps
	{step}
	count={labels.length}
	onStepChange={(details) => {
		if (details.step <= step) step = details.step;
	}}
	class={className}
>
	<Steps.List class="flex items-start" aria-label={label || undefined}>
		{#each labels as stepLabel, index (stepLabel)}
			<Steps.Item {index} class="flex flex-1 items-start">
				<Steps.Trigger
					disabled={index > step}
					class="group flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
				>
					<Steps.Indicator
						class="flex size-8 items-center justify-center rounded-full border border-surface-300-700 bg-surface-50-950 text-xs font-bold text-surface-700-300 data-[complete]:border-primary-500 data-[complete]:preset-filled-primary-500 data-[current]:border-primary-500 data-[current]:preset-filled-primary-500"
					>
						{index + 1}
					</Steps.Indicator>
					<span class="text-[11px] font-medium text-surface-700-300">{stepLabel}</span>
				</Steps.Trigger>
				{#if index < labels.length - 1}
					<Steps.Separator class="mt-4 h-px flex-1 bg-surface-300-700 data-[complete]:bg-primary-500" />
				{/if}
			</Steps.Item>
		{/each}
	</Steps.List>
</Steps>
