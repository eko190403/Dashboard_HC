import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

function getAgeRange(range: string): [number, number] {
    switch (range) {
        case '18-35': return [18, 35];
        case '36-45': return [36, 45];
        case '46-55': return [46, 55];
        case '55+': return [56, 999];
        default: return [0, 999];
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '';
        const komoditi = searchParams.get('komoditi') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const search = searchParams.get('search') || '';

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const [minAge, maxAge] = getAgeRange(range);

        // Ambil ID upload terakhir
        const { data: latestUpload } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        const applyFilters = (q: any) => {
            if (latestUpload) q = q.eq('upload_id', latestUpload.id);
            if (komoditi && komoditi !== 'Semua') q = q.eq('komoditi', komoditi);
            if (range === '55+') {
                q = q.gte('age', 56);
            } else if (range) {
                q = q.gte('age', minAge).lte('age', maxAge);
            }
            if (search) q = q.ilike('employee_name', `%${search}%`);
            return q;
        };

        // Count
        let countQuery = supabase
            .from('employee_domisili')
            .select('id', { count: 'exact', head: true });
        countQuery = applyFilters(countQuery);
        const { count } = await countQuery;

        // Data
        let dataQuery = supabase
            .from('employee_domisili')
            .select('kit_tk, employee_name, age, gender, komoditi, bagian, nama_desa, kecamatan');
        dataQuery = applyFilters(dataQuery);
        const { data, error } = await dataQuery
            .order('age', { ascending: true })
            .range(from, to);

        if (error) throw error;

        return NextResponse.json({
            data,
            page,
            totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
            totalCount: count ?? 0,
            pageSize: PAGE_SIZE,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
