import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Ambil data domisili terkini (misal: berdasarkan upload terakhir atau semua active karyawan)
        // Kita bisa mengambil id upload terakhir
        const { data: latestUpload, error: uploadError } = await supabase
            .from('upload_logs')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
            
        if (uploadError && uploadError.code !== 'PGRST116') {
            throw uploadError;
        }

        let query = supabase.from('employee_domisili').select('bagian, nama_desa, kecamatan');
        if (latestUpload) {
            query = query.eq('upload_id', latestUpload.id);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        // Target format:
        // [ { bagian: 'Guava Harvest', 'Abung Semuli': 36, 'Abung Timur': 6, 'Lainnya': 14 }, ... ]
        
        // 1. Hitung jumlah TK per bagian & desa
        const bagianDesaCounts: Record<string, Record<string, number>> = {};
        
        // Menyimpan semua nama desa unik untuk diproses nanti, misal mencari Top Desa
        const desaTotalCounts: Record<string, number> = {};

        data?.forEach((row) => {
            let bagian = row.bagian || 'Lainnya';
            let desa = row.nama_desa || 'Tidak Diketahui';
            const kecamatan = (row.kecamatan || '').trim().toLowerCase();
            
            // Jika nama_desa sama dengan kecamatan (fallback), masukkan ke Lainnya
            if (
                desa.toLowerCase() === kecamatan ||
                desa.startsWith('Format') ||
                desa.startsWith('Lokasi')
            ) {
                desa = 'Lainnya';
            }

            if (!bagianDesaCounts[bagian]) {
                bagianDesaCounts[bagian] = {};
            }
            
            bagianDesaCounts[bagian][desa] = (bagianDesaCounts[bagian][desa] || 0) + 1;
            desaTotalCounts[desa] = (desaTotalCounts[desa] || 0) + 1;
        });

        // Tentukan desa utama (Top 5 desa terbanyak) untuk dijadikan kolom sendiri, sisanya masuk 'Lainnya'
        const sortedDesa = Object.entries(desaTotalCounts)
            .filter(([desa, _]) => desa !== 'Lainnya')
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0]);
            
        // Kita ambil 5 desa teratas secara dinamis
        const topDesa = sortedDesa.slice(0, 5);

        // 2. Format menjadi array JSON untuk Recharts
        const result = Object.entries(bagianDesaCounts).map(([bagian, desaCounts]) => {
            const rowData: any = { bagian };
            
            // Inisialisasi default 0
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

        return NextResponse.json({
            data: result,
            topDesa: topDesa
        });

    } catch (error: any) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
