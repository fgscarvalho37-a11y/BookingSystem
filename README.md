# BookingSystem — SaaS independente, integrado à Orbitta apenas para assinaturas

Este é um **novo projeto**. Não é um módulo de `/admin` da Orbitta.

| Projeto | Responsabilidade |
| --- | --- |
| **BookingSystem** (este repositório) | Site público personalizado por empresa, ZIPs de tema, agendamentos, disponibilidade, painel de administração e banco próprio |
| **Orbitta** (`orbitta.space`) | Catálogo comercial, plano único, cobrança, renovação e suspensão de contrato |
| **Integração interna** | BookingSystem consulta uma API privada na Orbitta para saber se o contrato da empresa permite acesso |

## URLs do BookingSystem

- `/` — apresentação visual própria do SaaS (não é a Orbitta)
- `/admin` — painel de gestão de empresas, serviços, calendários e temas
- `/s/{slug}` — site personalizado de cada estabelecimento
- `/api/public/{slug}/availability` — disponibilidade real
- `/api/public/{slug}/reserve` — reserva com verificação de conflito no PostgreSQL

## Rodar o projeto (Node.js 22+)

1. Crie **um banco PostgreSQL novo** somente para o BookingSystem (não reutilize o banco da Orbitta ou do PizzaSystem).
2. Execute `sql/schema.sql` nesse banco.
3. Faça uma cópia de `.env.example` chamada `.env.local` e configure `DATABASE_URL`, `ADMIN_PASSWORD` (mínimo 12 caracteres) e `SESSION_SECRET` (mínimo 32 caracteres).
4. Execute `npm install`, `npm run verify:architecture`, `npm run typecheck`, `npm run build` e `npm run dev`.
5. Abra `http://localhost:3000/admin`, cadastre um negócio, crie serviços, configure o horário, um período de testes de até 14 dias e publique o site. Depois, teste `/s/{slug}`.

O modo de **teste** usa `trial_until` para autorizar empresas sem contrato até o fim do período. Um cliente pagante usa `orbitta_product_id` vinculado ao ID do contrato da Orbitta.

## Suspensão automática por assinatura

O código da ponte da Orbitta está no [PR #13](https://github.com/fgscarvalho37-a11y/orbitta/pull/13), ainda não publicado. A API da Orbitta verifica o contrato do produto `orbitta-bookings`, o status e a data de renovação. O BookingSystem consulta esse endpoint no **servidor**, com `ORBITTA_LICENSE_URL` e `ORBITTA_LICENSE_TOKEN` (nunca expostos no frontend). Contratos suspensos, cancelados ou vencidos não podem publicar a página pública nem aceitar novas reservas. Reservas anteriores não são apagadas.

O servidor da Orbitta precisará ter `ORBITTA_BOOKINGS_LICENSE_KEY` com o mesmo valor que `ORBITTA_LICENSE_TOKEN`; esse valor deve ficar exclusivamente nas variáveis privadas do serviço. O produto comercial da Orbitta fica separado, com slug de catálogo `orbitta-bookings` e plano único em USD quando aprovado e configurado.

## Personalização com ZIP

`/admin` aceita ZIP com `index.html`, `style.css`, `app.js`, `assets/*.png|jpg|webp`. Exemplo em `examples/north-studio-theme.zip`. Os arquivos são servidos isolados em iframe sandbox; a funcionalidade de reserva continua sendo responsabilidade do SaaS e não do ZIP. Alterar um ZIP não remove agendamentos.

## Demonstração sem banco

Abra `examples/preview-corrigida.html` e use o botão `OPEN BUSINESS DASHBOARD`. Essa demonstração é **local** e salva apenas no navegador. Ela não é a plataforma publicada e não é um recurso da Orbitta.

## O que ainda precisa ser concluído antes de vender

- Repositório GitHub independente: `fgscarvalho37-a11y/BookingSystem`.
- Criar projeto Vercel próprio do BookingSystem, não usar o projeto Vercel da Orbitta.
- Criar banco PostgreSQL separado, configurar domínio, executar testes de ponta a ponta.
- Conectar a licença Orbitta após revisão da ponte e testar suspensão e reativação reais.
- Substituir o login único de administração por contas isoladas por cliente, implementar limite de requisições e políticas de dados pessoais antes do lançamento público.

O código inclui um workflow `.github/workflows/ci.yml` que testa a separação arquitetural, roda o typecheck e o build do Next.js após subir para o GitHub.

**Estado atual:** código preparado para importação. Não afirmar que está online ou que o checkout está liberado antes de verificar o deploy, o banco e as integrações.
