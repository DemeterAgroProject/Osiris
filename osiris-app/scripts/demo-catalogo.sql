-- Catálogo de demonstração: 4 anunciantes fictícios da Campanha gaúcha com máquinas, insumos,
-- serviços e avaliações. Para apresentações e testes com usuários.
--   npx supabase db query --linked -f scripts/demo-catalogo.sql
-- Pode rodar de novo: apaga a versão anterior (inclusive negociações, operações, avaliações,
-- favoritos e notificações ligadas a ela) e recria. Para remover tudo: scripts/remover-demo-catalogo.sql
--
-- Os anunciantes são usuários sem senha (ninguém consegue entrar com eles), com e-mail no domínio
-- reservado .invalid e ids fixos: perfis d0000000-…, anúncios d1000000-… (produtos e máquinas) e
-- d4000000-… (serviços), operações d5000000-…. Fotos: Unsplash (licença livre), por URL.

-- 1. versão anterior e tudo que depende dela
create temp table demo_negociacoes on commit drop as
select id from public.negotiations
where client_id::text like 'd0000000-%' or provider_id::text like 'd0000000-%'
   or product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';

create temp table demo_operacoes on commit drop as
select id from public.bookings
where client_id::text like 'd0000000-%' or provider_id::text like 'd0000000-%'
   or product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%'
   or negotiation_id in (select id from demo_negociacoes);

delete from public.reviews where booking_id in (select id from demo_operacoes)
   or reviewer_id::text like 'd0000000-%' or reviewee_id::text like 'd0000000-%';
delete from public.notifications
where user_id::text like 'd0000000-%'
   or related_id in (select id from demo_negociacoes union all select id from demo_operacoes);
delete from public.bookings where id in (select id from demo_operacoes);
delete from public.negotiation_messages where negotiation_id in (select id from demo_negociacoes);
delete from public.negotiations where id in (select id from demo_negociacoes);
delete from public.favorites where product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';
delete from public.product_images where product_id::text like 'd1000000-%';
delete from public.agricultural_machinery where product_id::text like 'd1000000-%';
delete from public.products where id::text like 'd1000000-%';
delete from public.services where id::text like 'd4000000-%';
delete from public.push_subscriptions where user_id::text like 'd0000000-%';
delete from auth.users where id::text like 'd0000000-%'; -- apaga os perfis em cascata

-- 2. anunciantes (o trigger handle_new_user cria o perfil)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email, '',
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', v.nome),
       now() - interval '120 days', now(), '', '', '', ''
from (values
  ('d0000000-0000-4000-8000-000000000001', 'Agropecuária Santa Rita', 'santa-rita@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000002', 'Fazenda Três Coxilhas', 'tres-coxilhas@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000003', 'Pampa Sementes e Insumos', 'pampa-sementes@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000004', 'Coxilha Serviços Agrícolas', 'coxilha-servicos@demo.invalid')
) as v(id, nome, email);

-- nome, foto e cidade (código IBGE): Bagé, Dom Pedrito, Alegrete e São Gabriel
update public.profiles p
set display_name = v.nome,
    photo_url = format('https://images.unsplash.com/%s?auto=format&fit=crop&w=400&h=400&q=80', v.foto),
    municipio_id = v.municipio,
    created_at = now() - interval '120 days'
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'Agropecuária Santa Rita', 'photo-1590154743804-cf7c51dcbfd3', 4301602),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'Fazenda Três Coxilhas', 'photo-1437252611977-07f74518abd7', 4306601),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'Pampa Sementes e Insumos', 'photo-1529511582893-2d7e684dd128', 4300406),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'Coxilha Serviços Agrícolas', 'photo-1531798123643-26d5ab4c264d', 4318309)
) as v(id, nome, foto, municipio)
where p.id = v.id;

-- 3. máquinas
with dados(n, dono, nome, descricao, preco, horas_atras, marca, tipo, modelo, ano, horimetro,
           negocio, cobranca, operador, condicao, cv, tracao, entrega, fotos) as (values
  (1, 1, 'Trator John Deere 6110J 4x4 2019',
   'Trator revisado na concessionária, pneus 70%, cabine com ar-condicionado e controle remoto duplo. Único dono, sempre guardado em galpão.',
   385000, 2, 'John Deere', 'Trator', '6110J', 2019, 4200,
   'venda', 'hora', false, 'usada', 110, '4x4', 'a_combinar',
   array['photo-1614977645540-7abd88ba8e56', 'photo-1564868480822-32f714a0e763']),
  (2, 2, 'Trator Massey Ferguson 4292 para aluguel',
   'Aluguel por hora para preparo de solo e plantio. Atendemos Dom Pedrito e Bagé; a máquina sai revisada e abastecida.',
   180, 5, 'Massey Ferguson', 'Trator', '4292', 2017, 6800,
   'aluguel', 'hora', false, 'usada', 92, '4x4', 'retirada',
   array['photo-1606739211185-2c846d734a6d']),
  (3, 2, 'Colheitadeira New Holland TC5090 com operador',
   'Disponível para a safra de soja, com plataforma draper de 25 pés e monitor de colheita. Valor por hectare colhido, operador incluso.',
   260, 9, 'New Holland', 'Colheitadeira', 'TC5090', 2015, 3900,
   'aluguel', 'hectare', true, 'usada', 175, '4x2', 'entrega',
   array['photo-1635174815469-6efd052297d4', 'photo-1635174815483-81657b67ec48']),
  (4, 1, 'Colheitadeira John Deere S550 2016',
   'Colheitadeira com plataforma de 30 pés e piloto automático. Manutenção em dia, pronta para a próxima safra. Aceito proposta com troca.',
   1150000, 20, 'John Deere', 'Colheitadeira', 'S550', 2016, 2650,
   'venda', 'hora', false, 'usada', 312, '4x2', 'a_combinar',
   array['photo-1635174815612-fd9636f70146']),
  (5, 2, 'Pulverizador autopropelido Case IH Patriot 250',
   'Barra de 27 metros, tanque de 2.500 litros e GPS com corte de seção. Valor por hectare aplicado, operador incluso. Receituário por conta do contratante.',
   38, 30, 'Case IH', 'Pulverizador', 'Patriot 250', 2021, 1450,
   'aluguel', 'hectare', true, 'seminova', 215, '4x4', 'entrega',
   array['photo-1655130944276-496518f92f98', 'photo-1655130944281-072e0644db75']),
  (6, 1, 'Plantadeira Case IH Early Riser 16 linhas',
   'Plantadeira de precisão com 16 linhas de 50 cm e distribuição a vácuo. Usada em duas safras, sem reformas.',
   210000, 44, 'Case IH', 'Plantadeira', 'Early Riser 1200', 2022, 0,
   'venda', 'hora', false, 'seminova', null, null, 'retirada',
   array['photo-1717992649099-e2c0fc7408e3']),
  (7, 2, 'Trator Valtra A134 por diária',
   'Ideal para roçada, transporte e serviços de pátio. Diária de 8 horas, com retirada na fazenda.',
   900, 56, 'Valtra', 'Trator', 'A134', 2020, 2400,
   'aluguel', 'dia', false, 'usada', 125, '4x4', 'retirada',
   array['photo-1618346976725-71ee4a1ecc89']),
  (8, 1, 'Trator New Holland T7.245 2020',
   'Trator com transmissão automática, piloto automático e engate rápido. Documentação em dia, revisões na rede.',
   520000, 70, 'New Holland', 'Trator', 'T7.245', 2020, 3300,
   'venda', 'hora', false, 'seminova', 245, '4x4', 'a_combinar',
   array['photo-1615811361523-6bd03d7748e7'])
),
produtos as (
  insert into public.products (id, owner_id, name, description, price, category, quantity, stock_unit, status,
                               delivery, municipio_id, created_at, updated_at)
  select format('d1000000-0000-4000-8000-%s', lpad(d.n::text, 12, '0'))::uuid,
         format('d0000000-0000-4000-8000-%s', lpad(d.dono::text, 12, '0'))::uuid,
         d.nome, d.descricao, d.preco, 'Maquinário', 1, 'Unidade', 'ativo', d.entrega,
         (select municipio_id from public.profiles where id = format('d0000000-0000-4000-8000-%s', lpad(d.dono::text, 12, '0'))::uuid),
         now() - make_interval(hours => d.horas_atras), now() - make_interval(hours => d.horas_atras)
  from dados d
  returning id
),
maquinas as (
  insert into public.agricultural_machinery (product_id, brand_id, type_id, model, manufacture_year, current_horimeter,
                                             offer_type, rental_unit, operator_included, condition, power_hp, traction)
  select format('d1000000-0000-4000-8000-%s', lpad(d.n::text, 12, '0'))::uuid, b.id, t.id, d.modelo, d.ano, d.horimetro,
         d.negocio, d.cobranca, d.operador, d.condicao, d.cv, d.tracao
  from dados d
  join public.brands b on b.name = d.marca
  join public.machinery_types t on t.name = d.tipo
  where exists (select 1 from produtos)
  returning id
)
insert into public.product_images (product_id, url, is_cover)
select format('d1000000-0000-4000-8000-%s', lpad(d.n::text, 12, '0'))::uuid,
       format('https://images.unsplash.com/%s?auto=format&fit=crop&w=1080&q=80', f.foto),
       f.ordem = 1
from dados d
cross join lateral unnest(d.fotos) with ordinality as f(foto, ordem)
where exists (select 1 from maquinas);

-- 4. insumos da Pampa Sementes (preço por unidade de estoque)
with dados(n, nome, descricao, preco, categoria, quantidade, unidade, marca, cultivar, safra, minimo, entrega, horas_atras, foto) as (values
  (21, 'Semente de soja certificada BMX Zeus — saca 40 kg',
   'Cultivar de ciclo médio indicada para a Campanha, com germinação acima de 90% e tratamento industrial.',
   290, 'Sementes', 300, 'Sacas', 'Brasmax', 'BMX Zeus IPRO', '2025/26', 10, 'entrega', 4, 'photo-1601993488142-d3050a16478d'),
  (22, 'Semente de milho híbrido — saca 60 mil sementes',
   'Híbrido de alto potencial produtivo para safra de verão. Retirada em Alegrete ou frete a combinar.',
   980, 'Sementes', 120, 'Sacas', null, null, '2025/26', 5, 'a_combinar', 16, 'photo-1615485290161-7eb49a34eba5'),
  (23, 'Trigo para semente — saca 40 kg',
   'Semente de trigo de lavoura própria, beneficiada e com análise de laboratório.',
   95, 'Sementes', 500, 'Sacas', null, null, '2025', 20, 'retirada', 36, 'photo-1574323347407-f5e1ad6d020b'),
  (24, 'Adubo NPK 05-20-20 a granel',
   'Fertilizante granulado para plantio de soja e milho. Entrega na região com frete a combinar.',
   3400, 'Fertilizantes', 40, 'Toneladas', null, null, null, 2, 'entrega', 50, 'photo-1710223221719-6251cb1b5c5b'),
  (25, 'Mudas de eucalipto clonal I144',
   'Mudas de viveiro com 90 a 120 dias, prontas para o plantio.',
   0.85, 'Mudas', 20000, 'Unidades', null, 'Clone I144', null, 1000, 'retirada', 80, 'photo-1683994851774-6e9642fb8a95'),
  (26, 'Calcário dolomítico',
   'Corretivo de acidez com PRNT acima de 85%. Entrega a granel em caminhão basculante.',
   180, 'Corretivos', 300, 'Toneladas', null, null, null, 10, 'entrega', 26, 'photo-1562722902-d33533894eea'),
  (27, 'Milho em grão — saca 60 kg',
   'Milho seco e limpo, ideal para ração. Carregamento no armazém em Alegrete.',
   72, 'Grãos', 800, 'Sacas', null, null, '2025/26', 50, 'retirada', 12, 'photo-1634467524884-897d0af5e104')
),
produtos as (
  insert into public.products (id, owner_id, name, description, price, category, quantity, stock_unit, status,
                               brand_name, cultivar, harvest, min_order, delivery, municipio_id, created_at, updated_at)
  select format('d1000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
         'd0000000-0000-4000-8000-000000000003'::uuid,
         nome, descricao, preco, categoria, quantidade, unidade, 'ativo',
         marca, cultivar, safra, minimo, entrega, 4300406,
         now() - make_interval(hours => horas_atras), now() - make_interval(hours => horas_atras)
  from dados
  returning id
)
insert into public.product_images (product_id, url, is_cover)
select format('d1000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
       format('https://images.unsplash.com/%s?auto=format&fit=crop&w=1080&q=80', foto), true
from dados
where exists (select 1 from produtos);

-- 5. serviços
insert into public.services (id, owner_id, title, description, service_type, pricing_model, price, location,
                             equipment, service_radius_km, municipio_id, image_url, status, created_at, updated_at)
select format('d4000000-0000-4000-8000-%s', lpad(v.n::text, 12, '0'))::uuid,
       format('d0000000-0000-4000-8000-%s', lpad(v.dono::text, 12, '0'))::uuid,
       v.titulo, v.descricao, v.tipo, v.cobranca, v.preco, v.local, v.equipamento, v.raio, v.municipio,
       format('https://images.unsplash.com/%s?auto=format&fit=crop&w=1080&q=80', v.foto), 'ativo',
       now() - make_interval(hours => v.horas_atras), now() - make_interval(hours => v.horas_atras)
from (values
  (1, 4, 'Colheita de soja com colheitadeira e operador',
   'Colheita com equipe própria e caminhão de apoio. Agenda aberta para a safra.',
   'Pacote Completo', 'Por Hectare', 280, 'Campanha gaúcha', 'Colheitadeira com plataforma de 30 pés e caminhão graneleiro', 120, 4318309,
   3, 'photo-1565647952915-9644fcd446a4'),
  (2, 4, 'Pulverização terrestre com autopropelido',
   'Aplicação de defensivos com GPS e corte de seção. Receituário agronômico por conta do contratante.',
   'Pacote Completo', 'Por Hectare', 45, 'Campanha e Fronteira Oeste', 'Autopropelido com barra de 27 m e GPS', 150, 4318309,
   26, 'photo-1627920768905-575535d6dd2e'),
  (3, 4, 'Operador de trator para plantio e preparo de solo',
   'Tratorista com 12 anos de experiência em plantio direto. Trabalho com o seu equipamento.',
   'Mão de Obra', 'Por Hora', 60, 'São Gabriel e região', null, 60, 4318309,
   40, 'photo-1573353597405-d3a8e88b793d'),
  (4, 2, 'Manutenção de máquinas agrícolas a campo',
   'Revisões, hidráulica e solda na propriedade. Orçamento após avaliação.',
   'Mão de Obra', 'A Combinar', null, 'Dom Pedrito e região', 'Oficina móvel com solda e hidráulica', 100, 4306601,
   64, 'photo-1675640433299-ea7c9d56723c')
) as v(n, dono, titulo, descricao, tipo, cobranca, preco, local, equipamento, raio, municipio, horas_atras, foto);

-- 6. operações finalizadas entre os anunciantes, com avaliações (a vitrine não começa com "Sem avaliações")
with operacoes(n, prestador, cliente, produto, servico, preco, dias_atras) as (values
  (1, 4, 2, null, 1, 33600, 60),  -- Três Coxilhas contratou a colheita da Coxilha (120 ha)
  (2, 2, 1, 2, null, 7200, 52),   -- Santa Rita alugou o MF 4292 (40 h)
  (3, 2, 3, 3, null, 20800, 45),  -- Pampa Sementes contratou a colheitadeira (80 ha)
  (4, 3, 1, 24, null, 34000, 40), -- Santa Rita comprou adubo (10 t)
  (5, 3, 4, 21, null, 14500, 33), -- Coxilha comprou sementes de soja (50 sacas)
  (6, 4, 3, null, 2, 9000, 25),   -- Pampa Sementes contratou a pulverização (200 ha)
  (7, 1, 2, 6, null, 210000, 18)  -- Três Coxilhas comprou a plantadeira da Santa Rita
),
inseridas as (
  insert into public.bookings (id, provider_id, client_id, product_id, service_id, start_date, end_date, status,
                               total_price, created_at)
  select format('d5000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
         format('d0000000-0000-4000-8000-%s', lpad(prestador::text, 12, '0'))::uuid,
         format('d0000000-0000-4000-8000-%s', lpad(cliente::text, 12, '0'))::uuid,
         case when produto is null then null else format('d1000000-0000-4000-8000-%s', lpad(produto::text, 12, '0'))::uuid end,
         case when servico is null then null else format('d4000000-0000-4000-8000-%s', lpad(servico::text, 12, '0'))::uuid end,
         now() - make_interval(days => dias_atras), now() - make_interval(days => dias_atras - 3),
         'finalizada', preco, now() - make_interval(days => dias_atras + 2)
  from operacoes
  returning id
)
insert into public.reviews (booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
select format('d5000000-0000-4000-8000-%s', lpad(r.op::text, 12, '0'))::uuid,
       format('d0000000-0000-4000-8000-%s', lpad(r.autor::text, 12, '0'))::uuid,
       format('d0000000-0000-4000-8000-%s', lpad(r.avaliado::text, 12, '0'))::uuid,
       r.nota, r.comentario, now() - make_interval(days => r.dias_atras)
from (values
  (1, 2, 4, 5, 'Colheita rápida e equipe pontual. Perda na plataforma muito baixa.', 56),
  (1, 4, 2, 5, 'Área bem preparada e pagamento em dia.', 56),
  (2, 1, 2, 5, 'Trator entregue revisado e abastecido, como combinado.', 48),
  (3, 3, 2, 4, 'Bom serviço. Atrasou um dia por causa da chuva, mas avisaram antes.', 41),
  (4, 1, 3, 5, 'Adubo entregue no prazo e com nota. Recomendo.', 36),
  (5, 4, 3, 4, 'Semente de boa germinação. A retirada poderia ser mais rápida.', 29),
  (6, 3, 4, 5, 'Aplicação certinha, com relatório do GPS no final.', 21),
  (7, 2, 1, 5, 'Plantadeira exatamente como no anúncio. Negócio tranquilo.', 14)
) as r(op, autor, avaliado, nota, comentario, dias_atras)
where exists (select 1 from inseridas);

-- as avaliações acima geram notificações para os perfis fictícios: não interessam a ninguém
delete from public.notifications where user_id::text like 'd0000000-%';

select
  (select count(*) from public.profiles where id::text like 'd0000000-%') as anunciantes,
  (select count(*) from public.products where id::text like 'd1000000-%' and category = 'Maquinário') as maquinas,
  (select count(*) from public.products where id::text like 'd1000000-%' and category <> 'Maquinário') as insumos,
  (select count(*) from public.services where id::text like 'd4000000-%') as servicos,
  (select count(*) from public.product_images where product_id::text like 'd1000000-%') as fotos,
  (select count(*) from public.reviews where booking_id::text like 'd5000000-%') as avaliacoes;
