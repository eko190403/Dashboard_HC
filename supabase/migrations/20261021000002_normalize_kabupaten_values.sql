update public.summary_domisili
set kabupaten = case
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') in (
        'bandar lampung',
        'kota bandar lampung',
        'bandar lampung kota',
        'bandar lampung kota bandar lampung'
    ) then 'Kota Bandar Lampung'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') in ('metro', 'kota metro') then 'Kota Metro'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') = 'lampung tengahl' then 'Lampung Tengah'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') = 'tulan bawang barat' then 'Tulang Bawang Barat'
    else initcap(regexp_replace(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g'), '[[:punct:]]+$', ''))
end
where kabupaten is not null
    and btrim(kabupaten) <> ''
    and kabupaten <> 'Tidak Diketahui';

update public.employee_domisili
set kabupaten = case
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') in (
        'bandar lampung',
        'kota bandar lampung',
        'bandar lampung kota',
        'bandar lampung kota bandar lampung'
    ) then 'Kota Bandar Lampung'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') in ('metro', 'kota metro') then 'Kota Metro'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') = 'lampung tengahl' then 'Lampung Tengah'
    when regexp_replace(lower(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g')), '[[:punct:]]+$', '') = 'tulan bawang barat' then 'Tulang Bawang Barat'
    else initcap(regexp_replace(regexp_replace(btrim(kabupaten), '[[:space:]]+', ' ', 'g'), '[[:punct:]]+$', ''))
end
where kabupaten is not null
    and btrim(kabupaten) <> ''
    and kabupaten <> 'Tidak Diketahui';

notify pgrst, 'reload schema';
