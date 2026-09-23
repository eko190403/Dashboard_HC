import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        // Ambil ID upload terakhir
        const { data: latestUpload } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        let query = supabase
            .from('employee_domisili')
            .select('nama_mandor, kit_mandor, kasi, komoditi')
            .not('nama_mandor', 'is', null)
            .neq('nama_mandor', '-');

        if (latestUpload) {
            query = query.eq('upload_id', latestUpload.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Grouping and counting manually since Supabase doesn't have native GroupBy yet for REST
        const mandorMap = new Map<string, any>();
        
        data.forEach(item => {
            if (!item.nama_mandor) return;
            const key = item.nama_mandor.trim();
            if (!mandorMap.has(key)) {
                mandorMap.set(key, {
                    nama_mandor: key,
                    kit_mandor: item.kit_mandor || '-',
                    kasi: item.kasi || '-',
                    komoditi: item.komoditi || '-',
                    total_tk: 0
                });
            }
            mandorMap.get(key).total_tk += 1;
        });

        let result = Array.from(mandorMap.values());
        
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(m => m.nama_mandor.toLowerCase().includes(s) || m.kasi.toLowerCase().includes(s));
        }

        // Sort by total_tk descending
        result.sort((a, b) => b.total_tk - a.total_tk);

        return NextResponse.json({ data: result });
    } catch (error: any) {
        console.error('Error in mandor-summary API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
