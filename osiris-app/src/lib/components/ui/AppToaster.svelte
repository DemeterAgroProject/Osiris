<script>
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/components/ui/toast.js';
</script>

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast
			{toast}
			class="max-w-sm justify-center rounded-container border-0 preset-filled-surface-900-100 px-4 py-3 text-center shadow-lg data-[type=error]:preset-filled-error-500 data-[type=success]:preset-filled-success-500 data-[type=warning]:preset-filled-warning-500"
		>
			<Toast.Message>
				{#if toast.title}
					<Toast.Title>{toast.title}</Toast.Title>
				{/if}
				<Toast.Description class="font-medium">{toast.description}</Toast.Description>
			</Toast.Message>
		</Toast>
	{/snippet}
</Toast.Group>
