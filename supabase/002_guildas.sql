-- Reino De Claudonia - Fase 5: guildas
-- Uma guilda tem um líder (um personagem) e até 30 membros.
-- Para entrar, o líder precisa convidar antes (tabela de convites).

create table if not exists public.iv_guildas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  lider uuid not null references public.iv_personagens(id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint iv_guilda_nome_formato check (nome ~ '^[A-Za-zÀ-ÿ0-9]+( [A-Za-zÀ-ÿ0-9]+)*$' and char_length(nome) between 3 and 16)
);
create unique index if not exists iv_guildas_nome_unico on public.iv_guildas (lower(nome));
create index if not exists iv_guildas_lider on public.iv_guildas (lider);

create table if not exists public.iv_guilda_membros (
  personagem_id uuid primary key references public.iv_personagens(id) on delete cascade,
  guilda_id uuid not null references public.iv_guildas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  cargo text not null default 'membro' check (cargo in ('lider','membro')),
  entrou_em timestamptz not null default now()
);
create index if not exists iv_guilda_membros_guilda on public.iv_guilda_membros (guilda_id);
create index if not exists iv_guilda_membros_user on public.iv_guilda_membros (user_id);

create table if not exists public.iv_guilda_convites (
  guilda_id uuid not null references public.iv_guildas(id) on delete cascade,
  personagem_id uuid not null references public.iv_personagens(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (guilda_id, personagem_id)
);
create index if not exists iv_guilda_convites_personagem on public.iv_guilda_convites (personagem_id);

-- Funções de apoio (security definer para enxergar personagens de outras contas só para estas checagens).
-- Ficam no schema iv_privado, que não aparece na API.
create schema if not exists iv_privado;
revoke all on schema iv_privado from public, anon;
grant usage on schema iv_privado to authenticated;

create or replace function iv_privado.iv_e_meu_personagem(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.iv_personagens c where c.id = pid and c.user_id = (select auth.uid()));
$$;

create or replace function iv_privado.iv_sou_lider(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.iv_guildas g join public.iv_personagens c on c.id = g.lider
    where g.id = gid and c.user_id = (select auth.uid())
  );
$$;

create or replace function iv_privado.iv_nome_do_personagem(pid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.nome from public.iv_personagens c where c.id = pid;
$$;

create or replace function iv_privado.iv_tem_convite(gid uuid, pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.iv_guilda_convites v where v.guilda_id = gid and v.personagem_id = pid);
$$;

revoke execute on function iv_privado.iv_e_meu_personagem(uuid) from public, anon;
revoke execute on function iv_privado.iv_sou_lider(uuid) from public, anon;
revoke execute on function iv_privado.iv_nome_do_personagem(uuid) from public, anon;
revoke execute on function iv_privado.iv_tem_convite(uuid, uuid) from public, anon;
grant execute on function iv_privado.iv_e_meu_personagem(uuid) to authenticated;
grant execute on function iv_privado.iv_sou_lider(uuid) to authenticated;
grant execute on function iv_privado.iv_nome_do_personagem(uuid) to authenticated;
grant execute on function iv_privado.iv_tem_convite(uuid, uuid) to authenticated;

alter table public.iv_guildas enable row level security;
alter table public.iv_guilda_membros enable row level security;
alter table public.iv_guilda_convites enable row level security;

-- Guildas: todos que estão logados veem; só o dono do personagem líder cria ou desfaz.
create policy "iv guildas ver" on public.iv_guildas
  for select to authenticated using (true);
create policy "iv guildas criar" on public.iv_guildas
  for insert to authenticated with check (iv_privado.iv_e_meu_personagem(lider));
create policy "iv guildas desfazer" on public.iv_guildas
  for delete to authenticated using (iv_privado.iv_e_meu_personagem(lider));

-- Membros: todos veem. Entra quem é o líder da guilda (ao criar) ou quem tem convite.
-- Sai o próprio membro; o líder pode expulsar.
create policy "iv membros ver" on public.iv_guilda_membros
  for select to authenticated using (true);
create policy "iv membros entrar" on public.iv_guilda_membros
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and iv_privado.iv_e_meu_personagem(personagem_id)
    and nome = iv_privado.iv_nome_do_personagem(personagem_id)
    and (
      (cargo = 'lider' and exists (select 1 from public.iv_guildas g where g.id = guilda_id and g.lider = personagem_id))
      or (cargo = 'membro' and iv_privado.iv_tem_convite(guilda_id, personagem_id))
    )
  );
create policy "iv membros sair" on public.iv_guilda_membros
  for delete to authenticated using (
    user_id = (select auth.uid())
    or (cargo = 'membro' and iv_privado.iv_sou_lider(guilda_id))
  );

-- Convites: o líder cria; o convidado ou o líder apagam.
create policy "iv convites ver" on public.iv_guilda_convites
  for select to authenticated using (iv_privado.iv_e_meu_personagem(personagem_id) or iv_privado.iv_sou_lider(guilda_id));
create policy "iv convites criar" on public.iv_guilda_convites
  for insert to authenticated with check (iv_privado.iv_sou_lider(guilda_id));
create policy "iv convites apagar" on public.iv_guilda_convites
  for delete to authenticated using (iv_privado.iv_e_meu_personagem(personagem_id) or iv_privado.iv_sou_lider(guilda_id));

-- Limite de 30 membros por guilda.
create or replace function iv_privado.iv_limite_membros()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.iv_guilda_membros where guilda_id = new.guilda_id) >= 30 then
    raise exception 'A guilda já tem 30 membros' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
drop trigger if exists iv_limite_membros on public.iv_guilda_membros;
create trigger iv_limite_membros before insert on public.iv_guilda_membros
  for each row execute function iv_privado.iv_limite_membros();
revoke execute on function iv_privado.iv_limite_membros() from public, anon, authenticated;
