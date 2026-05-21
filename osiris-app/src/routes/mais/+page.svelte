<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Home,
		Search,
		Headphones,
		LayoutDashboard,
		Archive,
		MessageSquare,
		User,
		Megaphone,
		Tractor,
		Briefcase,
		PlusCircle,
		Leaf,
		Wrench,
		LogIn,
		LogOut,
		ChevronRight,
		Settings,
		Shield,
		Info
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';

	function resolveDisplayName(profile, authUser) {
		return (
			profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
			authUser?.user_metadata?.full_name ||
			authUser?.user_metadata?.name ||
			authUser?.email?.split('@')[0] ||
			'Usuário'
		);
	}

	function resolveAvatarUrl(profile, authUser) {
		return (
			profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			authUser?.user_metadata?.avatar_url ||
			null
		);
	}

	function resolveInitials(name) {
		return (
			name
				.split(' ')
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase())
				.join('') || 'U'
		);
	}

	let loading = $state(true);
	let authUser = $state(null);
	let profile = $state(null);
	let signingOut = $state(false);

	const displayName = $derived(resolveDisplayName(profile, authUser));
	const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
	const initials = $derived(resolveInitials(displayName));
	const isLoggedIn = $derived(Boolean(authUser));
	const profileHref = $derived(authUser ? `/login/usuario/${authUser.id}` : '/login');

	const shortcuts = [
		{ icon: Home, label: 'Marketplace', href: '/' },
		{ icon: Search, label: 'Buscar ofertas', href: '/buscar' },
		{ icon: Headphones, label: 'Ajuda e suporte', href: null, badge: 'Em breve', badgeTone: 'muted' }
	];

	const activityItems = $derived(
		isLoggedIn
			? [
					{ icon: LayoutDashboard, label: 'Painel de controle', href: '/painel-de-controle' },
					{ icon: Archive, label: 'Meu inventário', href: '/inventario' },
					{
						icon: MessageSquare,
						label: 'Negociações',
						href: null,
						badge: 'Em breve',
						badgeTone: 'muted'
					},
					{ icon: User, label: 'Meu perfil', href: profileHref },
					{ icon: Megaphone, label: 'Anunciar produto ou máquina', href: '/anunciar' }
				]
			: [
					{ icon: LogIn, label: 'Entrar na conta', href: '/login' },
					{ icon: Megaphone, label: 'Anunciar produto ou máquina', href: '/login?redirect=/anunciar' }
				]
	);

	const discoverItems = [
		{ icon: Tractor, label: 'Maquinário e equipamentos', href: '/' },
		{ icon: Leaf, label: 'Insumos e produtos', href: '/buscar' },
		{ icon: Briefcase, label: 'Serviços do agro', href: '/servicos' },
		{
			icon: Wrench,
			label: 'Oferecer serviço',
			href: '/servicos/novo',
			badge: 'Novo',
			badgeTone: 'accent'
		}
	];

	const sellItems = $derived(
		isLoggedIn
			? [
					{ icon: PlusCircle, label: 'Anunciar no inventário', href: '/anunciar' },
					{ icon: Briefcase, label: 'Cadastrar serviço', href: '/servicos/novo' },
					{ icon: Settings, label: 'Configurações do perfil', href: profileHref }
				]
			: [
					{ icon: PlusCircle, label: 'Começar a anunciar', href: '/login?redirect=/anunciar' },
					{ icon: Briefcase, label: 'Oferecer serviços', href: '/login?redirect=/servicos/novo' }
				]
	);

	const legalLinks = [
		{ label: 'Termos e condições', href: null },
		{ label: 'Privacidade e dados', href: null },
		{ label: 'Sobre o Osiris', href: null }
	];

	async function refreshUser() {
		loading = true;

		const {
			data: { user }
		} = await supabase.auth.getUser();
		authUser = user;

		if (user) {
			const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
			profile = data;
		} else {
			profile = null;
		}

		loading = false;
	}

	async function handleSignOut() {
		signingOut = true;
		await supabase.auth.signOut();
		authUser = null;
		profile = null;
		signingOut = false;
		goto('/login');
	}

	onMount(() => {
		refreshUser();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(() => {
			refreshUser();
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Mais — Osiris</title>
	<meta name="description" content="Atalhos, conta e descoberta no marketplace agro Osiris." />
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<!-- Cabeçalho estilo hub (referência Mercado Livre, cores Osiris) -->
	<section class="bg-gradient-to-br from-green-700 via-green-700 to-emerald-600 px-4 pb-5 pt-2 text-white">
		{#if loading}
			<div class="flex items-center gap-3 py-4">
				<div class="h-14 w-14 animate-pulse rounded-full bg-white/20"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 w-36 animate-pulse rounded bg-white/20"></div>
					<div class="h-3 w-24 animate-pulse rounded bg-white/15"></div>
				</div>
			</div>
		{:else if isLoggedIn}
			<a
				href={profileHref}
				class="flex items-center gap-3 rounded-2xl py-3 transition-opacity hover:opacity-95"
			>
				{#if avatarUrl}
					<img
						src={avatarUrl}
						alt={displayName}
						class="h-14 w-14 shrink-0 rounded-full border-2 border-white/30 object-cover"
					/>
				{:else}
					<div
						class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15 text-lg font-bold"
					>
						{initials}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate text-lg font-bold">{displayName}</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm text-green-100">
						Meu perfil
						<ChevronRight class="h-4 w-4" />
					</p>
				</div>
			</a>
		{:else}
			<div class="py-3">
				<p class="text-lg font-bold">Olá, visitante</p>
				<p class="mt-1 text-sm text-green-100">Entre para anunciar, negociar e gerenciar seu inventário.</p>
				<a
					href="/login"
					class="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-50"
				>
					<LogIn class="h-4 w-4" />
					Entrar com Google
				</a>
			</div>
		{/if}

		<div class="mt-2 space-y-2">
			<a
				href="/anunciar"
				class="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3.5 backdrop-blur-sm transition-colors hover:bg-white/20"
			>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
						<Megaphone class="h-5 w-5" />
					</div>
					<div>
						<p class="text-sm font-semibold">Anuncie no Osiris</p>
						<p class="text-xs text-green-100">Maquinário, insumos e mais</p>
					</div>
				</div>
				<ChevronRight class="h-5 w-5 shrink-0 text-green-100" />
			</a>

			{#if isLoggedIn}
				<a
					href="/painel-de-controle"
					class="flex items-center justify-between rounded-2xl bg-amber-50/95 px-4 py-3.5 text-green-900 transition-colors hover:bg-amber-50"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl"
						>
							<LayoutDashboard class="h-5 w-5" />
						</div>
						<div>
							<p class="text-sm font-semibold ">Painel de controle</p>
							<p class="text-xs ">Resumo dos seus anúncios</p>
						</div>
					</div>
					<ChevronRight class="h-5 w-5 shrink-0" />
				</a>
			{/if}
		</div>
	</section>

	<main class="bg-white">
		<!-- Atalhos -->
		<nav aria-label="Atalhos" class="border-b border-gray-100">
			{#each shortcuts as item (item.label)}
				{#if item.href}
					<a
						href={item.href}
						class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-900 transition-colors last:border-b-0 hover:bg-gray-50"
					>
						<item.icon class="h-6 w-6 shrink-0 text-gray-700" strokeWidth={1.75} />
						<span class="flex-1 text-sm font-medium">{item.label}</span>
					</a>
				{:else}
					<div
						class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-500 last:border-b-0"
						aria-disabled="true"
					>
						<item.icon class="h-6 w-6 shrink-0" strokeWidth={1.75} />
						<span class="flex-1 text-sm font-medium">{item.label}</span>
						{#if item.badge}
							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {item.badgeTone ===
								'accent'
									? 'bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-600'}"
							>
								{item.badge}
							</span>
						{/if}
					</div>
				{/if}
			{/each}
		</nav>

		<!-- Minha atividade -->
		<section aria-labelledby="mais-atividade">
			<h2 id="mais-atividade" class="px-4 pt-5 pb-1 text-xs font-semibold text-gray-400">
				Minha atividade
			</h2>
			<nav aria-label="Minha atividade">
				{#each activityItems as item (item.label)}
					{#if item.href}
						<a
							href={item.href}
							class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-900 transition-colors last:border-b-0 hover:bg-gray-50"
						>
							<item.icon class="h-6 w-6 shrink-0 text-gray-700" strokeWidth={1.75} />
							<span class="flex-1 text-sm font-medium">{item.label}</span>
							<ChevronRight class="h-4 w-4 shrink-0 text-gray-300" />
						</a>
					{:else}
						<div
							class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-500 last:border-b-0"
							aria-disabled="true"
						>
							<item.icon class="h-6 w-6 shrink-0" strokeWidth={1.75} />
							<span class="flex-1 text-sm font-medium">{item.label}</span>
							{#if item.badge}
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {item.badgeTone ===
									'accent'
										? 'bg-blue-600 text-white'
										: 'bg-gray-200 text-gray-600'}"
								>
									{item.badge}
								</span>
							{/if}
						</div>
					{/if}
				{/each}
			</nav>
		</section>

		<!-- Descubra -->
		<section aria-labelledby="mais-descubra" class="border-t border-gray-100">
			<h2 id="mais-descubra" class="px-4 pt-5 pb-1 text-xs font-semibold text-gray-400">Descubra</h2>
			<nav aria-label="Descubra">
				{#each discoverItems as item (item.label)}
					<a
						href={item.href}
						class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-900 transition-colors last:border-b-0 hover:bg-gray-50"
					>
						<item.icon class="h-6 w-6 shrink-0 text-gray-700" strokeWidth={1.75} />
						<span class="flex-1 text-sm font-medium">{item.label}</span>
						{#if item.badge}
							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {item.badgeTone ===
								'accent'
									? 'bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-600'}"
							>
								{item.badge}
							</span>
						{:else}
							<ChevronRight class="h-4 w-4 shrink-0 text-gray-300" />
						{/if}
					</a>
				{/each}
			</nav>
		</section>

		<!-- Vender e gerir -->
		<section aria-labelledby="mais-vender" class="border-t border-gray-100">
			<h2 id="mais-vender" class="px-4 pt-5 pb-1 text-xs font-semibold text-gray-400">
				Vender e gerir
			</h2>
			<nav aria-label="Vender e gerir">
				{#each sellItems as item (item.label)}
					<a
						href={item.href}
						class="flex items-center gap-4 border-b border-gray-50 px-4 py-4 text-gray-900 transition-colors last:border-b-0 hover:bg-gray-50"
					>
						<item.icon class="h-6 w-6 shrink-0 text-gray-700" strokeWidth={1.75} />
						<span class="flex-1 text-sm font-medium">{item.label}</span>
						<ChevronRight class="h-4 w-4 shrink-0 text-gray-300" />
					</a>
				{/each}

				{#if isLoggedIn}
					<button
						type="button"
						onclick={handleSignOut}
						disabled={signingOut}
						class="flex w-full items-center gap-4 border-t border-gray-100 px-4 py-4 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
					>
						<LogOut class="h-6 w-6 shrink-0" strokeWidth={1.75} />
						<span>{signingOut ? 'Saindo...' : 'Sair da conta'}</span>
					</button>
				{/if}
			</nav>
		</section>

		<!-- Informações -->
		<section aria-labelledby="mais-info" class="border-t border-gray-100 px-4 py-6">
			<h2 id="mais-info" class="sr-only">Informações</h2>
			<ul class="space-y-3">
				{#each legalLinks as link (link.label)}
					<li>
						<span class="text-sm text-gray-500">{link.label}</span>
					</li>
				{/each}
			</ul>
			<div class="mt-6 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
				<p>
					Marketplace agro da região. Alguns atalhos (negociações, ajuda, termos) serão liberados em
					atualizações futuras.
				</p>
			</div>
			<div class="mt-4 flex items-center gap-2 text-xs text-gray-400">
				<Shield class="h-3.5 w-3.5" />
				<span>Osiris — compra e venda no campo</span>
			</div>
		</section>
	</main>

	<BottomNav active="mais" />
</div>
