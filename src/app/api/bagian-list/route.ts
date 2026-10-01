import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const komoditi = searchParams.get('komoditi');
        const uploadIdParam = searchParams.get('upload_id');

        // Ambil upload_id dari param atau fallback ke terakhir
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
            .select('bagian')
            .not('bagian', 'is', null);

        if (uploadId) query = query.eq('upload_id', uploadId);
        if (komoditi && komoditi !== 'Semua') {
            query = query.eq('komoditi', komoditi);
        }

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
