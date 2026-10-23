# Osiris

**Marketplace do agro em formato de app para celular.** Produtores rurais anunciam e contratam
**máquinas agrícolas** (venda ou aluguel), **insumos** (sementes, fertilizantes, defensivos…) e
**serviços** (mão de obra ou pacote completo com equipamento). Tudo acontece dentro do app, do
anúncio à negociação, ao acompanhamento do serviço em campo e à avaliação entre as partes.

🌐 **App:** https://osiris-agro.vercel.app · disponível em **português, inglês e espanhol**

Projeto acadêmico desenvolvido na **Universidade Federal do Pampa (UNIPAMPA)**, curso de
Engenharia de Software, por **Eduardo Prates Tiadoro** e **Miguel Ângelo Bastos Muniz**.
Contato: projetoosiris@unipampa.edu.br

---

## O problema

Muitas máquinas agrícolas ficam paradas fora da safra, enquanto outros produtores precisam delas
por poucos dias. Hoje esse encontro costuma acontecer pelo boca a boca, por grupos de WhatsApp ou
por classificados genéricos: sem preço claro, sem histórico de quem é confiável e sem registro do
que foi combinado.

## A solução

O Osiris reúne a oferta e a procura do campo num só lugar:

| Etapa | O que a pessoa faz |
|---|---|
| **Anunciar** | Publica uma máquina (venda ou aluguel por hora, dia ou hectare, com ou sem operador), um insumo (preço por saca, kg, tonelada…) ou um serviço, sempre com a cidade e os dados técnicos. |
| **Buscar** | Encontra anúncios por tipo, preço e cidade, e salva os favoritos. |
| **Negociar** | Envia uma proposta com preço e período e conversa num chat em tempo real; o anunciante aceita, recusa ou ajusta os termos. |
| **Acompanhar** | Ao aceitar, a negociação vira uma **reserva** com etapas (aguardando início → em operação → em avaliação → finalizada), visível para os dois lados. |
| **Avaliar** | Cliente e anunciante se avaliam com nota e comentário; as avaliações aparecem no perfil e no anúncio e ajudam o próximo a decidir. |

Notificações push avisam de cada proposta, mensagem e mudança de etapa, mesmo com o celular
bloqueado. O app pode ser instalado na tela de início (PWA).

## Principais funcionalidades

- Anúncios de máquinas, insumos e serviços com fotos, cidade (municípios do IBGE) e dados técnicos
  (condição, potência, tração, marca, cultivar, safra, pedido mínimo, entrega…)
- Preço com unidade: por hora, dia, hectare, saca, tonelada, valor fechado ou a combinar
- Busca com filtros, favoritos e vitrine na página inicial
- Negociação com chat e atualização em tempo real
- Reservas com etapas, cancelamento com motivo e agenda do anunciante
- Avaliações de mão dupla, com lembrete automático
- Painel de controle e inventário para quem anuncia
- Notificações push no idioma de cada pessoa
- Três idiomas (português, inglês e espanhol), escolhidos automaticamente pelo celular ou no app
- Login com Google, apresentação no primeiro acesso, central de ajuda, termos de uso e política
  de privacidade (LGPD)
- Registros de uso e de erros para analisar os testes com usuários

## Tecnologia

| Camada | Tecnologia |
|---|---|
| Interface | SvelteKit 2, Svelte 5, Tailwind CSS 4 + Skeleton, PWA com service worker |
| Idiomas | Paraglide JS (pt, en, es) |
| Back-end | Supabase: Postgres com regras de negócio em triggers e RLS, Auth (Google), Realtime, Edge Functions, `pg_cron`, Vault |
| Notificações | Web Push (VAPID) via Edge Function |
| Hospedagem | Vercel |
| Qualidade | ESLint, svelte-check, testes E2E com Playwright, CI no GitHub Actions |

Não existe servidor próprio: o app conversa direto com o Supabase, e as regras de negócio e de
permissão ficam no banco, para que nenhuma delas dependa só da tela.

## Estrutura do repositório

```
osiris-app/                 o aplicativo (SvelteKit)
├── src/routes/             telas (início, busca, anúncio, negociações, operações, perfil…)
├── src/lib/                componentes e módulos compartilhados
├── messages/               textos do app em pt, en e es
├── supabase/migrations/    schema e regras do banco, versionados
├── supabase/functions/     Edge Function de envio de push
├── tests/e2e/              testes de ponta a ponta (Playwright)
├── scripts/                catálogo de demonstração e configuração do push
└── docs/                   documentação técnica
.github/workflows/          CI (lint, check e build em cada PR)
```

## Como rodar

Pré-requisitos: Node.js 24 e um projeto no Supabase.

```sh
cd osiris-app
npm install
cp .env.example .env   # preencha com os dados do seu projeto Supabase
npm run dev
```

O guia completo para desenvolvedores (scripts, banco de dados, push, testes e convenções) está em
[`osiris-app/README.md`](osiris-app/README.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [Guia do desenvolvedor](osiris-app/README.md) | setup, scripts, banco, push, testes |
| [Internacionalização](osiris-app/docs/i18n.md) | como funcionam os três idiomas |
| [Logs de uso e de erros](osiris-app/docs/logs.md) | eventos registrados e consultas para análise |
| [Plano de testes](osiris-app/docs/plano-de-testes.md) | cenários de teste e automação E2E |
| [Migração self-hosted](osiris-app/docs/migracao-self-hosted.md) | como levar o back-end para um servidor próprio |
| [CLAUDE.md](osiris-app/CLAUDE.md) | convenções e regras do código |

## Fluxo de trabalho

Cada pessoa trabalha na sua branch (`dev-*`), abre PR para `release` e, depois, de `release` para
`main`. A `main` é publicada automaticamente na Vercel. Todo PR passa pelo CI ("Lint, check e
build"), e a `main` exige revisão aprovada.
