-- Reino De Claudonia - Fase 3: personagens salvos por conta
create table if not exists public.iv_personagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  pos_x real not null default 0,
  pos_z real not null default 5,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint iv_nome_formato check (nome ~ '^[A-Za-zÀ-ÿ0-9]{3,16}$')
);

create unique index if not exists iv_personagens_nome_unico on public.iv_personagens (lower(nome));
create index if not exists iv_personagens_user on public.iv_personagens (user_id);

alter table public.iv_personagens enable row level security;

create policy "iv ver os seus" on public.iv_personagens
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "iv criar os seus" on public.iv_personagens
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "iv atualizar os seus" on public.iv_personagens
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "iv apagar os seus" on public.iv_personagens
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.iv_limite_personagens()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.iv_personagens where user_id = new.user_id) >= 3 then
    raise exception 'Limite de 3 personagens por conta' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists iv_limite on public.iv_personagens;
create trigger iv_limite before insert on public.iv_personagens
  for each row execute function public.iv_limite_personagens();
