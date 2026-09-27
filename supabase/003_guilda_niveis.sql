-- Reino De Claudonia - Fase 5 (mais perto do Flyff): nível da guilda, doações e cargos.
-- Cargos: lider (1), conselheiro (até 5), capitao (até 10), apoiador (até 20), novato (o resto).
-- A guilda sobe de nível com pontos doados; cada nível aceita mais membros.

alter table public.iv_guildas add column if not exists nivel int not null default 1;
alter table public.iv_guildas add column if not exists exp int not null default 0;
alter table public.iv_guilda_membros add column if not exists contribuicao int not null default 0;

update public.iv_guilda_membros set cargo = 'novato' where cargo = 'membro';
alter table public.iv_guilda_membros drop constraint if exists iv_guilda_membros_cargo_check;
alter table public.iv_guilda_membros add constraint iv_guilda_membros_cargo_check
  check (cargo in ('lider','conselheiro','capitao','apoiador','novato'));
alter table public.iv_guilda_membros alter column cargo set default 'novato';

-- Máximo de membros por nível (1: 10, 2: 15, 3: 20, 4: 25, 5: 30 ... 10: 50, depois +5 por nível até 100).
create or replace function iv_privado.iv_max_membros(n int)
returns int language sql immutable set search_path = '' as $$
  select case when n <= 5 then 5 + 5 * n
              when n <= 10 then 30 + 4 * (n - 5)
              else least(100, 50 + 5 * (n - 10)) end;
$$;
-- Pontos para passar do nível n para o n+1.
create or replace function iv_privado.iv_exp_guilda(n int)
returns int language sql immutable set search_path = '' as $$
  select 500 * n * n;
$$;
grant execute on function iv_privado.iv_max_membros(int) to authenticated;
grant execute on function iv_privado.iv_exp_guilda(int) to authenticated;

-- Líder e conselheiros podem convidar.
create or replace function iv_privado.iv_pode_convidar(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.iv_guilda_membros m join public.iv_personagens c on c.id = m.personagem_id
    where m.guilda_id = gid and m.cargo in ('lider','conselheiro') and c.user_id = (select auth.uid())
  );
$$;
revoke execute on function iv_privado.iv_pode_convidar(uuid) from public, anon;
grant execute on function iv_privado.iv_pode_convidar(uuid) to authenticated;

drop policy if exists "iv convites criar" on public.iv_guilda_convites;
create policy "iv convites criar" on public.iv_guilda_convites
  for insert to authenticated with check (iv_privado.iv_pode_convidar(guilda_id));
drop policy if exists "iv convites apagar" on public.iv_guilda_convites;
create policy "iv convites apagar" on public.iv_guilda_convites
  for delete to authenticated using (iv_privado.iv_e_meu_personagem(personagem_id) or iv_privado.iv_pode_convidar(guilda_id));
drop policy if exists "iv convites ver" on public.iv_guilda_convites;
create policy "iv convites ver" on public.iv_guilda_convites
  for select to authenticated using (iv_privado.iv_e_meu_personagem(personagem_id) or iv_privado.iv_pode_convidar(guilda_id));

-- Quem entra por convite entra como novato.
drop policy if exists "iv membros entrar" on public.iv_guilda_membros;
create policy "iv membros entrar" on public.iv_guilda_membros
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and iv_privado.iv_e_meu_personagem(personagem_id)
    and nome = iv_privado.iv_nome_do_personagem(personagem_id)
    and contribuicao = 0
    and (
      (cargo = 'lider' and exists (select 1 from public.iv_guildas g where g.id = guilda_id and g.lider = personagem_id))
      or (cargo = 'novato' and iv_privado.iv_tem_convite(guilda_id, personagem_id))
    )
  );
-- Sai o próprio membro; o líder pode retirar qualquer um que não seja o líder.
drop policy if exists "iv membros sair" on public.iv_guilda_membros;
create policy "iv membros sair" on public.iv_guilda_membros
  for delete to authenticated using (
    user_id = (select auth.uid())
    or (cargo <> 'lider' and iv_privado.iv_sou_lider(guilda_id))
  );

-- Limite de membros conforme o nível da guilda.
create or replace function iv_privado.iv_limite_membros()
returns trigger language plpgsql security definer set search_path = '' as $$
declare lim int;
begin
  select iv_privado.iv_max_membros(g.nivel) into lim from public.iv_guildas g where g.id = new.guilda_id;
  if (select count(*) from public.iv_guilda_membros where guilda_id = new.guilda_id) >= coalesce(lim, 10) then
    raise exception 'A guilda está cheia para o nível atual' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
revoke execute on function iv_privado.iv_limite_membros() from public, anon, authenticated;

-- Doação: soma pontos na guilda e na contribuição do membro, e sobe de nível (máximo 50).
create or replace function public.iv_guilda_doar(p_personagem uuid, p_pontos int)
returns table (nivel int, exp int) language plpgsql security definer set search_path = '' as $$
declare gid uuid; n int; e int;
begin
  if p_pontos is null or p_pontos < 1 or p_pontos > 10000000 then
    raise exception 'Doação inválida' using errcode = 'P0003';
  end if;
  if not iv_privado.iv_e_meu_personagem(p_personagem) then
    raise exception 'Personagem de outra conta' using errcode = '42501';
  end if;
  select m.guilda_id into gid from public.iv_guilda_membros m where m.personagem_id = p_personagem;
  if gid is null then raise exception 'Sem guilda' using errcode = 'P0003'; end if;
  update public.iv_guilda_membros set contribuicao = contribuicao + p_pontos where personagem_id = p_personagem;
  select g.nivel, g.exp + p_pontos into n, e from public.iv_guildas g where g.id = gid for update;
  while n < 50 and e >= iv_privado.iv_exp_guilda(n) loop
    e := e - iv_privado.iv_exp_guilda(n); n := n + 1;
  end loop;
  if n >= 50 then e := 0; end if;
  update public.iv_guildas g set nivel = n, exp = e where g.id = gid;
  return query select n, e;
end;
$$;
revoke execute on function public.iv_guilda_doar(uuid, int) from public, anon;
grant execute on function public.iv_guilda_doar(uuid, int) to authenticated;

-- Mudar cargo: só o líder; respeita os limites de cada cargo.
create or replace function public.iv_guilda_cargo(p_guilda uuid, p_nome text, p_cargo text)
returns void language plpgsql security definer set search_path = '' as $$
declare lim int; atual int;
begin
  if not iv_privado.iv_sou_lider(p_guilda) then
    raise exception 'Só o líder muda cargos' using errcode = '42501';
  end if;
  if p_cargo not in ('conselheiro','capitao','apoiador','novato') then
    raise exception 'Cargo inválido' using errcode = 'P0003';
  end if;
  lim := case p_cargo when 'conselheiro' then 5 when 'capitao' then 10 when 'apoiador' then 20 else 1000 end;
  select count(*) into atual from public.iv_guilda_membros where guilda_id = p_guilda and cargo = p_cargo;
  if atual >= lim then
    raise exception 'Esse cargo já está cheio (máximo %)', lim using errcode = 'P0003';
  end if;
  update public.iv_guilda_membros set cargo = p_cargo
    where guilda_id = p_guilda and nome = p_nome and cargo <> 'lider';
end;
$$;
revoke execute on function public.iv_guilda_cargo(uuid, text, text) from public, anon;
grant execute on function public.iv_guilda_cargo(uuid, text, text) to authenticated;
