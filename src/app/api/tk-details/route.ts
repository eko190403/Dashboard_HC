import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const komoditi = searchParams.get('komoditi');
        const bagian = searchParams.get('bagian');
        const gender = searchParams.get('gender');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const search = searchParams.get('search') || '';

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // Ambil ID upload terakhir
        const { data: latestUpload, error: uploadError } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        if (uploadError && uploadError.code !== 'PGRST116') {
            throw uploadError;
        }

        // Build base query (for count)
        let countQuery = supabase
            .from('employee_domisili')
            .select('id', { count: 'exact', head: true });

        let dataQuery = supabase
            .from('employee_domisili')
            .select('kit_tk, employee_name, kit_mandor, nama_mandor, kasi, indeks_tk, bagian, gender');

        // Apply common filters
        const applyFilters = (q: any) => {
            if (latestUpload) q = q.eq('upload_id', latestUpload.id);
            if (komoditi && komoditi !== 'Semua') q = q.eq('komoditi', komoditi);
            if (bagian) q = q.eq('bagian', bagian);
            if (gender === 'L') q = q.in('gender', ['L', 'male', 'Male', 'laki-laki']);
            if (gender === 'P') q = q.in('gender', ['P', 'female', 'Female', 'perempuan']);
            if (search) q = q.ilike('employee_name', `%${search}%`);
            return q;
        };

        countQuery = applyFilters(countQuery);
        dataQuery = applyFilters(dataQuery);

        // Get total count
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // Get paginated data
        const { data, error } = await dataQuery
            .order('employee_name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

        return NextResponse.json({
            data,
            page,
            totalPages,
            totalCount: count ?? 0,
            pageSize: PAGE_SIZE,
        });

    } catch (error: any) {
        console.error('Error fetching TK details:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
