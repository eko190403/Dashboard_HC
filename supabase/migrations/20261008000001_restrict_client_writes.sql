revoke insert, update, delete, truncate, references, trigger
    on table public.upload_logs, public.summary_domisili, public.employee_domisili, public.mandor_mapping
    from public, anon, authenticated;

revoke all on table public.employee_master from public, anon, authenticated;

grant select, insert, update, delete, truncate
    on table public.upload_logs, public.summary_domisili, public.employee_domisili, public.mandor_mapping
    to service_role;

grant select on table public.employee_master to service_role;

create policy deny_client_access_to_excel_backups
    on storage.objects
    as restrictive
    for all
    to anon, authenticated
    using (bucket_id <> 'excel-backups')
    with check (bucket_id <> 'excel-backups');
