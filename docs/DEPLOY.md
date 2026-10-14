# Publicar BookingSystem sem misturar com Orbitta

1. No GitHub, crie um novo repositório privado, vazio: `fgscarvalho37-a11y/BookingSystem`.
2. Importe **somente os arquivos desta pasta**. Não copie arquivos para `fgscarvalho37-a11y/orbitta`.
3. Crie um novo projeto na Vercel, apontando para o repositório `BookingSystem`, framework Next.js.
4. Crie banco PostgreSQL independente (por exemplo, novo projeto Supabase chamado `BookingSystem`). Aplique `sql/schema.sql`.
5. Configure somente no backend do BookingSystem: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `ORBITTA_LICENSE_URL`, `ORBITTA_LICENSE_TOKEN`.
6. Teste o SaaS primeiro com `trial_until` e sem cobrança, usando site `/s/{slug}` e painel `/admin`.
7. Na Orbitta, mantenha apenas a página comercial e um único plano. A assinatura paga deve gerar/vincular um contrato `client_products.id` do produto `orbitta-bookings`.
8. Revise o PR #13 da Orbitta e publique apenas quando testes forem concluídos. Configure `ORBITTA_BOOKINGS_LICENSE_KEY` privado na API Orbitta. Vincule `orbitta_product_id` do BookingSystem ao contrato da Orbitta.
9. Teste: pagamento em dia > site online; status SUSPENDED > site e POST /reserve bloqueados; reativação > site volta sem deploy.

## Cuidados

- O site público de cada empresa fica no projeto do BookingSystem, nunca em `/admin/agendamentos` da Orbitta.
- Não compartilhe a mesma credencial de acesso administrativo entre clientes finais. O login global atual é só para administração interna da Orbitta durante testes.
- Não coloque senhas/chaves no ZIP, no repositório ou em variáveis `NEXT_PUBLIC_`.
- Não habilite cobrança real antes de validar webhooks e renovação.
