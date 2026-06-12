<script>
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import ReviewList from '$lib/components/ReviewList.svelte';
	import { supabase } from '$lib/supabase';
	import {
		ArrowLeft,
		Mail,
		Phone,
		SquarePen,
		Camera,
		User,
		Star
	} from 'lucide-svelte';

	function resolveDisplayName(profile) {
		return profile?.display_name || profile?.full_name || profile?.name || 'Usuário';
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
					photo_url,
					full_name
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
						photo_url,
						full_name
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
						.select('display_name, photo_url, full_name')
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
			client: 'Cliente',
			cliente: 'Cliente',
			provider: 'Provedor',
			provedor: 'Provedor',
			advertiser: 'Anunciante',
			anunciante: 'Anunciante',
			admin: 'Administrador'
		};
		if (!role) return 'Usuário';
		return map[String(role).toLowerCase()] ?? role;
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
		photoUrl: ''
	});

	const profileId = $derived(page.params.id);
	const isOwner = $derived(Boolean(authUser?.id && profileId && authUser.id === profileId));

	const displayName = $derived(resolveDisplayName(profile));
	const avatarUrl = $derived(resolveAvatarUrl(profile));
	const initials = $derived(resolveInitials(displayName));
	const email = $derived(profile?.email || '');
	const phone = $derived(profile?.phone_number || profile?.phone || '');
	const role = $derived(roleLabel(profile?.role));

	const reviewStats = $derived(computeReviewStats(reviews));
	const rating = $derived(reviewStats.average);
	const reviewCount = $derived(reviewStats.count);

	const pageTitle = $derived(
		view === 'edit' ? 'Editar perfil' : isOwner ? 'Meu perfil' : displayName
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
			photoUrl: profile?.photo_url || profile?.avatar_url || ''
		};
	}

	async function loadProfile() {
		if (!profileId) {
			errorMessage = 'Perfil inválido.';
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

		const { data, error } = await supabase
			.from('profiles')
			.select('id, display_name, email, phone_number, photo_url, role, full_name')
			.eq('id', profileId)
			.maybeSingle();

		if (error) {
			
			errorMessage = 'Não foi possível carregar o perfil.';
			console.error("ERRO SUPABASE:", error.message, error.code, error.details);
			profile = null;
		} else if (!data) {
			errorMessage = 'Perfil não encontrado.';
			profile = null;
		} else {
			profile = data;
		}

		syncFormFromProfile();
		await loadReviews();
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
			saveMessage = { text: 'Você só pode editar o seu próprio perfil.', type: 'error' };
			return;
		}

		const display_name = form.displayName.trim();
		if (!display_name) {
			saveMessage = { text: 'Informe um nome de exibição.', type: 'error' };
			return;
		}

		saving = true;

		const { data, error } = await supabase
			.from('profiles')
			.update({
				display_name,
				phone_number: form.phone.trim() || null,
				photo_url: form.photoUrl.trim() || null
			})
			.eq('id', authUser.id)
			.select('id, display_name, email, phone_number, photo_url, role, full_name')
			.maybeSingle();

		if (error) {
			saveMessage = { text: error.message || 'Não foi possível salvar as alterações.', type: 'error' };
			saving = false;
			return;
		}

		profile = data ?? { ...profile, display_name, phone_number: form.phone.trim() || null, photo_url: form.photoUrl.trim() || null };
		syncFormFromProfile();
		imgError = false;
		saveMessage = { text: 'Perfil atualizado com sucesso!', type: 'success' };
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

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-lg px-4 py-4">
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
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
				></div>
			</div>
		{:else if errorMessage && !profile}
			<div class="rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if view === 'edit' && isOwner}
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

				<div class="flex justify-center">
					<div class="relative">
						{#if (form.photoUrl || avatarUrl) && !imgError}
							<img
								src={form.photoUrl || avatarUrl}
								alt={displayName}
								class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-green-100"
								onerror={() => (imgError = true)}
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
					<label for="photoUrl" class="mb-1 block text-sm font-medium text-gray-700">
						URL da foto
					</label>
					<input
						id="photoUrl"
						type="url"
						bind:value={form.photoUrl}
						placeholder="https://..."
						class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					/>
				</div>

				<div>
					<label for="displayName" class="mb-1 block text-sm font-medium text-gray-700">
						Nome de exibição
					</label>
					<div class="relative">
						<input
							id="displayName"
							type="text"
							bind:value={form.displayName}
							required
							class="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-11 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
						<User class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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

				<button
					type="submit"
					disabled={saving}
					class="w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
				>
					{saving ? 'Salvando...' : 'Salvar alterações'}
				</button>
			</form>
		{:else if profile}
			{#if saveMessage.text}
				<div
					class="mb-4 rounded-xl p-3 text-sm {saveMessage.type === 'error'
						? 'bg-red-50 text-red-700'
						: 'bg-green-50 text-green-700'}"
				>
					{saveMessage.text}
				</div>
			{/if}

			<section class="overflow-hidden rounded-2xl bg-white shadow-sm">
				<div class="flex flex-col items-center px-5 pb-5 pt-6">
					{#if avatarUrl && !imgError}
						<img
							src={avatarUrl}
							alt={displayName}
							class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-green-100"
							onerror={() => (imgError = true)}
						/>
					{:else}
						<div
							class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-2xl font-bold text-white shadow-md ring-2 ring-green-100"
						>
							{initials}
						</div>
					{/if}

					<h2 class="mt-4 text-center text-lg font-bold text-gray-900">{displayName}</h2>

					<span
						class="mt-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-800"
					>
						{role}
					</span>

					<div class="mt-2">
						<Rating value={rating} count={reviewCount} size="sm" />
					</div>

					{#if isOwner}
						<div class="mt-5 w-full space-y-3 border-t border-gray-100 pt-5">
							<div class="flex items-start gap-2">
								<Mail class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
								<span class="truncate text-sm text-gray-700">{email || '—'}</span>
							</div>
							<div class="flex items-start gap-2">
								<Phone class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
								<span class="truncate text-sm text-gray-700">{phone || 'Não informado'}</span>
							</div>
						</div>
					{/if}
				</div>
			</section>

			{#if isOwner}
				<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
							<SquarePen class="h-5 w-5 text-gray-600" />
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-gray-900">Editar perfil</h3>
							<p class="mt-0.5 text-sm text-gray-500">
								Atualize nome, telefone e foto do seu perfil público.
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={openEdit}
						class="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
					>
						Editar perfil
					</button>
				</section>
			{/if}

			<section class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
							<Star class="h-5 w-5 text-amber-500" />
						</div>
						<div>
							<h2 class="text-base font-semibold text-gray-900">Avaliações recebidas</h2>
							<p class="mt-0.5 text-xs text-gray-500">
								Feedback de outros usuários sobre {displayName}
							</p>
						</div>
					</div>
					<Rating value={rating} count={reviewCount} size="sm" />
				</div>

				<ReviewList
					{reviews}
					loading={reviewsLoading}
					emptyTitle="Nenhuma avaliação recebida"
					emptyDescription="Este usuário ainda não recebeu avaliações no marketplace."
				/>
			</section>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
