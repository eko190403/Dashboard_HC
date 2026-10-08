create table if not exists public.employee_master (
    personnel_number text primary key,
    full_name text,
    mandor_code text,
    mandor_name text,
    kasie text,
    choice text,
    subdep text,
    updated_at timestamptz not null default now()
);

create index if not exists employee_master_mandor_code_idx
    on public.employee_master (mandor_code);

create index if not exists employee_master_full_name_idx
    on public.employee_master (lower(full_name));

alter table public.employee_master enable row level security;

revoke all on table public.employee_master from anon, authenticated;
grant select on table public.employee_master to service_role;

notify pgrst, 'reload schema';
