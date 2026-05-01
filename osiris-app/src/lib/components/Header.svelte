<script>
	import { Bell, User } from 'lucide-svelte';
</script>

<header class="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
	<div class="flex items-center justify-between">
		<!-- Logo -->
		<div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-600">
			<svg class="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="3" />
				<path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
				<path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
			</svg>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<button
				class="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
				aria-label="Notificações"
			>
				<Bell class="h-6 w-6" />
				<span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
			</button>
			<button
				class="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
				aria-label="Perfil"
			>
				<User class="h-6 w-6" />
			</button>
		</div>
	</div>
</header>
