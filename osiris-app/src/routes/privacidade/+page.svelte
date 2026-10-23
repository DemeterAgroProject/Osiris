<script>
	import { resolve } from '$app/paths';
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { LEGAL } from '$lib/legal';
	import { m } from '$lib/paraglide/messages';
</script>

<LegalPage title={m.legal_privacidade_titulo()} description={m.legal_privacidade_descricao()}>
	<section>
		<p>{m.legal_priv_intro_p1({ responsavel: LEGAL.responsavel })}</p>
		<p>{m.legal_priv_intro_p2()}</p>
	</section>

	<section>
		<h2>{m.legal_priv_1_titulo()}</h2>
		<ul>
			<li><strong>{m.legal_priv_1_google_rotulo()}</strong>{m.legal_priv_1_google_texto()}</li>
			<li><strong>{m.legal_priv_1_informados_rotulo()}</strong>{m.legal_priv_1_informados_texto()}</li>
			<li><strong>{m.legal_priv_1_anuncios_rotulo()}</strong>{m.legal_priv_1_anuncios_texto()}</li>
			<li><strong>{m.legal_priv_1_negociacoes_rotulo()}</strong>{m.legal_priv_1_negociacoes_texto()}</li>
			<li><strong>{m.legal_priv_1_favoritos_rotulo()}</strong>{m.legal_priv_1_favoritos_texto()}</li>
			<li><strong>{m.legal_priv_1_aparelho_rotulo()}</strong>{m.legal_priv_1_aparelho_texto()}</li>
			<li><strong>{m.legal_priv_1_tecnicos_rotulo()}</strong>{m.legal_priv_1_tecnicos_texto()}</li>
			<li>
				<strong>{m.legal_priv_1_uso_rotulo()}</strong>{m.legal_priv_1_uso_texto()}
				<strong>{m.legal_priv_1_uso_destaque()}</strong>
				{m.legal_priv_1_uso_texto_2()}
			</li>
		</ul>
	</section>

	<section>
		<h2>{m.legal_priv_2_titulo()}</h2>
		<ul>
			<li>{m.legal_priv_2_item_1()}</li>
			<li>{m.legal_priv_2_item_2()}</li>
			<li>{m.legal_priv_2_item_3()}</li>
			<li>{m.legal_priv_2_item_4()}</li>
			<li>{m.legal_priv_2_item_5()}</li>
		</ul>
		<p>{m.legal_priv_2_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_priv_3_titulo()}</h2>
		<p>
			{m.legal_priv_3_p1_antes()} <strong>{m.legal_priv_3_p1_destaque()}</strong>
			{m.legal_priv_3_p1_depois()}
		</p>
	</section>

	<section>
		<h2>{m.legal_priv_4_titulo()}</h2>
		<p>{m.legal_priv_4_p1()}</p>
		<ul>
			<li><strong>Supabase</strong>{m.legal_priv_4_supabase()}</li>
			<li><strong>Vercel</strong>{m.legal_priv_4_vercel()}</li>
			<li><strong>Google</strong>{m.legal_priv_4_google()}</li>
		</ul>
		<p>{m.legal_priv_4_p2()}</p>
	</section>

	<section>
		<h2>{m.legal_priv_5_titulo()}</h2>
		<p>{m.legal_priv_5_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_priv_6_titulo()}</h2>
		<p>{m.legal_priv_6_p1()}</p>
		<ul>
			<li>{m.legal_priv_6_item_1()}</li>
			<li>{m.legal_priv_6_item_2()}</li>
			<li>{m.legal_priv_6_item_3()}</li>
			<li>{m.legal_priv_6_item_4()}</li>
			<li>{m.legal_priv_6_item_5()}</li>
		</ul>
		<p>{m.legal_priv_6_p2({ contato: LEGAL.contato })}</p>
	</section>

	<section>
		<h2>{m.legal_priv_7_titulo()}</h2>
		<p>{m.legal_priv_7_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_priv_8_titulo()}</h2>
		<p>
			{m.legal_priv_8_p1({ contato: LEGAL.contato })}
			<a href={resolve('/termos')} class="font-medium text-primary-700 underline">{m.legal_link_termos()}</a>.
		</p>
	</section>
</LegalPage>
