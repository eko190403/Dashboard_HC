import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filterKomoditi = searchParams.get('komoditi') || 'Semua';

        // Ambil ID upload terakhir
        const { data: latestUpload, error: uploadError } = await supabase
            .from('upload_logs')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (uploadError && uploadError.code !== 'PGRST116') {
            throw uploadError;
        }

        let query = supabase
            .from('employee_domisili')
            .select('komoditi, bagian, nama_desa, kecamatan');

        if (latestUpload) {
            query = query.eq('upload_id', latestUpload.id);
        }

        if (filterKomoditi && filterKomoditi !== 'Semua') {
            query = query.eq('komoditi', filterKomoditi);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Hitung jumlah TK per bagian & desa
        const bagianDesaCounts: Record<string, Record<string, number>> = {};
        const desaTotalCounts: Record<string, number> = {};
        const komoditiSet = new Set<string>();

        data?.forEach((row) => {
            const bagian = row.bagian || 'Lainnya';
            const komoditi = row.komoditi || 'Lainnya';
            const kecamatan = (row.kecamatan || '').trim().toLowerCase();
            let desa = row.nama_desa || 'Tidak Diketahui';

            komoditiSet.add(komoditi);

            // Exclude nama desa yang hanya fallback kecamatan
            if (
                desa.toLowerCase() === kecamatan ||
                desa.startsWith('Format') ||
                desa.startsWith('Lokasi')
            ) {
                desa = 'Lainnya';
            }

            if (!bagianDesaCounts[bagian]) bagianDesaCounts[bagian] = {};
            bagianDesaCounts[bagian][desa] = (bagianDesaCounts[bagian][desa] || 0) + 1;
            desaTotalCounts[desa] = (desaTotalCounts[desa] || 0) + 1;
        });

        // Top 5 desa terbanyak (bukan Lainnya)
        const topDesa = Object.entries(desaTotalCounts)
            .filter(([desa]) => desa !== 'Lainnya')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(d => d[0]);

        // Format data untuk Recharts
        const result = Object.entries(bagianDesaCounts).map(([bagian, desaCounts]) => {
            const rowData: any = { bagian };
            topDesa.forEach(desa => rowData[desa] = 0);
            rowData['Lainnya'] = 0;

            Object.entries(desaCounts).forEach(([desa, count]) => {
                if (topDesa.includes(desa)) {
                    rowData[desa] = count;
                } else {
                    rowData['Lainnya'] += count;
                }
            });

            return rowData;
        });

        // Urutkan: Pine wilayah numerik dulu
        result.sort((a, b) => {
            const numA = parseInt(a.bagian.replace(/\D/g, '')) || 999;
            const numB = parseInt(b.bagian.replace(/\D/g, '')) || 999;
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.bagian.localeCompare(b.bagian);
        });

        // Daftar komoditi yang tersedia (untuk tab filter)
        const ORDER = ['Pine', 'Guava', 'Banana', 'QCPP', 'Planting', 'Agritech', 'Riset & R&D', 'Field & Support', 'Lainnya'];
        const allKomoditi = [...komoditiSet].sort((a, b) => {
            const ia = ORDER.indexOf(a);
            const ib = ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        return NextResponse.json({
            data: result,
            topDesa,
            allKomoditi,
            totalRows: data?.length ?? 0,
        });

    } catch (error: any) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
