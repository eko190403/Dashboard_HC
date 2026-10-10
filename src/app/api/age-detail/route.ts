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
        const uploadIdParam = searchParams.get('upload_id');

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const [minAge, maxAge] = getAgeRange(range);

        let uploadId = uploadIdParam;
        if (!uploadId) {
            const { data: latestUpload } = await supabase
                .from('upload_logs')
                .select('id')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            if (latestUpload) uploadId = latestUpload.id;
        }

        let query = supabase
            .from('employee_domisili')
            .select('kit_tk, employee_name, age, gender, komoditi, bagian, nama_desa, kecamatan', { count: 'exact' });

        if (uploadId) query = query.eq('upload_id', uploadId);
        
        if (komoditi && komoditi !== 'Semua') {
            query = query.eq('komoditi', komoditi);
        }

        if (range === '55+') {
            query = query.gte('age', 56);
        } else if (range) {
            query = query.gte('age', minAge).lte('age', maxAge);
        }

        if (search) {
            query = query.ilike('employee_name', `%${search}%`);
        }

        const { data, count, error } = await query
            .order('age', { ascending: true })
            .range(from, to);

        if (error) throw error;

        // Data komoditi sudah clean dari proses upload, kembalikan apa adanya
        const mappedData = (data || []).map(row => ({
            ...row,
            komoditi: row.komoditi || 'Lainnya'
        }));

        return NextResponse.json({
            data: mappedData,
            page,
            totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
            totalCount: count ?? 0,
            pageSize: PAGE_SIZE,
        });

    } catch (error: unknown) {
        console.error('Error fetching age details:', error);
        const message = typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
