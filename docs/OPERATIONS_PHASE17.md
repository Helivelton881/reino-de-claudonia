# Fase 17 — Backup, migration e rollback

1. Antes de migration de produção, gerar backup pelo Supabase Dashboard/CLI e registrar timestamp.
2. SQL novo é sempre versionado em `supabase/NNN_*.sql`; nunca editar migration já aplicada.
3. Aplicar primeiro em ambiente de teste/transação quando possível.
4. Validar login, leitura/escrita de personagem e RLS após migration.
5. Em incidente, interromper deploys, preservar logs, restaurar backup ou executar o rollback correspondente somente após avaliar perda de dados.
6. `iv_admin_audit` não possui policy pública: anon/authenticated não podem ler/escrever via API exposta.
7. Dados de personagem continuam no JSON `iv_personagens.dados`; mudanças de formato devem possuir migração/sanitização no servidor.
