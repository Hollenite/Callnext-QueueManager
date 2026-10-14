-- Confirm new owners immediately so Create account can open the desk
-- without waiting on the built-in mailer (2 messages/hour, team inboxes only).

create or replace function public.confirm_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists confirm_owner on auth.users;
create trigger confirm_owner
  before insert on auth.users
  for each row
  execute function public.confirm_owner();
