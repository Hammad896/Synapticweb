-- ═══════════════════════════════════════════════════════════════════════════
-- Synaptic Lab — employee self-service update links
--
-- Run in the Supabase SQL Editor AFTER schema.sql (reuses is_admin()).
-- Idempotent; safe to re-run.
--
-- SECURITY MODEL — the same shape as QR verification:
--   * The link token is an unguessable uuid4 with a 24-hour expiry.
--   * Anonymous users can NEVER select or write the table. They interact only
--     through two SECURITY DEFINER functions: one returns the single row the
--     token unlocks, one accepts a submission with a server-side whitelist of
--     fields and lengths. There is nothing to enumerate and nothing else to
--     write.
--   * Nothing applies to the employee record until an admin approves it.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists employee_update_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  token         uuid unique not null default gen_random_uuid(),
  expires_at    timestamptz not null default now() + interval '24 hours',
  status        text not null default 'pending'
                check (status in ('pending','submitted','approved','rejected')),
  submitted     jsonb default '{}'::jsonb,
  submitted_at  timestamptz,
  created_at    timestamptz default now()
);

alter table employee_update_requests enable row level security;

drop policy if exists "admins manage update requests" on employee_update_requests;
create policy "admins manage update requests" on employee_update_requests
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── The employee's read: ONE row for ONE valid token ───────────────────────
create or replace function get_update_request(req_token uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  r record;
begin
  select q.expires_at, e.full_name, e.role, e.phone, e.cnic, e.date_of_birth,
         e.address, e.email, e.emergency_name, e.emergency_relationship,
         e.emergency_phone
    into r
  from employee_update_requests q
  join employees e on e.id = q.employee_id
  where q.token = req_token
    and q.status = 'pending'
    and q.expires_at > now()
  limit 1;

  if not found then
    return json_build_object('valid', false);
  end if;

  return json_build_object(
    'valid', true,
    'expires_at', r.expires_at,
    'full_name', r.full_name,
    'role', r.role,
    'phone', r.phone,
    'cnic', r.cnic,
    'date_of_birth', r.date_of_birth,
    'address', r.address,
    'email', r.email,
    'emergency_name', r.emergency_name,
    'emergency_relationship', r.emergency_relationship,
    'emergency_phone', r.emergency_phone
  );
end;
$$;

-- ── The employee's write: whitelisted fields, capped lengths, once ─────────
create or replace function submit_update_request(req_token uuid, payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  clean jsonb;
begin
  select id into r
  from employee_update_requests
  where token = req_token
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  if pg_column_size(payload) > 4096 then
    return false;
  end if;

  -- The whitelist IS here, in the database — the client cannot smuggle a
  -- salary or status change no matter what it sends.
  clean := jsonb_strip_nulls(jsonb_build_object(
    'phone',                  left(payload->>'phone', 60),
    'cnic',                   left(payload->>'cnic', 40),
    'date_of_birth',          left(payload->>'date_of_birth', 10),
    'address',                left(payload->>'address', 200),
    'email',                  left(payload->>'email', 120),
    'emergency_name',         left(payload->>'emergency_name', 80),
    'emergency_relationship', left(payload->>'emergency_relationship', 60),
    'emergency_phone',        left(payload->>'emergency_phone', 60)
  ));

  update employee_update_requests
     set submitted = clean, status = 'submitted', submitted_at = now()
   where id = r.id;

  return true;
end;
$$;

grant execute on function get_update_request(uuid) to anon, authenticated;
grant execute on function submit_update_request(uuid, jsonb) to anon, authenticated;
