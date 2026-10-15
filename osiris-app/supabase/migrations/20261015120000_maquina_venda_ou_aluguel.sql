-- Anúncio de máquina diz se é venda ou aluguel por hora.
-- Antes o preço era sempre lido como "por hora", e um trator à venda aparecia como "R$ 285.000,00 / hora".

alter table public.agricultural_machinery
  add column if not exists offer_type text not null default 'aluguel'
  constraint agricultural_machinery_offer_type_check check (offer_type in ('venda', 'aluguel'));

comment on column public.agricultural_machinery.offer_type is
  'venda: products.price é o valor da máquina; aluguel: products.price é o valor da hora de uso.';

-- anúncios já existentes: preço de máquina a partir de R$ 10 mil só faz sentido como venda
update public.agricultural_machinery m
set offer_type = 'venda'
from public.products p
where p.id = m.product_id
  and p.price >= 10000
  and m.offer_type <> 'venda';
