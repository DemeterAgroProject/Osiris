<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ReviewList from '$lib/components/ReviewList.svelte';
	import { supabase } from '$lib/supabase';
	import {
		AppBar,
		Avatar,
		Accordion,
		Progress,
		RatingGroup,
		Toast,
		createToaster
	} from '@skeletonlabs/skeleton-svelte';
	import {
		Mail,
		Phone,
		Check,
		SquarePen,
		ArrowLeft,
		User,
		IdCard,
		Award,
		Megaphone,
		Star,
		ChevronDown,
		ChevronRight
	} from 'lucide-svelte';

	function resolveDisplayName(profile, authUser) {
		return (
			profile?.display_name ||
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

	function onlyDigits(value, maxLength) {
		return String(value ?? '')
			.replace(/\D/g, '')
			.slice(0, maxLength);
	}

	/** @param {string} value */
	function maskCpf(value) {
		const digits = onlyDigits(value, 11);
		return digits
			.replace(/(\d{3})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
	}

	/** @param {string} value */
	function maskPhone(value) {
		const digits = onlyDigits(value, 11);
		if (digits.length <= 10) {
			return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
		}
		return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
	}

	function mapReviewRow(row) {
		const reviewer = row.reviewer ?? row.profiles ?? null;
		const reviewerName = resolveDisplayName(reviewer, null);
		const reviewerPhoto = resolveAvatarUrl(reviewer, null);

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

	/** @typedef {'profile' | 'verification' | 'edit' | 'reviews'} ProfileView */

	let loading = $state(true);
	let saving = $state(false);
	let errorMessage = $state('');
	let saveMessage = $state({ text: '', type: '' });
	/** @type {ProfileView} */
	let view = $state('profile');

	let authUser = $state(null);
	let profile = $state(null);
	let reviews = $state([]);
	let reviewsLoading = $state(false);

	let form = $state({
		displayName: '',
		email: '',
		phone: '',
		cpf: '',
		photoUrl: ''
	});

	const toaster = createToaster({ placement: 'top', overlap: true });

	const userId = $derived(page.params.id);
	const isOwner = $derived(Boolean(authUser?.id && userId && authUser.id === userId));

	const displayName = $derived(resolveDisplayName(profile, authUser));
	const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
	const initials = $derived(resolveInitials(displayName));

	const email = $derived(profile?.email || authUser?.email || '');
	const phone = $derived(profile?.phone_number || profile?.phone || '');
	const cpf = $derived(profile?.cpf || '');

	const emailVerified = $derived(
		Boolean(authUser?.email_confirmed_at || authUser?.app_metadata?.provider === 'google')
	);

	const phoneVerified = $derived(false);

	const canBecomeAdvertiser = $derived(emailVerified && phoneVerified);

	const advertiserProgress = $derived((emailVerified ? 50 : 0) + (phoneVerified ? 50 : 0));

	const reviewStats = $derived(computeReviewStats(reviews));
	const rating = $derived(reviewStats.average);
	const reviewCount = $derived(reviewStats.count);

	const pageTitle = $derived(
		view === 'edit'
			? 'Editar Perfil'
			: view === 'verification'
				? 'Verificação'
				: view === 'reviews'
					? 'Avaliações'
					: 'Meu perfil'
	);

	function notify(type, text) {
		saveMessage = { text, type };
		if (!text) return;
		if (type === 'error') {
			toaster.error({ title: 'Atenção', description: text });
		} else {
			toaster.success({ title: 'Sucesso', description: text });
		}
	}

	async function loadReviews() {
		if (!userId) return;

		reviewsLoading = true;
		const { reviews: data, error } = await fetchReviewsForUser(userId);
		reviews = data;

		if (error) {
			console.error('Erro ao carregar avaliações:', error.message);
		}

		reviewsLoading = false;
	}

	function syncFormFromProfile() {
		form = {
			displayName: profile?.display_name || displayName,
			email: profile?.email || authUser?.email || '',
			phone: maskPhone(profile?.phone_number || profile?.phone || ''),
			cpf: maskCpf(profile?.cpf || ''),
			photoUrl: profile?.photo_url || profile?.avatar_url || ''
		};
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function onPhoneInput(event) {
		form.phone = maskPhone(event.currentTarget.value);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function onCpfInput(event) {
		form.cpf = maskCpf(event.currentTarget.value);
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

		const { data, error } = await supabase
			.from('profiles')
			.select('id, display_name, email, phone_number, photo_url, role, cpf')
			.eq('id', userId)
			.maybeSingle();

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
				display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
				photo_url: user.user_metadata?.avatar_url || null
			};
		}

		syncFormFromProfile();
		await loadReviews();
		loading = false;
	}

	function openView(nextView) {
		if (nextView === 'edit' && !isOwner) return;
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

		if (!isOwner || !authUser?.id) {
			notify('error', 'Você só pode editar o seu próprio perfil.');
			return;
		}

		const display_name = form.displayName.trim();
		const emailValue = form.email.trim();

		if (!display_name) {
			notify('error', 'Informe o nome.');
			return;
		}

		if (!emailValue) {
			notify('error', 'Informe o e-mail.');
			return;
		}

		saving = true;

		const { data, error } = await supabase
			.from('profiles')
			.update({
				display_name,
				email: emailValue,
				phone_number: form.phone.trim() || null,
				cpf: form.cpf.trim() || null,
				photo_url: form.photoUrl.trim() || null
			})
			.eq('id', authUser.id)
			.select('id, display_name, email, phone_number, photo_url, role, cpf')
			.maybeSingle();

		if (error) {
			console.error('Erro ao salvar perfil:', error);
			notify('error', error.message || 'Não foi possível salvar as alterações.');
			saving = false;
			return;
		}

		profile = data ?? {
			...profile,
			display_name,
			email: emailValue,
			phone_number: form.phone.trim() || null,
			cpf: form.cpf.trim() || null,
			photo_url: form.photoUrl.trim() || null
		};
		syncFormFromProfile();
		notify('success', 'Perfil atualizado com sucesso!');
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
			notify('error', 'Cadastre um telefone antes de validar.');
			return;
		}
		notify(
			'error',
			'Validação por SMS em breve. Por enquanto, complete o telefone no perfil.'
		);
	}

	$effect(() => {
		void userId;
		loadProfile();
	});
</script>

<svelte:head>
	<title>{pageTitle} — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-surface-50-950 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-lg px-4 py-4">
		<AppBar class="mb-4 bg-transparent p-0!">
			<AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
				<AppBar.Lead>
					{#if view !== 'profile'}
						<button
							type="button"
							onclick={goBack}
							class="btn-icon hover:preset-tonal"
							aria-label="Voltar"
						>
							<ArrowLeft class="size-5" />
						</button>
					{/if}
				</AppBar.Lead>
				<AppBar.Headline class="flex justify-center">
					<h1 class="text-xl font-bold">{pageTitle}</h1>
				</AppBar.Headline>
				<AppBar.Trail />
			</AppBar.Toolbar>
		</AppBar>

		{#if loading}
			<div class="flex flex-col items-center justify-center gap-3 py-16">
				<Progress value={null} class="items-center">
					<Progress.Circle style="--size: 2.5rem; --thickness: 0.2rem;">
						<Progress.CircleTrack />
						<Progress.CircleRange />
					</Progress.Circle>
				</Progress>
				<p class="text-sm text-surface-600-400">Carregando perfil...</p>
			</div>
		{:else if errorMessage && !profile}
			<div class="card rounded-container preset-tonal-error p-4 text-sm">{errorMessage}</div>
		{:else if view === 'profile'}
			<section class="card overflow-hidden rounded-container p-5 shadow-sm">
				<div class="flex flex-col items-center">
					<Avatar class="size-24 ring-2 ring-primary-500/20">
						{#if avatarUrl}
							<Avatar.Image src={avatarUrl} alt={displayName} />
						{/if}
						<Avatar.Fallback class="preset-filled-primary-500 text-2xl font-bold">
							{initials}
						</Avatar.Fallback>
					</Avatar>

					<h2 class="mt-4 text-center text-lg font-bold">{displayName}</h2>

					<div class="mt-2 flex flex-wrap items-center justify-center gap-2">
						<RatingGroup count={5} value={rating} allowHalf={true} readOnly={true}>
							<RatingGroup.Control>
								<RatingGroup.Context>
									{#snippet children(ratingGroup)}
										{#each ratingGroup().items as index (index)}
											<RatingGroup.Item {index}>
												{#snippet empty()}
													<Star class="size-4 text-surface-400-600" />
												{/snippet}
												{#snippet half()}
													<Star class="size-4 fill-warning-400 text-warning-400 opacity-80" />
												{/snippet}
												{#snippet full()}
													<Star class="size-4 fill-warning-400 text-warning-400" />
												{/snippet}
											</RatingGroup.Item>
										{/each}
									{/snippet}
								</RatingGroup.Context>
							</RatingGroup.Control>
							<RatingGroup.HiddenInput />
						</RatingGroup>
						<span class="text-xs text-surface-600-400">
							{#if reviewCount > 0}
								{rating.toFixed(1)} ({reviewCount}
								{reviewCount === 1 ? 'avaliação' : 'avaliações'})
							{:else}
								Sem avaliações
							{/if}
						</span>
					</div>

					{#if isOwner}
						<hr class="hr mt-5 w-full" />
						<div class="mt-5 w-full space-y-3">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<Mail class="mt-0.5 size-4 shrink-0 text-surface-600-400" />
									<span class="truncate text-sm text-surface-700-300">{email || '—'}</span>
								</div>
								<span
									class="badge shrink-0 {emailVerified
										? 'preset-tonal-primary'
										: 'preset-tonal-warning'}"
								>
									{#if emailVerified}<Check class="size-3" />{/if}
									{emailVerified ? 'Validado' : 'Pendente'}
								</span>
							</div>

							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<Phone class="mt-0.5 size-4 shrink-0 text-surface-600-400" />
									<span class="truncate text-sm text-surface-700-300"
										>{phone || 'Não informado'}</span
									>
								</div>
								<span
									class="badge shrink-0 {phoneVerified
										? 'preset-tonal-primary'
										: 'preset-tonal-warning'}"
								>
									{#if phoneVerified}<Check class="size-3" />{/if}
									{phoneVerified ? 'Validado' : 'Pendente'}
								</span>
							</div>

							<div class="flex items-start gap-2">
								<IdCard class="mt-0.5 size-4 shrink-0 text-surface-600-400" />
								<span class="truncate text-sm text-surface-700-300"
									>{cpf || 'CPF não informado'}</span
								>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<section class="card mt-4 rounded-container border border-surface-200-800 p-4 shadow-sm">
				<div class="flex items-start gap-3">
					<div class="flex size-10 items-center justify-center rounded-container bg-surface-100-900">
						<Star class="size-5 fill-warning-400 text-warning-400" />
					</div>
					<div class="flex-1">
						<h3 class="font-semibold">Ver avaliações</h3>
						<p class="mt-0.5 text-sm text-surface-700-300">
							Confira o que outros usuários dizem sobre você no marketplace.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => openView('reviews')}
					class="btn mt-4 w-full preset-filled-primary-500"
				>
					{reviewCount > 0 ? `Ver todas as ${reviewCount} avaliações` : 'Ver avaliações'}
				</button>
			</section>

			{#if isOwner}
				<section class="card mt-4 rounded-container border border-surface-200-800 p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex size-10 items-center justify-center rounded-container bg-surface-100-900">
							<SquarePen class="size-5" />
						</div>
						<div class="flex-1">
							<h3 class="font-semibold">Editar perfil</h3>
							<p class="mt-0.5 text-sm text-surface-700-300">
								Atualize nome, telefone e dados do seu perfil público.
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => openView('edit')}
						class="btn mt-4 w-full preset-filled-primary-500"
					>
						Editar perfil
					</button>
				</section>

				<button
					type="button"
					onclick={() => openView('verification')}
					class="card mt-4 flex w-full items-center justify-between rounded-container border border-surface-200-800 px-4 py-4 text-left shadow-sm transition-colors hover:border-primary-500"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-container preset-filled-primary-500"
						>
							<Check class="size-5" />
						</div>
						<div>
							<p class="font-semibold text-surface-950-50">Verificação e status</p>
							<p class="text-xs text-surface-700-300">Email, telefone e anunciante</p>
						</div>
					</div>
					<ChevronRight class="size-5 text-surface-800-200" />
				</button>
			{/if}
		{:else if view === 'reviews'}
			<section class="card rounded-container border border-surface-200-800 p-4 shadow-sm">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div>
						<h2 class="text-base font-semibold">Avaliações recebidas</h2>
						<p class="mt-0.5 text-xs text-surface-600-400">
							Feedback de outros usuários sobre {displayName}
						</p>
					</div>
					<RatingGroup count={5} value={rating} allowHalf={true} readOnly={true}>
						<RatingGroup.Control>
							<RatingGroup.Context>
								{#snippet children(ratingGroup)}
									{#each ratingGroup().items as index (index)}
										<RatingGroup.Item {index}>
											{#snippet empty()}
												<Star class="size-4 text-surface-400-600" />
											{/snippet}
											{#snippet half()}
												<Star class="size-4 fill-warning-400 text-warning-400 opacity-80" />
											{/snippet}
											{#snippet full()}
												<Star class="size-4 fill-warning-400 text-warning-400" />
											{/snippet}
										</RatingGroup.Item>
									{/each}
								{/snippet}
							</RatingGroup.Context>
						</RatingGroup.Control>
						<RatingGroup.HiddenInput />
					</RatingGroup>
				</div>

				<ReviewList
					{reviews}
					loading={reviewsLoading}
					showProductName={false}
					emptyTitle="Nenhuma avaliação recebida"
					emptyDescription="Este usuário ainda não recebeu avaliações no marketplace."
				/>
			</section>
		{:else if view === 'verification'}
			<section class="card mb-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-base font-bold text-surface-950-50">Status da conta</h2>
					<span class="badge preset-filled-primary-500">{advertiserProgress}%</span>
				</div>
				<Progress value={advertiserProgress}>
					<Progress.Track class="bg-surface-200-800">
						<Progress.Range class="bg-primary-500!" />
					</Progress.Track>
				</Progress>
			</section>

			<Accordion value={['email']} collapsible multiple class="space-y-3">
				<Accordion.Item
					value="email"
					class="card rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
				>
					<Accordion.ItemTrigger class="flex items-center justify-between gap-3 px-4 py-3">
						<span class="flex items-center gap-3">
							<span
								class="flex size-10 items-center justify-center rounded-container preset-filled-primary-500"
							>
								<Mail class="size-5" />
							</span>
							<span>
								<span class="block font-semibold text-surface-950-50">Validar email</span>
								<span
									class="badge mt-1 {emailVerified
										? 'preset-filled-success-500'
										: 'preset-filled-warning-500'}"
								>
									{emailVerified ? 'Verificado' : 'Pendente'}
								</span>
							</span>
						</span>
						<Accordion.ItemIndicator>
							<ChevronDown class="size-5 text-surface-800-200" />
						</Accordion.ItemIndicator>
					</Accordion.ItemTrigger>
					<Accordion.ItemContent>
						<p class="mb-4 text-sm text-surface-700-300">
							{emailVerified
								? 'Seu email já está validado.'
								: 'Confirme seu email para aumentar a confiança da sua conta.'}
						</p>
						<button
							type="button"
							disabled={emailVerified}
							class="btn w-full {emailVerified
								? 'preset-filled-success-500'
								: 'preset-filled-primary-500'}"
						>
							{emailVerified ? 'Email validado' : 'Validar email'}
						</button>
					</Accordion.ItemContent>
				</Accordion.Item>

				<Accordion.Item
					value="phone"
					class="card rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
				>
					<Accordion.ItemTrigger class="flex items-center justify-between gap-3 px-4 py-3">
						<span class="flex items-center gap-3">
							<span
								class="flex size-10 items-center justify-center rounded-container preset-filled-primary-500"
							>
								<Phone class="size-5" />
							</span>
							<span>
								<span class="block font-semibold text-surface-950-50">Validar telefone</span>
								<span
									class="badge mt-1 {phoneVerified
										? 'preset-filled-success-500'
										: 'preset-filled-warning-500'}"
								>
									{phoneVerified ? 'Verificado' : 'Pendente'}
								</span>
							</span>
						</span>
						<Accordion.ItemIndicator>
							<ChevronDown class="size-5 text-surface-800-200" />
						</Accordion.ItemIndicator>
					</Accordion.ItemTrigger>
					<Accordion.ItemContent>
						<p class="mb-4 text-sm text-surface-700-300">
							Valide seu número de telefone para aumentar a segurança da sua conta.
						</p>
						<button
							type="button"
							disabled={phoneVerified}
							onclick={handleValidatePhone}
							class="btn w-full {phoneVerified
								? 'preset-filled-success-500'
								: 'preset-filled-primary-500'}"
						>
							{phoneVerified ? 'Telefone validado' : 'Validar telefone'}
						</button>
					</Accordion.ItemContent>
				</Accordion.Item>

				<Accordion.Item
					value="advertiser"
					class="card rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
				>
					<Accordion.ItemTrigger class="flex items-center justify-between gap-3 px-4 py-3">
						<span class="flex items-center gap-3">
							<span
								class="flex size-10 items-center justify-center rounded-container preset-filled-primary-500"
							>
								<Megaphone class="size-5" />
							</span>
							<span>
								<span class="block font-semibold text-surface-950-50">Torne-se um anunciante</span>
								<span
									class="badge mt-1 {canBecomeAdvertiser
										? 'preset-filled-success-500'
										: 'preset-filled-warning-500'}"
								>
									{canBecomeAdvertiser ? 'Pronto' : 'Incompleto'}
								</span>
							</span>
						</span>
						<Accordion.ItemIndicator>
							<ChevronDown class="size-5 text-surface-800-200" />
						</Accordion.ItemIndicator>
					</Accordion.ItemTrigger>
					<Accordion.ItemContent>
						<p class="mb-3 text-sm text-surface-700-300">
							Complete seu perfil, verifique seu email e telefone para se tornar um anunciante e publicar
							no Osiris.
						</p>
						<div class="mb-4 flex flex-wrap gap-2">
							<span
								class="badge {emailVerified
									? 'preset-filled-success-500'
									: 'preset-filled-warning-500'}"
							>
								{emailVerified ? 'Email verificado' : 'Email não verificado'}
							</span>
							<span
								class="badge {phoneVerified
									? 'preset-filled-success-500'
									: 'preset-filled-warning-500'}"
							>
								{phoneVerified ? 'Telefone verificado' : 'Telefone não verificado'}
							</span>
						</div>
						<button
							type="button"
							disabled={!canBecomeAdvertiser}
							onclick={() => goto('/anunciar')}
							class="btn w-full {canBecomeAdvertiser
								? 'preset-filled-primary-500'
								: 'preset-outlined-surface-500'}"
						>
							{canBecomeAdvertiser ? 'Começar a anunciar' : 'Evoluir para Anunciante'}
						</button>
					</Accordion.ItemContent>
				</Accordion.Item>

				<Accordion.Item
					value="certs"
					class="card rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
				>
					<Accordion.ItemTrigger class="flex items-center justify-between gap-3 px-4 py-3">
						<span class="flex items-center gap-3">
							<span
								class="flex size-10 items-center justify-center rounded-container preset-filled-primary-500"
							>
								<Award class="size-5" />
							</span>
							<span class="font-semibold text-surface-950-50">Certificados</span>
						</span>
						<Accordion.ItemIndicator>
							<ChevronDown class="size-5 text-surface-800-200" />
						</Accordion.ItemIndicator>
					</Accordion.ItemTrigger>
					<Accordion.ItemContent>
						<p class="mb-4 text-sm text-surface-700-300">
							{profile?.certificates?.length
								? `Você possui ${profile.certificates.length} certificado(s).`
								: 'Você não possui certificados.'}
						</p>
						<button type="button" class="btn w-full preset-filled-primary-500">
							Gerenciar certificados
						</button>
					</Accordion.ItemContent>
				</Accordion.Item>
			</Accordion>
		{:else if view === 'edit' && isOwner}
			<form
				class="card space-y-4 rounded-container border border-surface-200-800 p-4 shadow-sm"
				onsubmit={handleSaveProfile}
			>
				<div class="flex justify-center">
					<Avatar class="size-24 ring-2 ring-primary-500/20">
						{#if form.photoUrl || avatarUrl}
							<Avatar.Image src={form.photoUrl || avatarUrl} alt={displayName} />
						{/if}
						<Avatar.Fallback class="preset-filled-primary-500 text-2xl font-bold">
							{initials}
						</Avatar.Fallback>
					</Avatar>
				</div>
				<p class="text-center text-xs text-surface-600-400">Foto do perfil (somente visualização)</p>

				<label class="label">
					<span class="label-text">Nome</span>
					<div class="input-group grid-cols-[1fr_auto]">
						<input
							id="displayName"
							type="text"
							class="ig-input"
							bind:value={form.displayName}
							required
						/>
						<span class="ig-cell text-surface-600-400"><User class="size-5" /></span>
					</div>
				</label>

				<label class="label">
					<span class="label-text">E-mail</span>
					<div class="input-group grid-cols-[1fr_auto]">
						<input
							id="email"
							type="email"
							class="ig-input"
							bind:value={form.email}
							required
							autocomplete="email"
						/>
						<span class="ig-cell text-surface-600-400"><Mail class="size-5" /></span>
					</div>
				</label>

				<label class="label">
					<span class="label-text">Telefone</span>
					<div class="input-group grid-cols-[1fr_auto]">
						<input
							id="phone"
							type="tel"
							class="ig-input"
							value={form.phone}
							oninput={onPhoneInput}
							placeholder="(00) 00000-0000"
							autocomplete="tel"
							inputmode="numeric"
							maxlength="15"
						/>
						<span class="ig-cell text-surface-600-400"><Phone class="size-5" /></span>
					</div>
				</label>

				<label class="label">
					<span class="label-text">CPF</span>
					<div class="input-group grid-cols-[1fr_auto]">
						<input
							id="cpf"
							type="text"
							class="ig-input"
							value={form.cpf}
							oninput={onCpfInput}
							placeholder="000.000.000-00"
							inputmode="numeric"
							maxlength="14"
						/>
						<span class="ig-cell text-surface-600-400"><IdCard class="size-5" /></span>
					</div>
				</label>

				<button
					type="submit"
					disabled={saving}
					class="btn w-full preset-filled-primary-500 disabled:opacity-60"
				>
					{#if saving}
						<span class="flex items-center justify-center gap-2">
							<Progress value={null} class="items-center">
								<Progress.Circle style="--size: 1.25rem; --thickness: 0.15rem;">
									<Progress.CircleTrack />
									<Progress.CircleRange />
								</Progress.Circle>
							</Progress>
							Salvando...
						</span>
					{:else}
						Salvar alterações
					{/if}
				</button>
			</form>
		{/if}
	</main>

	<BottomNav active="mais" />

	<Toast.Group {toaster}>
		{#snippet children(toast)}
			<Toast {toast}>
				<Toast.Message>
					<Toast.Title>{toast.title}</Toast.Title>
					<Toast.Description>{toast.description}</Toast.Description>
				</Toast.Message>
				<Toast.CloseTrigger />
			</Toast>
		{/snippet}
	</Toast.Group>
</div>
