<script>
	import { resolve } from '$app/paths';
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { LEGAL } from '$lib/legal';
	import { m } from '$lib/paraglide/messages';
</script>

<LegalPage title={m.legal_termos_titulo()} description={m.legal_termos_descricao()}>
	<section>
		<p>
			{m.legal_termos_intro({ responsavel: LEGAL.responsavel })}
			<a href={resolve('/privacidade')} class="font-medium text-primary-700 underline">{m.legal_link_privacidade()}</a>.
		</p>
	</section>

	<section>
		<h2>{m.legal_termos_1_titulo()}</h2>
		<p>{m.legal_termos_1_p1()}</p>
		<p>
			{m.legal_termos_1_p2_antes()} <strong>{m.legal_termos_1_p2_destaque()}</strong>
			{m.legal_termos_1_p2_depois()}
		</p>
	</section>

	<section>
		<h2>{m.legal_termos_2_titulo()}</h2>
		<p>{m.legal_termos_2_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_termos_3_titulo()}</h2>
		<ul>
			<li>{m.legal_termos_3_item_1()}</li>
			<li>{m.legal_termos_3_item_2()}</li>
		</ul>
	</section>

	<section>
		<h2>{m.legal_termos_4_titulo()}</h2>
		<ul>
			<li>{m.legal_termos_4_item_1()}</li>
			<li>{m.legal_termos_4_item_2()}</li>
			<li>{m.legal_termos_4_item_3()}</li>
			<li>{m.legal_termos_4_item_4()}</li>
		</ul>
	</section>

	<section>
		<h2>{m.legal_termos_5_titulo()}</h2>
		<ul>
			<li>{m.legal_termos_5_item_1()}</li>
			<li>{m.legal_termos_5_item_2()}</li>
			<li>{m.legal_termos_5_item_3()}</li>
		</ul>
		<p>{m.legal_termos_5_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_termos_6_titulo()}</h2>
		<p>{m.legal_termos_6_p1()}</p>
	</section>

	<section>
		<h2>{m.legal_termos_7_titulo()}</h2>
		<p>{m.legal_termos_7_p1({ contato: LEGAL.contato })}</p>
	</section>
</LegalPage>
