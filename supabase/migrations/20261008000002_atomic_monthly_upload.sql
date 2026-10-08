alter table public.upload_logs
    add column if not exists audit_summary text;

create or replace function public.replace_monthly_upload(
    p_filename text,
    p_total_hc integer,
    p_uploaded_by text,
    p_audit_summary jsonb,
    p_summary_data jsonb,
    p_employee_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_upload_id public.upload_logs.id%TYPE;
    v_month_start timestamptz := pg_catalog.date_trunc('month', pg_catalog.clock_timestamp());
    v_next_month timestamptz;
begin
    if p_filename is null or pg_catalog.btrim(p_filename) = '' then
        raise exception 'Upload filename is required';
    end if;

    if p_total_hc is null or p_total_hc <= 0 then
        raise exception 'Total HC must be greater than zero';
    end if;

    if p_audit_summary is null
        or p_summary_data is null
        or p_employee_data is null
        or pg_catalog.jsonb_typeof(p_audit_summary) <> 'object'
        or pg_catalog.jsonb_typeof(p_summary_data) <> 'array'
        or pg_catalog.jsonb_typeof(p_employee_data) <> 'array' then
        raise exception 'Invalid upload transaction payload';
    end if;

    if pg_catalog.jsonb_array_length(p_summary_data) = 0
        or pg_catalog.jsonb_array_length(p_employee_data) <> p_total_hc then
        raise exception 'Upload data does not match total HC';
    end if;

    if coalesce((
        select sum(r.jumlah_tk)
        from pg_catalog.jsonb_to_recordset(p_summary_data) as r(jumlah_tk integer)
    ), 0) <> p_total_hc then
        raise exception 'Summary totals do not match total HC';
    end if;

    v_month_start := pg_catalog.date_trunc('month', pg_catalog.clock_timestamp());
    v_next_month := v_month_start + interval '1 month';

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('replace-monthly-upload:' || v_month_start::date::text, 0)
    );

    delete from public.employee_domisili as e
    using public.upload_logs as u
    where e.upload_id = u.id
        and u.uploaded_at >= v_month_start
        and u.uploaded_at < v_next_month;

    delete from public.summary_domisili as s
    using public.upload_logs as u
    where s.upload_id = u.id
        and u.uploaded_at >= v_month_start
        and u.uploaded_at < v_next_month;

    delete from public.upload_logs
    where uploaded_at >= v_month_start
        and uploaded_at < v_next_month;

    insert into public.upload_logs (filename, total_hc, uploaded_by, audit_summary)
    values (p_filename, p_total_hc, p_uploaded_by, p_audit_summary::text)
    returning id into v_upload_id;

    insert into public.summary_domisili (
        upload_id,
        nama_desa,
        kecamatan,
        jumlah_tk,
        persentase,
        is_grouped,
        jumlah_laki,
        jumlah_perempuan
    )
    select
        v_upload_id,
        r.nama_desa,
        r.kecamatan,
        r.jumlah_tk,
        r.persentase,
        r.is_grouped,
        r.jumlah_laki,
        r.jumlah_perempuan
    from pg_catalog.jsonb_to_recordset(p_summary_data) as r(
        nama_desa text,
        kecamatan text,
        jumlah_tk integer,
        persentase numeric,
        is_grouped boolean,
        jumlah_laki integer,
        jumlah_perempuan integer
    );

    insert into public.employee_domisili (
        upload_id,
        nama_desa,
        kecamatan,
        employee_name,
        gender,
        street_address,
        employment_status,
        age,
        birth_date,
        komoditi,
        bagian,
        kit_tk,
        kit_mandor,
        nama_mandor,
        kasi,
        indeks_tk
    )
    select
        v_upload_id,
        r.nama_desa,
        r.kecamatan,
        r.employee_name,
        r.gender,
        r.street_address,
        r.employment_status,
        r.age,
        r.birth_date,
        r.komoditi,
        r.bagian,
        r.kit_tk,
        r.kit_mandor,
        r.nama_mandor,
        r.kasi,
        r.indeks_tk
    from pg_catalog.jsonb_to_recordset(p_employee_data) as r(
        nama_desa text,
        kecamatan text,
        employee_name text,
        gender text,
        street_address text,
        employment_status text,
        age integer,
        birth_date date,
        komoditi text,
        bagian text,
        kit_tk text,
        kit_mandor text,
        nama_mandor text,
        kasi text,
        indeks_tk text
    );

    return pg_catalog.jsonb_build_object('upload_id', v_upload_id);
end;
$function$;

revoke all on function public.replace_monthly_upload(text, integer, text, jsonb, jsonb, jsonb)
    from public, anon, authenticated;
grant execute on function public.replace_monthly_upload(text, integer, text, jsonb, jsonb, jsonb)
    to service_role;

notify pgrst, 'reload schema';
