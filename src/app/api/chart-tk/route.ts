import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filterKomoditi = searchParams.get('komoditi') || 'Semua';
        const uploadIdParam = searchParams.get('upload_id');

        let uploadId = uploadIdParam;

        if (!uploadId) {
            const { data: latestUpload } = await supabase
                .from('upload_logs')
                .select('id')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            if (latestUpload) {
                uploadId = latestUpload.id;
            }
        }

        let query = supabase
            .from('employee_domisili')
            .select('komoditi, bagian, nama_desa, kecamatan');

        if (uploadId) {
            query = query.eq('upload_id', uploadId);
        }

        const allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        
        while (true) {
            const { data: pageData, error: pageError } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (pageError) throw pageError;
            if (pageData && pageData.length > 0) {
                allData.push(...pageData);
            }
            if (!pageData || pageData.length < pageSize) break;
            page++;
        }

        // Data komoditi sudah clean dari proses upload, tidak perlu remapping
        const mappedData = allData.map(row => ({
            ...row,
            komoditi: row.komoditi || 'Lainnya'
        }));

        // Hitung total per komoditi (untuk Pie Chart)
        const komoditiCounts: Record<string, number> = {};
        mappedData.forEach((row) => {
            const kom = row.komoditi;
            komoditiCounts[kom] = (komoditiCounts[kom] || 0) + 1;
        });

        // Data filter untuk Bar Chart
        const filteredData = filterKomoditi && filterKomoditi !== 'Semua' 
            ? mappedData.filter(row => row.komoditi === filterKomoditi)
            : mappedData;

        // Hitung jumlah TK per bagian & desa
        const bagianDesaCounts: Record<string, Record<string, number>> = {};
        const desaTotalCounts: Record<string, number> = {};
        const komoditiSet = new Set<string>(Object.keys(komoditiCounts));

        filteredData.forEach((row) => {
            const bagian = row.bagian || 'Belum Terisi';
            const komoditi = row.komoditi;
            const desa = row.nama_desa || 'Tidak Diketahui';

            komoditiSet.add(komoditi);

            if (!bagianDesaCounts[bagian]) bagianDesaCounts[bagian] = {};
            bagianDesaCounts[bagian][desa] = (bagianDesaCounts[bagian][desa] || 0) + 1;
            desaTotalCounts[desa] = (desaTotalCounts[desa] || 0) + 1;
        });

        const topDesa = Object.entries(desaTotalCounts)
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0]);

        const result = Object.entries(bagianDesaCounts).map(([bagian, desaCounts]) => {
            const total = Object.values(desaCounts).reduce((sum, count) => sum + count, 0);
            const rowData: Record<string, unknown> = { bagian, total };

            Object.entries(desaCounts).forEach(([desa, count]) => {
                rowData[desa] = count;
            });

            return rowData;
        });

        const sortedResult = result
            .filter(row => Number(row.total) > 0)
            .sort((a, b) => {
                const bagianA = String(a.bagian);
                const bagianB = String(b.bagian);
                const numA = parseInt(bagianA.replace(/\D/g, '')) || 999;
                const numB = parseInt(bagianB.replace(/\D/g, '')) || 999;
                if (!isNaN(numA) && !isNaN(numB) && numA !== 999 && numB !== 999) return numA - numB;
                return bagianA.localeCompare(bagianB);
            });

        const allKomoditi = [...komoditiSet].sort((a, b) => a.localeCompare(b));

        const komoditiSummary = allKomoditi.map(name => ({
            name,
            value: komoditiCounts[name] || 0
        }));

        return NextResponse.json({
            data: sortedResult,
            topDesa,
            komoditiSummary,
            totalRows: mappedData.length,
        });

    } catch (error: any) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
