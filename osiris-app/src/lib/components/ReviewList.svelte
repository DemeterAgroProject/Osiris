<script>
	import { MessageSquare } from 'lucide-svelte';
	import Rating from '$lib/components/Rating.svelte';
	function formatReviewDate(value) {
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	let {
		reviews = [],
		loading = false,
		showProductName = false,
		emptyTitle = 'Nenhuma avaliação ainda',
		emptyDescription = 'Quando houver avaliações, elas aparecerão aqui.'
	} = $props();
</script>

{#if loading}
	<div class="space-y-3">
		{#each Array(3) as _, index (index)}
			<div class="animate-pulse rounded-container border border-surface-200-800 bg-surface-50-950 p-4">
				<div class="flex gap-3">
					<div class="h-10 w-10 rounded-full bg-surface-200-800"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-28 rounded bg-surface-200-800"></div>
						<div class="h-3 w-full rounded bg-surface-200-800"></div>
						<div class="h-3 w-2/3 rounded bg-surface-200-800"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else if reviews.length === 0}
	<div class="rounded-container border border-dashed border-surface-200-800 bg-surface-50-950 px-4 py-10 text-center">
		<MessageSquare class="mx-auto h-8 w-8 text-surface-400-600" />
		<p class="mt-3 text-sm font-semibold text-surface-700-300">{emptyTitle}</p>
		<p class="mt-1 text-xs text-surface-600-400">{emptyDescription}</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each reviews as review (review.id ?? `${review.createdAt}-${review.reviewerName}`)}
			<article class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
				<div class="flex gap-3">
					{#if review.reviewerPhoto}
						<img
							src={review.reviewerPhoto}
							alt={review.reviewerName}
							class="h-10 w-10 shrink-0 rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full preset-tonal-primary text-xs font-bold text-primary-700"
						>
							{review.reviewerInitials}
						</div>
					{/if}

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-surface-950-50">{review.reviewerName}</p>
								{#if showProductName && review.productName}
									<p class="mt-0.5 truncate text-xs text-primary-700">{review.productName}</p>
								{/if}
							</div>
							<time class="shrink-0 text-[11px] text-surface-600-400">
								{formatReviewDate(review.createdAt)}
							</time>
						</div>

						<div class="mt-2">
							<Rating value={review.rating} count={0} showCount={false} size="sm" showValue={false} />
						</div>

						{#if review.comment}
							<p class="mt-2 text-sm leading-relaxed text-surface-600-400">{review.comment}</p>
						{/if}
					</div>
				</div>
			</article>
		{/each}
	</div>
{/if}
