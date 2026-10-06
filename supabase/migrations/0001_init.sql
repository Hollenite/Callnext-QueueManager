-- Live Queue Manager schema, RLS, and race-safe RPCs.

create type public.entry_status as enum (
  'waiting',
  'serving',
  'done',
  'no_show',
  'left'
);

create table public.queues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  is_open boolean not null default true,
  default_service_minutes integer not null default 10
    check (default_service_minutes between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  status public.entry_status not null default 'waiting',
  joined_at timestamptz not null default now(),
  serving_at timestamptz,
  finished_at timestamptz,
  client_token uuid not null
);

create unique index queue_entries_one_active_token
  on public.queue_entries (queue_id, client_token)
  where status in ('waiting', 'serving');

create index queue_entries_waiting_joined
  on public.queue_entries (queue_id, joined_at)
  where status = 'waiting';

create index queue_entries_done_finished
  on public.queue_entries (queue_id, finished_at desc)
  where status = 'done';

alter table public.queues enable row level security;
alter table public.queue_entries enable row level security;
alter table public.queues replica identity full;
alter table public.queue_entries replica identity full;

-- Column grants: anon never sees client_token or service timestamps.
revoke all on public.queues from public, anon, authenticated;
revoke all on public.queue_entries from public, anon, authenticated;

grant select (
  id, owner_id, name, is_open, default_service_minutes, created_at
) on public.queues to anon;

grant select on public.queues to authenticated;

grant select (
  id, queue_id, display_name, status, joined_at
) on public.queue_entries to anon;

grant select on public.queue_entries to authenticated;

create policy queues_select
  on public.queues
  for select
  to anon, authenticated
  using (true);

create policy queue_entries_select
  on public.queue_entries
  for select
  to anon, authenticated
  using (true);

-- Writes are RPC-only. No insert/update/delete policies.

create or replace function public.create_queue(
  name text,
  default_service_minutes integer default 10
)
returns public.queues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.queues;
  v_name text := trim(create_queue.name);
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if v_name is null or char_length(v_name) < 1 then
    raise exception 'invalid_name';
  end if;

  insert into public.queues (owner_id, name, default_service_minutes)
  values (
    v_uid,
    v_name,
    coalesce(create_queue.default_service_minutes, 10)
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.set_queue_open(
  queue_id uuid,
  is_open boolean
)
returns public.queues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.queues;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;

  update public.queues
  set is_open = set_queue_open.is_open
  where id = set_queue_open.queue_id
    and owner_id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'not_found';
  end if;

  return v_row;
end;
$$;

create or replace function public.join_queue(
  queue_id uuid,
  name text,
  client_token uuid
)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open boolean;
  v_name text := trim(join_queue.name);
  v_row public.queue_entries;
begin
  if v_name is null or char_length(v_name) < 1 then
    raise exception 'invalid_name';
  end if;
  if join_queue.client_token is null then
    raise exception 'token_mismatch';
  end if;

  select q.is_open into v_open
  from public.queues q
  where q.id = join_queue.queue_id;

  if not found then
    raise exception 'not_found';
  end if;
  if not v_open then
    raise exception 'queue_closed';
  end if;

  if exists (
    select 1
    from public.queue_entries e
    where e.queue_id = join_queue.queue_id
      and e.client_token = join_queue.client_token
      and e.status in ('waiting', 'serving')
  ) then
    raise exception 'already_in_queue';
  end if;

  insert into public.queue_entries (
    queue_id,
    display_name,
    client_token,
    status
  )
  values (
    join_queue.queue_id,
    v_name,
    join_queue.client_token,
    'waiting'
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'already_in_queue';
end;
$$;

create or replace function public.call_next(queue_id uuid)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_row public.queue_entries;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;

  select q.owner_id into v_owner
  from public.queues q
  where q.id = call_next.queue_id;

  if not found then
    raise exception 'not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_authorized';
  end if;

  select e.* into v_row
  from public.queue_entries e
  where e.queue_id = call_next.queue_id
    and e.status = 'waiting'
  order by e.joined_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.queue_entries
  set status = 'serving',
      serving_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.finish_entry(
  entry_id uuid,
  outcome text
)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status public.entry_status;
  v_row public.queue_entries;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if finish_entry.outcome not in ('done', 'no_show') then
    raise exception 'invalid_outcome';
  end if;

  select q.owner_id, e.status
    into v_owner, v_status
  from public.queue_entries e
  join public.queues q on q.id = e.queue_id
  where e.id = finish_entry.entry_id
  for update of e;

  if not found then
    raise exception 'not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_authorized';
  end if;
  if v_status <> 'serving' then
    raise exception 'not_serving';
  end if;

  update public.queue_entries
  set status = finish_entry.outcome::public.entry_status,
      finished_at = now()
  where id = finish_entry.entry_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.leave_queue(
  entry_id uuid,
  client_token uuid
)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.queue_entries;
begin
  select e.* into v_row
  from public.queue_entries e
  where e.id = leave_queue.entry_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;
  if v_row.client_token <> leave_queue.client_token then
    raise exception 'token_mismatch';
  end if;
  if v_row.status <> 'waiting' then
    raise exception 'not_waiting';
  end if;

  update public.queue_entries
  set status = 'left',
      finished_at = now()
  where id = leave_queue.entry_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.wait_estimate(
  queue_id uuid,
  client_token uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_default integer;
  v_avg numeric;
  v_samples integer;
  v_ahead integer;
  v_my_joined timestamptz;
  v_my_status public.entry_status;
begin
  select q.default_service_minutes into v_default
  from public.queues q
  where q.id = wait_estimate.queue_id;

  if not found then
    raise exception 'not_found';
  end if;

  select count(*)::integer,
         avg(extract(epoch from (recent.finished_at - recent.serving_at)) / 60.0)
    into v_samples, v_avg
  from (
    select e.finished_at, e.serving_at
    from public.queue_entries e
    where e.queue_id = wait_estimate.queue_id
      and e.status = 'done'
      and e.serving_at is not null
      and e.finished_at is not null
    order by e.finished_at desc
    limit 20
  ) recent;

  if v_samples < 3 or v_avg is null then
    v_avg := v_default;
  end if;

  if wait_estimate.client_token is not null then
    select e.status, e.joined_at
      into v_my_status, v_my_joined
    from public.queue_entries e
    where e.queue_id = wait_estimate.queue_id
      and e.client_token = wait_estimate.client_token
      and e.status in ('waiting', 'serving')
    order by e.joined_at desc
    limit 1;

    if v_my_status is null then
      v_ahead := 0;
    elsif v_my_status = 'serving' then
      v_ahead := 0;
    else
      select
        (select count(*) from public.queue_entries e
          where e.queue_id = wait_estimate.queue_id
            and e.status = 'serving')
        +
        (select count(*) from public.queue_entries e
          where e.queue_id = wait_estimate.queue_id
            and e.status = 'waiting'
            and e.joined_at < v_my_joined)
      into v_ahead;
    end if;
  else
    select count(*)::integer into v_ahead
    from public.queue_entries e
    where e.queue_id = wait_estimate.queue_id
      and e.status in ('waiting', 'serving');
  end if;

  return jsonb_build_object(
    'people_ahead', v_ahead,
    'avg_minutes', round(v_avg::numeric, 1),
    'sample_count', coalesce(v_samples, 0)
  );
end;
$$;

revoke all on function public.create_queue(text, integer) from public;
revoke all on function public.set_queue_open(uuid, boolean) from public;
revoke all on function public.join_queue(uuid, text, uuid) from public;
revoke all on function public.call_next(uuid) from public;
revoke all on function public.finish_entry(uuid, text) from public;
revoke all on function public.leave_queue(uuid, uuid) from public;
revoke all on function public.wait_estimate(uuid, uuid) from public;

grant execute on function public.create_queue(text, integer) to authenticated;
grant execute on function public.set_queue_open(uuid, boolean) to authenticated;
grant execute on function public.call_next(uuid) to authenticated;
grant execute on function public.finish_entry(uuid, text) to authenticated;
grant execute on function public.join_queue(uuid, text, uuid) to anon, authenticated;
grant execute on function public.leave_queue(uuid, uuid) to anon, authenticated;
grant execute on function public.wait_estimate(uuid, uuid) to anon, authenticated;

alter publication supabase_realtime add table public.queues;
alter publication supabase_realtime add table public.queue_entries;
