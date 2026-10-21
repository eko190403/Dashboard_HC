with uploads_to_rebuild as (
    select distinct upload_id
    from public.summary_domisili
    where is_grouped = true
),
deleted_summaries as (
    delete from public.summary_domisili as s
    using uploads_to_rebuild as u
    where s.upload_id = u.upload_id
    returning s.upload_id
),
affected_uploads as (
    select distinct upload_id
    from deleted_summaries
),
village_counts as (
    select
        e.upload_id,
        e.nama_desa,
        e.kecamatan,
        e.kabupaten,
        count(*)::integer as jumlah_tk,
        count(*) filter (where upper(coalesce(e.gender, '')) = 'L')::integer as jumlah_laki,
        count(*) filter (where upper(coalesce(e.gender, '')) = 'P')::integer as jumlah_perempuan
    from public.employee_domisili as e
    join affected_uploads as u on u.upload_id = e.upload_id
    group by e.upload_id, e.nama_desa, e.kecamatan, e.kabupaten
),
upload_totals as (
    select u.id as upload_id, u.total_hc
    from public.upload_logs as u
    join affected_uploads as r on r.upload_id = u.id
)
insert into public.summary_domisili (
    upload_id,
    nama_desa,
    kecamatan,
    kabupaten,
    jumlah_tk,
    persentase,
    is_grouped,
    jumlah_laki,
    jumlah_perempuan
)
select
    v.upload_id,
    v.nama_desa,
    v.kecamatan,
    v.kabupaten,
    v.jumlah_tk,
    case
        when t.total_hc > 0 then round(v.jumlah_tk * 100.0 / t.total_hc, 2)
        else 0
    end,
    false,
    v.jumlah_laki,
    v.jumlah_perempuan
from village_counts as v
join upload_totals as t on t.upload_id = v.upload_id;
