-- Dados técnicos que faltavam nos anúncios.
-- Máquinas: condição, potência, unidade do aluguel (hora, dia ou hectare) e operador incluso.
-- Máquinas e insumos (products): entrega; insumos: marca/fabricante e pedido mínimo.
-- Todos opcionais, para não invalidar os anúncios antigos.


-- 1. Máquinas

alter table public.agricultural_machinery
  add column if not exists condition text
    constraint agricultural_machinery_condition_check check (condition in ('nova', 'seminova', 'usada')),
  add column if not exists power_hp integer
    constraint agricultural_machinery_power_hp_check check (power_hp between 1 and 2000),
  add column if not exists rental_unit text not null default 'hora'
    constraint agricultural_machinery_rental_unit_check check (rental_unit in ('hora', 'dia', 'hectare')),
  add column if not exists operator_included boolean not null default false;

comment on column public.agricultural_machinery.condition is 'nova | seminova | usada';
comment on column public.agricultural_machinery.power_hp is 'Potência do motor em cv.';
comment on column public.agricultural_machinery.rental_unit is 'Aluguel: products.price é por hora, dia ou hectare. Ignorado na venda.';
comment on column public.agricultural_machinery.operator_included is 'Aluguel: o preço inclui o operador.';


-- 2. Máquinas e insumos

alter table public.products
  add column if not exists delivery text
    constraint products_delivery_check check (delivery in ('retirada', 'entrega', 'a_combinar')),
  add column if not exists brand_name text
    constraint products_brand_name_check check (char_length(brand_name) <= 80),
  add column if not exists min_order numeric
    constraint products_min_order_check check (min_order > 0);

comment on column public.products.delivery is 'retirada (no local) | entrega (na região) | a_combinar';
comment on column public.products.brand_name is 'Insumos: marca ou fabricante (máquinas usam agricultural_machinery.brand_id).';
comment on column public.products.min_order is 'Insumos: pedido mínimo, na mesma unidade de stock_unit.';

-- unidades gravadas em minúsculas por versões antigas do formulário
update public.products set stock_unit = 'Unidades' where stock_unit in ('unidade', 'Unidade') and category <> 'Maquinário';


-- 3. Marcas e tipos de máquina (as listas tinham 6 e 4 opções)

insert into public.brands (name)
select v.name from (values
  ('Agrale'), ('Baldan'), ('CLAAS'), ('Fendt'), ('Jacto'), ('Jumil'), ('Kubota'), ('Kuhn'),
  ('LS Tractor'), ('Mahindra'), ('Marchesan'), ('Semeato'), ('Stara'), ('Valmet'), ('Vence Tudo'),
  ('Yanmar'), ('Outra')
) as v(name)
on conflict (name) do nothing;

insert into public.machinery_types (name)
select v.name from (values
  ('Carreta graneleira'), ('Distribuidor de adubo'), ('Drone agrícola'), ('Enfardadeira'),
  ('Escavadeira'), ('Grade'), ('Pá carregadeira'), ('Roçadeira'), ('Semeadora'), ('Caminhão'),
  ('Outro')
) as v(name)
on conflict (name) do nothing;
