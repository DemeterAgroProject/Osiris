<script>
	import { Bell, User } from 'lucide-svelte';
</script>

<header class="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
	<div class="flex items-center justify-between">
		<!-- Logo -->
		<div class="flex h-10 w-10 items-center justify-center">
			<img src="/logo_black.png" alt="Logo Osiris" class="h-10" />
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
