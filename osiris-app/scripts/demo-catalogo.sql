-- Catálogo de demonstração: 4 anunciantes fictícios da Campanha gaúcha com máquinas, insumos e serviços.
-- Para apresentações e testes com usuários. Pode rodar de novo: apaga a versão anterior e recria.
--   npx supabase db query --linked -f scripts/demo-catalogo.sql
-- Para remover tudo: scripts/remover-demo-catalogo.sql
--
-- Os anunciantes são usuários sem senha (ninguém consegue entrar com eles), com e-mail no domínio
-- reservado .invalid e ids fixos começando por d0000000. Fotos: Unsplash (licença livre), por URL.

-- 1. versão anterior
delete from public.product_images where product_id::text like 'd1000000-%';
delete from public.agricultural_machinery where product_id::text like 'd1000000-%';
delete from public.favorites where product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';
delete from public.products where id::text like 'd1000000-%';
delete from public.services where id::text like 'd4000000-%';
delete from auth.users where id::text like 'd0000000-%'; -- apaga os perfis em cascata

-- 2. anunciantes (o trigger handle_new_user cria o perfil)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email, '',
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', v.nome),
       now() - interval '60 days', now(), '', '', '', ''
from (values
  ('d0000000-0000-4000-8000-000000000001', 'Agropecuária Santa Rita', 'santa-rita@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000002', 'Fazenda Três Coxilhas', 'tres-coxilhas@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000003', 'Pampa Sementes e Insumos', 'pampa-sementes@demo.invalid'),
  ('d0000000-0000-4000-8000-000000000004', 'Coxilha Serviços Agrícolas', 'coxilha-servicos@demo.invalid')
) as v(id, nome, email);

update public.profiles p
set display_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u
where u.id = p.id and p.id::text like 'd0000000-%';

-- 3. máquinas
with dados(n, dono, nome, descricao, preco, horas_atras, marca, tipo, modelo, ano, horimetro, negocio, fotos) as (values
  (1, 1, 'Trator John Deere 6110J 4x4 2019',
   'Trator revisado na concessionária, pneus 70%, cabine com ar-condicionado e controle remoto duplo. Único dono, sempre guardado em galpão.',
   385000, 2, 'John Deere', 'Trator', '6110J', 2019, 4200, 'venda',
   array['photo-1614977645540-7abd88ba8e56', 'photo-1564868480822-32f714a0e763']),
  (2, 2, 'Trator Massey Ferguson 4292 para aluguel',
   'Aluguel por hora para preparo de solo e plantio. Acompanha operador experiente se necessário (valor à parte). Atendemos Dom Pedrito e Bagé.',
   180, 5, 'Massey Ferguson', 'Trator', '4292', 2017, 6800, 'aluguel',
   array['photo-1606739211185-2c846d734a6d']),
  (3, 2, 'Colheitadeira New Holland TC5090 com plataforma 25 pés',
   'Disponível para a safra de soja. Plataforma draper de 25 pés, monitor de colheita. Valor por hora de máquina trabalhando.',
   650, 9, 'New Holland', 'Colheitadeira', 'TC5090', 2015, 3900, 'aluguel',
   array['photo-1635174815469-6efd052297d4', 'photo-1635174815483-81657b67ec48']),
  (4, 1, 'Colheitadeira John Deere S550 2016',
   'Colheitadeira com plataforma de 30 pés e piloto automático. Manutenção em dia, pronta para a próxima safra. Aceito proposta com troca.',
   1150000, 20, 'John Deere', 'Colheitadeira', 'S550', 2016, 2650, 'venda',
   array['photo-1635174815612-fd9636f70146']),
  (5, 2, 'Pulverizador autopropelido Case IH Patriot 250',
   'Barra de 27 metros, tanque de 2.500 litros e GPS com corte de seção. Aluguel por hora; o operador vai junto.',
   320, 30, 'Case IH', 'Pulverizador', 'Patriot 250', 2018, 3100, 'aluguel',
   array['photo-1655130944276-496518f92f98', 'photo-1655130944281-072e0644db75']),
  (6, 1, 'Plantadeira Case IH Early Riser 16 linhas',
   'Plantadeira de precisão com 16 linhas de 50 cm, distribuição a vácuo. Usada em duas safras, sem reformas.',
   210000, 44, 'Case IH', 'Plantadeira', 'Early Riser 1200', 2021, null, 'venda',
   array['photo-1717992649099-e2c0fc7408e3']),
  (7, 2, 'Trator Valtra A134 para serviços leves',
   'Ideal para roçada, transporte e serviços de pátio. Aluguel por hora, com retirada na fazenda.',
   150, 56, 'Valtra', 'Trator', 'A134', 2020, 2400, 'aluguel',
   array['photo-1618346976725-71ee4a1ecc89']),
  (8, 1, 'Trator New Holland T7.245 2020',
   'Trator com transmissão automática, 245 cv, piloto automático e engate rápido. Documentação em dia.',
   520000, 70, 'New Holland', 'Trator', 'T7.245', 2020, 3300, 'venda',
   array['photo-1615811361523-6bd03d7748e7'])
),
produtos as (
  insert into public.products (id, owner_id, name, description, price, category, quantity, stock_unit, status, created_at, updated_at)
  select format('d1000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
         format('d0000000-0000-4000-8000-%s', lpad(dono::text, 12, '0'))::uuid,
         nome, descricao, preco, 'Maquinário', 1, 'Unidade', 'ativo',
         now() - make_interval(hours => horas_atras), now() - make_interval(hours => horas_atras)
  from dados
  returning id
),
maquinas as (
  insert into public.agricultural_machinery (product_id, brand_id, type_id, model, manufacture_year, current_horimeter, offer_type)
  select format('d1000000-0000-4000-8000-%s', lpad(d.n::text, 12, '0'))::uuid, b.id, t.id, d.modelo, d.ano, d.horimetro, d.negocio
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

-- 4. insumos (preço por unidade de estoque)
with dados(n, nome, descricao, preco, categoria, quantidade, unidade, horas_atras, foto) as (values
  (21, 'Semente de soja certificada — saca 40 kg',
   'Cultivar de ciclo médio indicada para a Campanha, com germinação acima de 90% e tratamento industrial. Preço por saca.',
   290, 'Sementes', 300, 'Sacas', 4, 'photo-1601993488142-d3050a16478d'),
  (22, 'Semente de milho híbrido — saca 60 mil sementes',
   'Híbrido de alto potencial produtivo para safra de verão. Preço por saca, retirada em Alegrete ou frete a combinar.',
   980, 'Sementes', 120, 'Sacas', 16, 'photo-1615485290161-7eb49a34eba5'),
  (23, 'Trigo para semente — saca 40 kg',
   'Semente de trigo de lavoura própria, beneficiada e com análise de laboratório. Preço por saca.',
   95, 'Sementes', 500, 'Sacas', 36, 'photo-1574323347407-f5e1ad6d020b'),
  (24, 'Adubo NPK 05-20-20 a granel',
   'Fertilizante granulado para plantio de soja e milho. Preço por tonelada, entrega na região com frete a combinar.',
   3400, 'Fertilizantes', 40, 'Toneladas', 50, 'photo-1710223221719-6251cb1b5c5b'),
  (25, 'Mudas de eucalipto clonal',
   'Mudas de viveiro com 90 a 120 dias, prontas para o plantio. Preço por muda; pedido mínimo de mil unidades.',
   0.85, 'Mudas', 20000, 'Unidades', 80, 'photo-1683994851774-6e9642fb8a95')
),
produtos as (
  insert into public.products (id, owner_id, name, description, price, category, quantity, stock_unit, status, created_at, updated_at)
  select format('d1000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
         'd0000000-0000-4000-8000-000000000003'::uuid,
         nome, descricao, preco, categoria, quantidade, unidade, 'ativo',
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
insert into public.services (id, owner_id, title, description, service_type, pricing_model, price, location, status, created_at, updated_at)
select format('d4000000-0000-4000-8000-%s', lpad(v.n::text, 12, '0'))::uuid,
       format('d0000000-0000-4000-8000-%s', lpad(v.dono::text, 12, '0'))::uuid,
       v.titulo, v.descricao, v.tipo, v.cobranca, v.preco, v.local, 'ativo',
       now() - make_interval(hours => v.horas_atras), now() - make_interval(hours => v.horas_atras)
from (values
  (1, 4, 'Colheita de soja com colheitadeira e operador',
   'Colheitadeira com plataforma de 30 pés, operador e caminhão de apoio. Agenda aberta para a safra.',
   'Pacote Completo', 'Por Hectare', 280, 'São Gabriel e região, RS', 3),
  (2, 4, 'Pulverização terrestre com autopropelido',
   'Aplicação de defensivos com GPS e corte de seção. Receituário agronômico por conta do contratante.',
   'Pacote Completo', 'Por Hectare', 45, 'Campanha gaúcha, RS', 26),
  (3, 4, 'Operador de trator para plantio e preparo de solo',
   'Tratorista com 12 anos de experiência em plantio direto. Trabalho com o seu equipamento.',
   'Mão de Obra', 'Por Hora', 60, 'Bagé, RS', 40),
  (4, 2, 'Manutenção de máquinas agrícolas a campo',
   'Mecânico com oficina móvel: revisões, hidráulica e solda. Orçamento após avaliação na propriedade.',
   'Mão de Obra', 'A Combinar', null, 'Dom Pedrito, RS', 64)
) as v(n, dono, titulo, descricao, tipo, cobranca, preco, local, horas_atras);

select
  (select count(*) from public.profiles where id::text like 'd0000000-%') as anunciantes,
  (select count(*) from public.products where id::text like 'd1000000-%') as produtos_e_maquinas,
  (select count(*) from public.agricultural_machinery where product_id::text like 'd1000000-%') as maquinas,
  (select count(*) from public.product_images where product_id::text like 'd1000000-%') as fotos,
  (select count(*) from public.services where id::text like 'd4000000-%') as servicos;
