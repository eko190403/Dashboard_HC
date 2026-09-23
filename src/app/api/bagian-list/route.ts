import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const komoditi = searchParams.get('komoditi');

        // Ambil ID upload terakhir
        const { data: latestUpload } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        let query = supabase
            .from('employee_domisili')
            .select('bagian')
            .not('bagian', 'is', null);

        if (latestUpload) query = query.eq('upload_id', latestUpload.id);
        if (komoditi && komoditi !== 'Semua') query = query.eq('komoditi', komoditi);

        const { data, error } = await query;
        if (error) throw error;

        // Deduplicate dan sort
        const bagianList = Array.from(
            new Set((data || []).map((r: any) => r.bagian).filter(Boolean))
        ).sort();

        return NextResponse.json({ bagianList });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
