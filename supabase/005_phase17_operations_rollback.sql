-- Rollback da migration 005. Executar apenas em restauração operacional deliberada.
drop table if exists public.iv_admin_audit;
