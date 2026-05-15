/** @param {Record<string, unknown> | null | undefined} profile */
export function resolveDisplayName(profile, authUser) {
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

/** @param {Record<string, unknown> | null | undefined} profile */
export function resolveAvatarUrl(profile, authUser) {
	return (
		profile?.avatar_url ||
		profile?.photo_url ||
		profile?.image_url ||
		authUser?.user_metadata?.avatar_url ||
		null
	);
}

/** @param {string} name */
export function resolveInitials(name) {
	return (
		name
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || 'U'
	);
}
