<script>
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import AppRating from '$lib/components/ui/AppRating.svelte';
	import ReviewList from '$lib/components/ReviewList.svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { supabase } from '$lib/supabase';
	import { userMessage } from '$lib/errors';
	import { fetchProfile, PUBLIC_PROFILE_COLUMNS } from '$lib/profiles';
	import { formatMunicipio, MUNICIPIO_EMBED } from '$lib/municipios';
	import MunicipioPicker from '$lib/components/MunicipioPicker.svelte';
	import {
		ArrowLeft,
		Mail,
		Check,
		Phone,
		MapPin,
		SquarePen,
		Camera,
		User,
		Star,
		CircleAlert
	} from 'lucide-svelte';
	import { m } from '$lib/paraglide/messages';

	function resolveDisplayName(profile, authUser = null) {
		return (
			profile?.display_name ||
			authUser?.user_metadata?.full_name ||
			authUser?.user_metadata?.name ||
			authUser?.email?.split('@')[0] ||
			m.operacao_usuario()
		);
	}

	function resolveAvatarUrl(profile) {
		return profile?.photo_url || profile?.avatar_url || profile?.image_url || null;
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

	function mapReviewRow(row) {
		const reviewer = row.reviewer ?? row.profiles ?? null;
		const reviewerName = resolveDisplayName(reviewer);
		const reviewerPhoto = resolveAvatarUrl(reviewer);

		return {
			id: row.id,
			rating: Number(row.rating) || 0,
			comment: row.comment || '',
			createdAt: row.created_at,
			reviewerName,
			reviewerPhoto,
			reviewerInitials: resolveInitials(reviewerName)
		};
	}

	function computeReviewStats(reviewList) {
		if (!reviewList?.length) {
			return { average: 0, count: 0 };
		}
		const sum = reviewList.reduce((total, review) => total + (Number(review.rating) || 0), 0);
		return { average: sum / reviewList.length, count: reviewList.length };
	}

	async function fetchReviewsForUser(revieweeId) {
		if (!revieweeId) {
			return { reviews: [], error: null };
		}

		let { data, error } = await supabase
			.from('reviews')
			.select(
				`
				id,
				rating,
				comment,
				created_at,
				booking_id,
				reviewer:profiles!reviews_reviewer_id_fkey (
					display_name,
					photo_url
				)
			`
			)
			.eq('reviewee_id', revieweeId)
			.order('created_at', { ascending: false });

		if (error) {
			const fallback = await supabase
				.from('reviews')
				.select(
					`
					id,
					rating,
					comment,
					created_at,
					booking_id,
					reviewer:profiles!reviewer_id (
						display_name,
						photo_url
					)
				`
				)
				.eq('reviewee_id', revieweeId)
				.order('created_at', { ascending: false });

			data = fallback.data;
			error = fallback.error;
		}

		if (error) {
			const plain = await supabase
				.from('reviews')
				.select('id, rating, comment, created_at, booking_id, reviewer_id')
				.eq('reviewee_id', revieweeId)
				.order('created_at', { ascending: false });

			if (plain.error) {
				return { reviews: [], error: plain.error };
			}

			const rows = plain.data ?? [];
			const enriched = await Promise.all(
				rows.map(async (row) => {
					const { data: reviewer } = await supabase
						.from('profiles')
						.select('display_name, photo_url')
						.eq('id', row.reviewer_id)
						.maybeSingle();
					return mapReviewRow({ ...row, reviewer });
				})
			);

			return { reviews: enriched, error: null };
		}

		return {
			reviews: (data ?? []).map(mapReviewRow),
			error: null
		};
	}

	function roleLabel(role) {
		const map = {
			client: m.operacao_cliente,
			cliente: m.operacao_cliente,
			provider: m.operacao_anunciante,
			provedor: m.operacao_anunciante,
			advertiser: m.operacao_anunciante,
			anunciante: m.operacao_anunciante,
			admin: m.operacao_administrador
		};
		if (!role) return m.operacao_usuario();
		return map[String(role).toLowerCase()]?.() ?? role;
	}

	let loading = $state(true);
	let saving = $state(false);
	let reviewsLoading = $state(false);
	let errorMessage = $state('');
	let saveMessage = $state({ text: '', type: '' });
	let imgError = $state(false);
	let view = $state('profile');

	let authUser = $state(null);
	let profile = $state(null);
	let reviews = $state([]);

	let form = $state({
		displayName: '',
		phone: '',
		photoUrl: '',
		municipio: null
	});

	// cidade do próprio usuário (privada): pré-preenche os anúncios
	let myMunicipio = $state(null);

	async function loadMyMunicipio(municipioId) {
		myMunicipio = null;
		if (!municipioId) return;
		const { data } = await supabase.from('municipios').select(MUNICIPIO_EMBED).eq('codigo_ibge', municipioId).maybeSingle();
		myMunicipio = data ?? null;
	}

	const profileId = $derived(page.params.id);
	const isOwner = $derived(Boolean(authUser?.id && profileId && authUser.id === profileId));

	const displayName = $derived(resolveDisplayName(profile, authUser));
	const avatarUrl = $derived(resolveAvatarUrl(profile));
	const initials = $derived(resolveInitials(displayName));
	const email = $derived(profile?.email || (isOwner ? authUser?.email : '') || '');
	// login pelo Google já confirma o e-mail
	const emailVerified = $derived(
		Boolean(isOwner && (authUser?.email_confirmed_at || authUser?.app_metadata?.provider === 'google'))
	);
	const phone = $derived(profile?.phone_number || profile?.phone || '');
	// role é "client" para quase todos: o selo diz se a pessoa anuncia (tem anúncio ativo)
	let hasActiveListings = $state(false);
	const role = $derived(
		profile?.role === 'admin' ? roleLabel('admin') : hasActiveListings ? m.operacao_anunciante() : ''
	);

	async function loadHasActiveListings(ownerId) {
		const [products, services] = await Promise.all([
			supabase.from('products').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'ativo'),
			supabase.from('services').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'ativo')
		]);
		hasActiveListings = (products.count ?? 0) + (services.count ?? 0) > 0;
	}

	const reviewStats = $derived(computeReviewStats(reviews));
	const rating = $derived(reviewStats.average);
	const reviewCount = $derived(reviewStats.count);

	const pageTitle = $derived(
		view === 'edit' ? m.operacao_editar_perfil() : isOwner ? m.operacao_meu_perfil() : displayName
	);

	async function loadReviews() {
		if (!profileId) return;

		reviewsLoading = true;
		const { reviews: data, error } = await fetchReviewsForUser(profileId);
		reviews = data;

		if (error) {
			console.error('Erro ao carregar avaliações:', error.message);
		}

		reviewsLoading = false;
	}

	function syncFormFromProfile() {
		form = {
			displayName: profile?.display_name || displayName,
			phone: profile?.phone_number || profile?.phone || '',
			photoUrl: profile?.photo_url || profile?.avatar_url || '',
			municipio: myMunicipio
		};
	}

	async function loadProfile() {
		if (!profileId) {
			errorMessage = m.operacao_perfil_invalido();
			loading = false;
			return;
		}

		loading = true;
		errorMessage = '';
		imgError = false;

		const {
			data: { user }
		} = await supabase.auth.getUser();
		authUser = user;

		const { data, error } = await fetchProfile(profileId, user?.id);

		if (error) {
			errorMessage = userMessage(error, m.operacao_erro_carregar_perfil());
			console.error('Erro ao carregar perfil:', error.message, error.code, error.details);
			profile = null;
		} else if (!data) {
			if (user?.id === profileId) {
				profile = {
					id: user.id,
					email: user.email,
					display_name:
						user.user_metadata?.full_name ||
						user.user_metadata?.name ||
						user.email?.split('@')[0] ||
						null,
					photo_url: user.user_metadata?.avatar_url || null,
					phone_number: null,
					role: null,
					cpf: null
				};
			} else {
				errorMessage = m.operacao_perfil_nao_encontrado();
				profile = null;
			}
		} else {
			profile = data;
		}

		if (user?.id === profileId) await loadMyMunicipio(profile?.municipio_id);
		syncFormFromProfile();
		await Promise.all([loadReviews(), loadHasActiveListings(profileId)]);
		loading = false;
	}

	function openEdit() {
		if (!isOwner) return;
		saveMessage = { text: '', type: '' };
		syncFormFromProfile();
		view = 'edit';
	}

	function goBack() {
		saveMessage = { text: '', type: '' };
		view = 'profile';
	}

	async function handleSaveProfile(event) {
		event.preventDefault();
		saveMessage = { text: '', type: '' };

		if (!isOwner || !authUser?.id) {
			saveMessage = { text: m.operacao_so_proprio_perfil(), type: 'error' };
			return;
		}

		const display_name = form.displayName.trim();
		if (!display_name) {
			saveMessage = { text: m.operacao_informe_nome(), type: 'error' };
			return;
		}

		saving = true;

		const { data, error } = await supabase
			.from('profiles')
			.update({
				display_name,
				phone_number: form.phone.trim() || null,
				photo_url: form.photoUrl.trim() || null,
				municipio_id: form.municipio?.codigo_ibge ?? null
			})
			.eq('id', authUser.id)
			.select(PUBLIC_PROFILE_COLUMNS)
			.maybeSingle();

		if (error) {
			saveMessage = { text: userMessage(error, m.operacao_erro_salvar_perfil()), type: 'error' };
			saving = false;
			return;
		}

		myMunicipio = form.municipio;
		profile = {
			...profile,
			municipio_id: form.municipio?.codigo_ibge ?? null,
			display_name,
			phone_number: form.phone.trim() || null,
			photo_url: form.photoUrl.trim() || null,
			...data
		};
		syncFormFromProfile();
		imgError = false;
		saveMessage = { text: m.operacao_perfil_atualizado(), type: 'success' };
		saving = false;

		setTimeout(() => {
			view = 'profile';
			saveMessage = { text: '', type: '' };
		}, 1200);
	}

	$effect(() => {
		void profileId;
		view = 'profile';
		loadProfile();
	});
</script>

<svelte:head>
	<title>{pageTitle} — Osiris</title>
</svelte:head>

<div class="min-h-screen pb-24 lg:pb-0">
	<Header title={m.operacao_perfil()} />

	<main class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
		<div class="mb-4 flex items-center gap-3">
			{#if view !== 'profile'}
				<button
					type="button"
					onclick={goBack}
					class="btn-icon btn-icon-lg preset-tonal"
					title={m.comum_voltar()}
					aria-label={m.comum_voltar()}
				>
					<ArrowLeft size={18} />
				</button>
			{/if}
			<h1 class="flex-1 text-center preset-typo-headline {view === 'profile' ? '' : 'pr-11'}">
				{pageTitle}
			</h1>
		</div>

		{#if loading}
			<div class="flex justify-center py-16">
				<LoadingIndicator label={m.operacao_carregando_perfil()} />
			</div>
		{:else if errorMessage && !profile}
			<div class="flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm"><CircleAlert class="h-5 w-5 shrink-0" />{errorMessage}</div>
		{:else if view === 'edit' && isOwner}
			<form class="space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm" onsubmit={handleSaveProfile}>
				{#if saveMessage.text}
					<div
						class="rounded-container p-3 text-sm {saveMessage.type === 'error'
							? 'preset-tonal-error'
							: 'preset-tonal-primary'}"
					>
						{saveMessage.text}
					</div>
				{/if}

				<div class="flex justify-center">
					<div class="relative">
						{#if (form.photoUrl || avatarUrl) && !imgError}
							<img
								src={form.photoUrl || avatarUrl}
								alt={displayName}
								class="h-24 w-24 rounded-full border-4 border-surface-50-950 object-cover ring-2 ring-primary-500/20"
								onerror={() => (imgError = true)}
							/>
						{:else}
							<div
								class="flex h-24 w-24 items-center justify-center rounded-full preset-filled-primary-500 text-2xl font-bold ring-2 ring-primary-500/20"
							>
								{initials}
							</div>
						{/if}
						<span
							class="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-surface-950-50 text-surface-50-950 "
							aria-hidden="true"
						>
							<Camera class="h-4 w-4" />
						</span>
					</div>
				</div>

				<div>
					<label for="photoUrl" class="mb-1.5 block text-sm font-semibold text-surface-950-50">
						{m.operacao_url_foto()}
					</label>
					<input
						id="photoUrl"
						type="url"
						bind:value={form.photoUrl}
						placeholder={m.operacao_url_foto_placeholder()}
						class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-4 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>

				<div>
					<label for="displayName" class="mb-1.5 block text-sm font-semibold text-surface-950-50">
						{m.operacao_nome_exibicao()}
					</label>
					<div class="relative">
						<input
							id="displayName"
							type="text"
							bind:value={form.displayName}
							required
							class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-4 pr-11 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						/>
						<User class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-900-100" />
					</div>
				</div>

				<div>
					<label for="phone" class="mb-1.5 block text-sm font-semibold text-surface-950-50">{m.operacao_telefone()}</label>
					<div class="relative">
						<input
							id="phone"
							type="tel"
							bind:value={form.phone}
							placeholder="(00) 00000-0000"
							class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-4 pr-11 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						/>
						<Phone class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-900-100" />
					</div>
				</div>

				<MunicipioPicker
					id="perfil-municipio"
					label={m.operacao_sua_cidade()}
					hint={m.operacao_sua_cidade_dica()}
					bind:value={form.municipio}
				/>

				<button
					type="submit"
					disabled={saving}
					class="btn btn-lg preset-filled-primary-500 w-full"
				>
					<Check size={18} />
					<span>{saving ? m.comum_salvando() : m.operacao_salvar_alteracoes()}</span>
				</button>
			</form>
		{:else if profile}
			{#if saveMessage.text}
				<div
					class="mb-4 rounded-container p-3 text-sm {saveMessage.type === 'error'
						? 'preset-tonal-error'
						: 'preset-tonal-primary'}"
				>
					{saveMessage.text}
				</div>
			{/if}

			<section class="overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm">
				<div class="h-20 bg-gradient-to-br from-primary-600 to-primary-800"></div>
				<div class="-mt-12 flex flex-col items-center px-5 pb-5">
					{#if avatarUrl && !imgError}
						<img
							src={avatarUrl}
							alt={displayName}
							class="h-24 w-24 rounded-full border-4 border-surface-50-950 object-cover ring-2 ring-primary-500/20"
							onerror={() => (imgError = true)}
						/>
					{:else}
						<div
							class="flex h-24 w-24 items-center justify-center rounded-full preset-filled-primary-500 text-2xl font-bold ring-2 ring-primary-500/20"
						>
							{initials}
						</div>
					{/if}

					<h2 class="mt-3 text-center text-2xl font-bold text-surface-950-50">{displayName}</h2>

					{#if role}
						<span
							class="mt-2 rounded-full preset-tonal-primary px-3 py-1 uppercase text-xs font-bold tracking-wide"
						>
							{role}
						</span>
					{/if}

					<div class="mt-2">
						<AppRating value={rating} count={reviewCount} size="sm" />
					</div>

					{#if isOwner}
						<div class="mt-5 w-full space-y-3 border-t border-surface-200-800 pt-5">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<Mail class="mt-0.5 h-4 w-4 shrink-0 text-surface-900-100" />
									<span class="truncate text-sm text-surface-900-100">{email || '—'}</span>
								</div>
								{#if emailVerified}
									<span
										class="inline-flex shrink-0 items-center gap-1 rounded-full preset-tonal-primary px-2 py-0.5 uppercase text-xs font-bold tracking-wide"
									>
										<Check class="h-3 w-3" />
										{m.operacao_verificado()}
									</span>
								{/if}
							</div>
							<div class="flex items-start gap-2">
								<Phone class="mt-0.5 h-4 w-4 shrink-0 text-surface-900-100" />
								<span class="truncate text-sm text-surface-900-100">{phone || m.operacao_nao_informado()}</span>
							</div>
							<div class="flex items-start gap-2">
								<MapPin class="mt-0.5 h-4 w-4 shrink-0 text-surface-900-100" />
								<span class="truncate text-sm text-surface-900-100">{formatMunicipio(myMunicipio) || m.operacao_cidade_nao_informada()}</span>
							</div>
						</div>
					{/if}
				</div>
			</section>

			{#if isOwner}
				<section class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-container bg-surface-100-900">
							<SquarePen class="h-5 w-5 text-surface-900-100" />
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-surface-950-50">{m.operacao_editar_perfil()}</h3>
							<p class="mt-0.5 text-sm text-surface-900-100">
								{m.operacao_editar_perfil_dica()}
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={openEdit}
						class="btn btn-lg preset-filled-primary-500 mt-4 w-full"
					>
						<SquarePen size={18} />
						<span>{m.operacao_editar_perfil()}</span>
					</button>
				</section>
			{/if}

			<section class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-container preset-tonal-warning">
							<Star class="h-5 w-5" />
						</div>
						<div>
							<h2 class="text-base font-semibold text-surface-950-50">{m.operacao_avaliacoes_recebidas()}</h2>
							<p class="mt-0.5 text-xs text-surface-900-100">
								{m.operacao_feedback_sobre({ nome: displayName })}
							</p>
						</div>
					</div>
					<AppRating value={rating} count={reviewCount} size="sm" />
				</div>

				<ReviewList
					{reviews}
					loading={reviewsLoading}
					emptyTitle={m.operacao_nenhuma_avaliacao()}
					emptyDescription={m.operacao_nenhuma_avaliacao_dica()}
				/>
			</section>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
