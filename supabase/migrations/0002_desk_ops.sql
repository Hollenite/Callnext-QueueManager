-- Desk walk-ups, skip waiting no-shows, and put back a miss-tap.

create or replace function public.desk_join(
  queue_id uuid,
  name text
)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_name text := trim(desk_join.name);
  v_row public.queue_entries;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if v_name is null or char_length(v_name) < 1 then
    raise exception 'invalid_name';
  end if;

  select q.owner_id into v_owner
  from public.queues q
  where q.id = desk_join.queue_id;

  if not found then
    raise exception 'not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_authorized';
  end if;

  insert into public.queue_entries (
    queue_id,
    display_name,
    client_token,
    status
  )
  values (
    desk_join.queue_id,
    v_name,
    gen_random_uuid(),
    'waiting'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.dismiss_waiting(entry_id uuid)
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

  select q.owner_id, e.status
    into v_owner, v_status
  from public.queue_entries e
  join public.queues q on q.id = e.queue_id
  where e.id = dismiss_waiting.entry_id
  for update of e;

  if not found then
    raise exception 'not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_authorized';
  end if;
  if v_status <> 'waiting' then
    raise exception 'not_waiting';
  end if;

  update public.queue_entries
  set status = 'no_show',
      finished_at = now()
  where id = dismiss_waiting.entry_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.recall_entry(entry_id uuid)
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

  select q.owner_id, e.status
    into v_owner, v_status
  from public.queue_entries e
  join public.queues q on q.id = e.queue_id
  where e.id = recall_entry.entry_id
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
  set status = 'waiting',
      serving_at = null
  where id = recall_entry.entry_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.desk_join(uuid, text) from public;
revoke all on function public.dismiss_waiting(uuid) from public;
revoke all on function public.recall_entry(uuid) from public;

grant execute on function public.desk_join(uuid, text) to authenticated;
grant execute on function public.dismiss_waiting(uuid) to authenticated;
grant execute on function public.recall_entry(uuid) to authenticated;
