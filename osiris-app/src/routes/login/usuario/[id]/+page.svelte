<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';
	import {
		Star,
		Mail,
		Phone,
		Check,
		AlertCircle,
		SquarePen,
		ArrowLeft,
		Camera,
		User,
		IdCard,
		KeyRound,
		Lock,
		Award,
		Megaphone,
		ChevronRight
	} from 'lucide-svelte';

	/** @typedef {'profile' | 'verification' | 'edit'} ProfileView */

	let loading = $state(true);
	let saving = $state(false);
	let errorMessage = $state('');
	let saveMessage = $state({ text: '', type: '' });
	/** @type {ProfileView} */
	let view = $state('profile');

	let authUser = $state(null);
	let profile = $state(null);

	let form = $state({
		fullName: '',
		cpf: '',
		phone: '',
		email: '',
		password: '',
		passwordConfirm: ''
	});

	const userId = $derived(page.params.id);

	const displayName = $derived(
		profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
			authUser?.user_metadata?.full_name ||
			authUser?.email?.split('@')[0] ||
			'Usuário'
	);

	const avatarUrl = $derived(
		profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			authUser?.user_metadata?.avatar_url ||
			null
	);

	const initials = $derived(
		displayName
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || 'U'
	);

	const email = $derived(profile?.email || authUser?.email || '');
	const phone = $derived(profile?.phone || profile?.phone_number || '');

	const emailVerified = $derived(
		Boolean(
			profile?.email_verified ||
				authUser?.email_confirmed_at ||
				authUser?.app_metadata?.provider === 'google'
		)
	);

	const phoneVerified = $derived(Boolean(profile?.phone_verified));

	const canBecomeAdvertiser = $derived(emailVerified && phoneVerified);

	const rating = $derived(profile?.rating ?? 4.8);
	const reviewCount = $derived(profile?.review_count ?? 27);

	const pageTitle = $derived(
		view === 'edit' ? 'Editar Perfil' : view === 'verification' ? 'Verificação' : 'Meu perfil'
	);

	function syncFormFromProfile() {
		form = {
			fullName: profile?.full_name || profile?.display_name || profile?.name || displayName,
			cpf: profile?.cpf || '',
			phone: profile?.phone || profile?.phone_number || '',
			email: profile?.email || authUser?.email || '',
			password: '',
			passwordConfirm: ''
		};
	}

	async function loadProfile() {
		if (!userId) {
			errorMessage = 'Perfil inválido.';
			loading = false;
			return;
		}

		loading = true;
		errorMessage = '';

		const {
			data: { user }
		} = await supabase.auth.getUser();
		authUser = user;

		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

		if (error) {
			errorMessage = 'Não foi possível carregar o perfil.';
			profile = null;
		} else {
			profile = data;
		}

		if (!profile && user?.id === userId) {
			profile = {
				id: user.id,
				email: user.email,
				full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
				avatar_url: user.user_metadata?.avatar_url || null
			};
		}

		syncFormFromProfile();
		loading = false;
	}

	function openView(nextView) {
		saveMessage = { text: '', type: '' };
		if (nextView === 'edit') syncFormFromProfile();
		view = nextView;
	}

	function goBack() {
		saveMessage = { text: '', type: '' };
		view = 'profile';
	}

	async function handleSaveProfile(event) {
		event.preventDefault();
		saveMessage = { text: '', type: '' };

		if (form.password && form.password !== form.passwordConfirm) {
			saveMessage = { text: 'As senhas não coincidem.', type: 'error' };
			return;
		}

		if (form.password && form.password.length < 6) {
			saveMessage = { text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' };
			return;
		}

		saving = true;

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user || user.id !== userId) {
			saveMessage = { text: 'Você só pode editar o seu próprio perfil.', type: 'error' };
			saving = false;
			return;
		}

		if (form.password) {
			const { error: passwordError } = await supabase.auth.updateUser({ password: form.password });
			if (passwordError) {
				saveMessage = { text: passwordError.message, type: 'error' };
				saving = false;
				return;
			}
		}

		const payload = {
			id: userId,
			full_name: form.fullName.trim(),
			cpf: form.cpf.trim() || null,
			phone: form.phone.trim() || null,
			email: form.email.trim() || user.email,
			updated_at: new Date().toISOString()
		};

		const { data, error } = await supabase.from('profiles').upsert(payload).select().maybeSingle();

		if (error) {
			saveMessage = { text: 'Não foi possível salvar as alterações.', type: 'error' };
			saving = false;
			return;
		}

		profile = data ?? { ...profile, ...payload };
		syncFormFromProfile();
		saveMessage = { text: 'Perfil atualizado com sucesso!', type: 'success' };
		saving = false;
		setTimeout(() => {
			view = 'profile';
			saveMessage = { text: '', type: '' };
		}, 1200);
	}

	async function handleValidatePhone() {
		saveMessage = { text: '', type: '' };
		if (!phone?.trim()) {
			openView('edit');
			saveMessage = { text: 'Cadastre um telefone antes de validar.', type: 'error' };
			return;
		}
		// Fluxo de SMS/OTP pode ser integrado depois
		saveMessage = {
			text: 'Validação por SMS em breve. Por enquanto, complete o telefone no perfil.',
			type: 'error'
		};
	}

	$effect(() => {
		void userId;
		loadProfile();
	});
</script>

<svelte:head>
	<title>{pageTitle} — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-lg px-4 py-4">
		<!-- Cabeçalho da página -->
		<div class="mb-4 flex items-center gap-3">
			{#if view !== 'profile'}
				<button
					type="button"
					onclick={goBack}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
					aria-label="Voltar"
				>
					<ArrowLeft class="h-5 w-5" />
				</button>
			{/if}
			<h1 class="flex-1 text-center text-xl font-bold text-gray-900 {view === 'profile' ? '' : 'pr-10'}">
				{pageTitle}
			</h1>
		</div>

		{#if loading}
			<div class="flex justify-center py-16">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
			</div>
		{:else if errorMessage && !profile}
			<div class="rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else}
			{#if saveMessage.text && view !== 'edit'}
				<div
					class="mb-4 rounded-xl p-3 text-sm {saveMessage.type === 'error'
						? 'bg-red-50 text-red-700'
						: 'bg-green-50 text-green-700'}"
				>
					{saveMessage.text}
				</div>
			{/if}

			{#if view === 'profile'}
				<!-- Card principal do perfil -->
				<section
					class="overflow-hidden rounded-2xl border-2 border-green-600/30 bg-white shadow-sm"
				>
					<div class="flex flex-col items-center px-5 pb-5 pt-6">
						{#if avatarUrl}
							<img
								src={avatarUrl}
								alt={displayName}
								class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-green-100"
							/>
						{:else}
							<div
								class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-2xl font-bold text-white shadow-md ring-2 ring-green-100"
							>
								{initials}
							</div>
						{/if}

						<h2 class="mt-4 text-center text-lg font-bold text-gray-900">{displayName}</h2>

						<div class="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
							<Star class="h-4 w-4 fill-amber-400 text-amber-400" />
							<span class="font-semibold text-gray-800">{rating.toFixed(1)}</span>
							<span class="text-gray-500">({reviewCount} avaliações)</span>
						</div>

						<div class="mt-5 w-full space-y-3 border-t border-gray-100 pt-5">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<Mail class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
									<span class="truncate text-sm text-gray-700">{email || '—'}</span>
								</div>
								{#if emailVerified}
									<span
										class="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700"
									>
										<Check class="h-3 w-3" />
										Validado
									</span>
								{:else}
									<span
										class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
									>
										<AlertCircle class="h-3 w-3" />
										Não validado
									</span>
								{/if}
							</div>

							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<Phone class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
									<span class="truncate text-sm text-gray-700">{phone || 'Não informado'}</span>
								</div>
								{#if phoneVerified}
									<span
										class="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700"
									>
										<Check class="h-3 w-3" />
										Validado
									</span>
								{:else}
									<span
										class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
									>
										<AlertCircle class="h-3 w-3" />
										Não validado
									</span>
								{/if}
							</div>
						</div>
					</div>
				</section>

				<!-- Ver avaliações -->
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
							<Star class="h-5 w-5 text-amber-500" />
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-gray-900">Ver avaliações</h3>
							<p class="mt-0.5 text-sm text-gray-500">
								Confira o que outros usuários dizem sobre você no marketplace.
							</p>
						</div>
					</div>
					<button
						type="button"
						class="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
					>
						Ver todas as {reviewCount} avaliações
					</button>
				</section>

				<!-- Editar perfil -->
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
							<SquarePen class="h-5 w-5 text-gray-600" />
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-gray-900">Editar perfil</h3>
							<p class="mt-0.5 text-sm text-gray-500">
								Atualize seus dados pessoais, contato e senha de acesso.
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => openView('edit')}
						class="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
					>
						Editar perfil
					</button>
				</section>

				<!-- Atalho verificação -->
				<button
					type="button"
					onclick={() => openView('verification')}
					class="mt-4 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-green-300"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
							<Check class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p class="font-semibold text-gray-900">Verificação e status</p>
							<p class="text-xs text-gray-500">Email, telefone e anunciante</p>
						</div>
					</div>
					<ChevronRight class="h-5 w-5 text-gray-400" />
				</button>
			{:else if view === 'verification'}
				<!-- Validar email -->
				<section class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
							<Mail class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">Validar email</h3>
							<p class="mt-1 text-sm text-gray-500">
								{emailVerified
									? 'Seu email já está validado.'
									: 'Confirme seu email para aumentar a confiança da sua conta.'}
							</p>
						</div>
					</div>
					<button
						type="button"
						disabled={emailVerified}
						class="mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed {emailVerified
							? 'bg-gray-100 text-gray-500'
							: 'bg-green-600 text-white hover:bg-green-700'}"
					>
						{emailVerified ? 'Email validado' : 'Validar email'}
					</button>
				</section>

				<!-- Validar telefone -->
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
							<Phone class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">Validar telefone</h3>
							<p class="mt-1 text-sm text-gray-500">
								Valide seu número de telefone para aumentar a segurança da sua conta.
							</p>
						</div>
					</div>
					<button
						type="button"
						disabled={phoneVerified}
						onclick={handleValidatePhone}
						class="mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed {phoneVerified
							? 'bg-gray-100 text-gray-500'
							: 'bg-green-600 text-white hover:bg-green-700'}"
					>
						{phoneVerified ? 'Telefone validado' : 'Validar telefone'}
					</button>
				</section>

				<!-- Tornar-se anunciante -->
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
							<Megaphone class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">Torne-se um anunciante</h3>
							<p class="mt-1 text-sm text-gray-500">
								Complete seu perfil, verifique seu email e telefone para se tornar um anunciante
								e publicar no Osiris.
							</p>
							<div class="mt-3 flex flex-wrap gap-2">
								<span
									class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase {emailVerified
										? 'bg-green-100 text-green-700'
										: 'bg-amber-100 text-amber-700'}"
								>
									{emailVerified ? 'Email verificado' : 'Email não verificado'}
								</span>
								<span
									class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase {phoneVerified
										? 'bg-green-100 text-green-700'
										: 'bg-amber-100 text-amber-700'}"
								>
									{phoneVerified ? 'Telefone verificado' : 'Telefone não verificado'}
								</span>
							</div>
						</div>
					</div>
					<button
						type="button"
						disabled={!canBecomeAdvertiser}
						onclick={() => goto('/anunciar')}
						class="mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed {canBecomeAdvertiser
							? 'bg-green-600 text-white hover:bg-green-700'
							: 'bg-gray-100 text-gray-500'}"
					>
						{canBecomeAdvertiser ? 'Começar a anunciar' : 'Evoluir para Anunciante'}
					</button>
				</section>

				<!-- Certificados -->
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
							<Award class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">Certificados</h3>
							<p class="mt-1 text-sm text-gray-500">
								{profile?.certificates?.length
									? `Você possui ${profile.certificates.length} certificado(s).`
									: 'Você não possui certificados.'}
							</p>
						</div>
					</div>
					<button
						type="button"
						class="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
					>
						Gerenciar certificados
					</button>
				</section>
			{:else if view === 'edit'}
				<form class="space-y-4" onsubmit={handleSaveProfile}>
					{#if saveMessage.text}
						<div
							class="rounded-xl p-3 text-sm {saveMessage.type === 'error'
								? 'bg-red-50 text-red-700'
								: 'bg-green-50 text-green-700'}"
						>
							{saveMessage.text}
						</div>
					{/if}

					<!-- Avatar edit -->
					<div class="flex justify-center">
						<div class="relative">
							{#if avatarUrl}
								<img
									src={avatarUrl}
									alt={displayName}
									class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-green-100"
								/>
							{:else}
								<div
									class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-2xl font-bold text-white shadow-md ring-2 ring-green-100"
								>
									{initials}
								</div>
							{/if}
							<span
								class="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shadow-md"
								aria-hidden="true"
							>
								<Camera class="h-4 w-4" />
							</span>
						</div>
					</div>

					<div>
						<label for="fullName" class="mb-1 block text-sm font-medium text-gray-700">
							Nome completo
						</label>
						<div class="relative">
							<input
								id="fullName"
								type="text"
								bind:value={form.fullName}
								required
								class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<User class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<div>
						<label for="cpf" class="mb-1 block text-sm font-medium text-gray-700">CPF</label>
						<div class="relative">
							<input
								id="cpf"
								type="text"
								bind:value={form.cpf}
								placeholder="000.000.000-00"
								class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<IdCard class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<div>
						<label for="phone" class="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
						<div class="relative">
							<input
								id="phone"
								type="tel"
								bind:value={form.phone}
								placeholder="(00) 00000-0000"
								class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<Phone class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<div>
						<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
						<div class="relative">
							<input
								id="email"
								type="email"
								bind:value={form.email}
								class="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-11 text-sm text-gray-600 outline-none"
								readonly
							/>
							<Mail class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<div>
						<label for="password" class="mb-1 block text-sm font-medium text-gray-700">Senha</label>
						<div class="relative">
							<input
								id="password"
								type="password"
								bind:value={form.password}
								placeholder="Nova senha (opcional)"
								autocomplete="new-password"
								class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<KeyRound class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<div>
						<label for="passwordConfirm" class="mb-1 block text-sm font-medium text-gray-700">
							Confirmar senha
						</label>
						<div class="relative">
							<input
								id="passwordConfirm"
								type="password"
								bind:value={form.passwordConfirm}
								placeholder="Repita a nova senha"
								autocomplete="new-password"
								class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<Lock class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					<button
						type="submit"
						disabled={saving}
						class="w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
					>
						{saving ? 'Salvando...' : 'Salvar alterações'}
					</button>
				</form>
			{/if}
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
