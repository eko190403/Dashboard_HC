import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface BagianRow {
    bagian: string | null;
}

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
        const rows = (data || []) as BagianRow[];
        const bagianList = Array.from(
            new Set(rows.map(r => r.bagian).filter((bagian): bagian is string => Boolean(bagian)))
        ).sort();

        return NextResponse.json({ bagianList });

    } catch (error: unknown) {
        const message = typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
